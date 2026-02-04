let allChemicals = [];
let allEquipment = [];

// ================= LAB STATE =================
let labState = {
    flaskContent: [],
    burnerOn: false,
    temperature: 100,
    isReacting: false,
    timer: null,
    currentTime: 0,
    benchScale: 1,
    chemicalAmount: 10,
    simSpeed: 1,
    paused: false,
    timerRemaining: 0,
    activeReaction: null
};

// Containers placed on the bench (vessels like test_tube, beaker)
labState.containers = {}; // containerId -> { content: [], isReacting: false, pendingReaction: null }
let containerCounter = 0;

// ================= DOM ELEMENTS =================
const mainFlask = document.getElementById('mainFlask');
// Group inside SVG that will contain layered liquid rects
const flaskLiquid = document.getElementById('flaskLiquid');
// Fallback: legacy single-rect element (may not exist after SVG changes)
const flaskContent = document.getElementById('flaskContent');
const heatSlider = document.getElementById('heatSlider');
const heatValue = document.getElementById('heatValue');
const toggleBurner = document.getElementById('toggleBurner');
const startReaction = document.getElementById('startReaction');
const addStirrer = document.getElementById('addStirrer');
const resetLab = document.getElementById('resetLab');
const timerInput = document.getElementById('timerInput');
const startTimer = document.getElementById('startTimer');
const timerDisplay = document.getElementById('timerDisplay');
const observations = document.getElementById('observations');
const observationsPanel = document.getElementById('observationsPanel');
const currentMixture = document.getElementById('currentMixture');
const currentMixturePanel = document.getElementById('currentMixturePanel');
const reactionStatus = document.getElementById('reactionStatus');
const statusText = document.getElementById('statusText');
const chemicalStockContainer = document.getElementById('chemicalStock');
const labBench = document.querySelector('.lab-bench');
const reactionTargetSelect = document.getElementById('reactionTarget');
const statusStartReaction = document.getElementById('statusStartReaction');
const observationsWindowContent = document.getElementById('observationsWindowContent');
const warningsWindowContent = document.getElementById('warningsWindowContent');
const observationsWindow = document.getElementById('observationsWindow');
const warningsWindow = document.getElementById('warningsWindow');
const chemicalAmountInput = document.getElementById('chemicalAmount');
const chemicalAmountValue = document.getElementById('chemicalAmountValue');
const benchZoomInput = document.getElementById('benchZoom');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const hazardIndicator = document.getElementById('hazardIndicator');
const hazardDot = document.getElementById('hazardDot');
const hazardText = document.getElementById('hazardText');
const simSpeedInput = document.getElementById('simSpeed');
const pauseBtn = document.getElementById('pauseSimulation');
const resumeBtn = document.getElementById('resumeSimulation');

const transferableVessels = new Set(['beaker', 'test_tube']);

const historyStack = [];
const redoStack = [];
let isRestoringState = false;
const HISTORY_LIMIT = 30;

if (mainFlask) {
    mainFlask.dataset.type = 'flask';
    makeMovable(mainFlask);
    attachPourHandle(mainFlask, 'flask', 'flask');
}

// Helper to find placed burner apparatus on the bench
function getPlacedBurner() {
    return document.querySelector('.movable-apparatus[data-type="burner"]');
}

function snapToGrid(value, gridSize = 20) {
    return Math.round(value / gridSize) * gridSize;
}

function getChemicalState(chem) {
    const id = (chem.id || '').toLowerCase();
    const formula = (chem.formula || '').toLowerCase();
    if (id.includes('_aq') || formula.includes('(aq)')) return 'aq';
    if (formula.includes('(g)')) return 'gas';
    if (formula.includes('(s)')) return 'solid';
    return 'liq';
}

function getHazardColor(type) {
    switch ((type || '').toLowerCase()) {
        case 'acid': return '#ff6b6b';
        case 'base': return '#ffd93d';
        case 'salt': return '#6ecbff';
        case 'indicator': return '#a98bff';
        case 'oxidizer': return '#ff8f3d';
        case 'reagent': return '#7fdc8c';
        case 'gas': return '#9ad0ff';
        case 'solvent': return '#9ed9c2';
        default: return '#c7b8ff';
    }
}

function getActiveTargetContent() {
    const target = reactionTargetSelect ? reactionTargetSelect.value : null;
    if (target && target !== 'flask' && labState.containers[target]) {
        return labState.containers[target].content || [];
    }
    if (labState.selectedContainerId && labState.containers[labState.selectedContainerId]) {
        return labState.containers[labState.selectedContainerId].content || [];
    }
    return labState.flaskContent || [];
}

function updateHazardIndicator() {
    if (!hazardIndicator || !hazardDot || !hazardText) return;
    const content = getActiveTargetContent();
    if (!content.length) {
        hazardText.textContent = 'None';
        hazardDot.style.background = '#9aa3b2';
        hazardDot.style.boxShadow = '0 0 8px rgba(154, 163, 178, 0.6)';
        return;
    }

    const types = Array.from(new Set(content.map(c => (c.type || '').toLowerCase()).filter(Boolean)));
    let label = 'Unknown';
    let color = '#c7b8ff';

    if (types.length === 1) {
        const t = types[0];
        label = t.charAt(0).toUpperCase() + t.slice(1);
        color = getHazardColor(t);
    } else if (types.length > 1) {
        label = 'Mixed';
        color = '#ffb347';
    }

    hazardText.textContent = label;
    hazardDot.style.background = color;
    hazardDot.style.boxShadow = `0 0 8px ${color}aa`;
}

function formatReactionEquation(reactants, product) {
    const left = (reactants || [])
        .map(c => (c.formula || c.name || '').toString().trim())
        .filter(Boolean)
        .join(' + ');
    const right = (product || '').toString().trim();
    if (!left || !right) return '';
    return `${left} → ${right}`;
}

function getRequirementHint(rule) {
    if (!rule) return '';
    const parts = [];
    if (rule.requires && rule.requires.includes('stirrer')) {
        parts.push('stirrer required');
    }
    if (rule.min_temp != null && rule.min_temp !== '') {
        parts.push(`min ${rule.min_temp}°C`);
    }
    if (rule.max_temp != null && rule.max_temp !== '') {
        parts.push(`max ${rule.max_temp}°C`);
    }
    if (rule.duration_seconds) {
        parts.push(`~${rule.duration_seconds}s`);
    }
    return parts.length ? ` (Requirements: ${parts.join(', ')})` : '';
}

function triggerPouringVisual(targetEl, liquidEl) {
    if (targetEl) {
        targetEl.classList.add('pouring');
    }
    if (liquidEl) {
        liquidEl.classList.add('liquid-rise');
    }
    setTimeout(() => {
        if (targetEl) {
            targetEl.classList.remove('pouring');
        }
        if (liquidEl) {
            liquidEl.classList.remove('liquid-rise');
        }
    }, 900);
}

function getReactionDurationMs(customMs = null) {
    const speed = Math.max(0.5, labState.simSpeed || 1);
    const base = customMs != null ? Number(customMs) : 3000;
    const scaled = Math.max(800, Math.round(base / speed));
    return scaled;
}

function scheduleReactionCompletion(targetType, targetId, durationMs = null) {
    const duration = getReactionDurationMs(durationMs);
    const endTime = Date.now() + duration;
    if (labState.activeReaction && labState.activeReaction.timeoutId) {
        clearTimeout(labState.activeReaction.timeoutId);
    }
    labState.activeReaction = {
        targetType,
        targetId,
        endTime,
        remainingMs: duration,
        timeoutId: setTimeout(() => {
            labState.activeReaction = null;
            if (targetType === 'container') {
                completeReactionFor(targetId);
            } else {
                completeReaction(labState.pendingReaction?.type || 'other', labState.flaskContent.map(c => (c.formula || c.name).toUpperCase()).join(' + '));
            }
        }, duration)
    };
}

function pauseActiveReaction() {
    const active = labState.activeReaction;
    if (!active || !active.timeoutId) return;
    clearTimeout(active.timeoutId);
    active.timeoutId = null;
    active.remainingMs = Math.max(0, active.endTime - Date.now());
}

function resumeActiveReaction() {
    const active = labState.activeReaction;
    if (!active || active.timeoutId || active.remainingMs <= 0) return;
    active.endTime = Date.now() + active.remainingMs;
    active.timeoutId = setTimeout(() => {
        labState.activeReaction = null;
        if (active.targetType === 'container') {
            completeReactionFor(active.targetId);
        } else {
            completeReaction(labState.pendingReaction?.type || 'other', labState.flaskContent.map(c => (c.formula || c.name).toUpperCase()).join(' + '));
        }
    }, active.remainingMs);
}

function setPaused(paused) {
    labState.paused = paused;
    if (paused) {
        pauseActiveReaction();
        if (labState.timer) {
            clearInterval(labState.timer);
            labState.timer = null;
        }
        addObservation('Simulation paused', 'info');
    } else {
        resumeActiveReaction();
        if (labState.timerRemaining > 0) {
            startLabTimer(labState.timerRemaining / 60, true);
        }
        addObservation('Simulation resumed', 'info');
    }
}

function serializeLab() {
    const apparatus = Array.from(document.querySelectorAll('.movable-apparatus')).map(el => {
        const id = el.dataset.containerId;
        const container = id ? labState.containers[id] : null;
        return {
            type: el.dataset.type,
            left: el.style.left,
            top: el.style.top,
            content: container ? container.content : null
        };
    });

    const containerList = Object.values(labState.containers);
    const selectedIndex = containerList.findIndex(c => c.id === labState.selectedContainerId);

    return {
        version: 1,
        flaskContent: labState.flaskContent,
        burnerOn: labState.burnerOn,
        temperature: labState.temperature,
        benchScale: labState.benchScale,
        chemicalAmount: labState.chemicalAmount,
        simSpeed: labState.simSpeed,
        stirrer: labState.stirrer,
        condenser: labState.condenser,
        stand: labState.stand,
        apparatus,
        selectedIndex
    };
}

function restoreLab(state) {
    if (!state) return;
    isRestoringState = true;

    labState.flaskContent = Array.isArray(state.flaskContent) ? state.flaskContent : [];
    labState.burnerOn = !!state.burnerOn;
    labState.temperature = Number(state.temperature) || 100;
    labState.benchScale = Number(state.benchScale) || 1;
    labState.chemicalAmount = Number(state.chemicalAmount) || 10;
    labState.simSpeed = Number(state.simSpeed) || 1;
    labState.stirrer = !!state.stirrer;
    labState.condenser = !!state.condenser;
    labState.stand = !!state.stand;

    document.querySelectorAll('.movable-apparatus').forEach(el => el.remove());
    labState.containers = {};
    containerCounter = 0;

    if (Array.isArray(state.apparatus)) {
        state.apparatus.forEach(item => {
            if (!item || !item.type) return;
            placeApparatus(item.type, 0, 0, { silent: true });
            const el = document.querySelector(`.movable-apparatus[data-type="${item.type}"]:last-of-type`);
            if (el) {
                if (item.left) el.style.left = item.left;
                if (item.top) el.style.top = item.top;
                const id = el.dataset.containerId;
                if (id && item.content && labState.containers[id]) {
                    labState.containers[id].content = item.content;
                    updateContainerDisplay(id);
                }
            }
        });
    }

    updateFlaskDisplay();
    updateMixtureInfo();
    setBenchScale(labState.benchScale);

    if (heatSlider) heatSlider.value = labState.temperature;
    if (heatValue) heatValue.textContent = `${labState.temperature}°C`;
    if (chemicalAmountValue) chemicalAmountValue.textContent = `${labState.chemicalAmount} mL`;
    if (chemicalAmountInput) chemicalAmountInput.value = labState.chemicalAmount;
    if (simSpeedInput) simSpeedInput.value = labState.simSpeed.toString();

    toggleBurner.innerHTML = labState.burnerOn ? '<i class="fas fa-fire"></i> Turn Off Burner' : '<i class="fas fa-fire"></i> Turn On Burner';
    toggleBurner.classList.toggle('danger', labState.burnerOn);
    updateBurnerFlame();

    const containerList = Object.values(labState.containers);
    if (state.selectedIndex >= 0 && containerList[state.selectedIndex]) {
        setReactionTarget(containerList[state.selectedIndex].id);
    } else {
        setReactionTarget(null);
    }

    updateHazardIndicator();
    isRestoringState = false;
}

function pushHistory() {
    if (isRestoringState) return;
    historyStack.push(serializeLab());
    if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
    redoStack.length = 0;
}

function undo() {
    if (historyStack.length === 0) return;
    const current = serializeLab();
    const prev = historyStack.pop();
    redoStack.push(current);
    restoreLab(prev);
    addObservation('Undo applied', 'info');
}

function redo() {
    if (redoStack.length === 0) return;
    const current = serializeLab();
    const next = redoStack.pop();
    historyStack.push(current);
    restoreLab(next);
    addObservation('Redo applied', 'info');
}

function saveLab() {
    const payload = serializeLab();
    localStorage.setItem('labSave', JSON.stringify(payload));
    addObservation('Experiment saved', 'success');
}

function loadLab() {
    const raw = localStorage.getItem('labSave');
    if (!raw) {
        addObservation('No saved experiment found', 'warning');
        return;
    }
    try {
        const data = JSON.parse(raw);
        restoreLab(data);
        addObservation('Experiment loaded', 'success');
    } catch (e) {
        addObservation('Failed to load saved experiment', 'danger');
    }
}

function attachPourHandle(targetEl, sourceType, sourceId) {
    if (!targetEl) return;
    const existing = targetEl.querySelector('.pour-handle');
    if (existing) return;

    const handle = document.createElement('div');
    handle.className = 'pour-handle';
    handle.title = 'Pour contents';
    handle.setAttribute('draggable', 'true');
    handle.innerHTML = '<i class="fas fa-tint"></i>';

    handle.addEventListener('pointerdown', e => e.stopPropagation());
    handle.addEventListener('dragstart', e => {
        e.dataTransfer.setData('type', 'transfer');
        e.dataTransfer.setData('sourceType', sourceType);
        e.dataTransfer.setData('sourceId', sourceId);
        targetEl.classList.add('pouring');
    });
    handle.addEventListener('dragend', () => {
        targetEl.classList.remove('pouring');
    });

    targetEl.appendChild(handle);
}

function getContainerById(id) {
    return id && labState.containers ? labState.containers[id] : null;
}

function canTransferToTarget(targetContent, incomingCount) {
    return (targetContent.length + incomingCount) <= 3;
}

function transferContents(sourceType, sourceId, targetType, targetId) {
    if (sourceType === targetType && sourceId === targetId) return;
    if (labState.paused) {
        addObservation('Simulation is paused. Resume to pour.', 'warning');
        return;
    }

    const sourceContainer = sourceType === 'container' ? getContainerById(sourceId) : null;
    const targetContainer = targetType === 'container' ? getContainerById(targetId) : null;

    if (sourceType === 'container' && (!sourceContainer || !transferableVessels.has(sourceContainer.name))) {
        addObservation('Transfer supported only from beaker/test tube right now.', 'warning');
        return;
    }
    if (targetType === 'container' && (!targetContainer || !transferableVessels.has(targetContainer.name))) {
        addObservation('Transfer supported only to beaker/test tube right now.', 'warning');
        return;
    }

    if (sourceType === 'container' && sourceContainer.isReacting) {
        addObservation('Cannot pour while the source container is reacting.', 'warning');
        return;
    }
    if (targetType === 'container' && targetContainer.isReacting) {
        addObservation('Cannot pour into a container that is reacting.', 'warning');
        return;
    }
    if (sourceType === 'flask' && labState.isReacting) {
        addObservation('Cannot pour while the main flask is reacting.', 'warning');
        return;
    }

    const sourceContent = sourceType === 'flask' ? labState.flaskContent : (sourceContainer ? sourceContainer.content : []);
    const targetContent = targetType === 'flask' ? labState.flaskContent : (targetContainer ? targetContainer.content : []);

    if (!sourceContent || sourceContent.length === 0) {
        addObservation('Nothing to pour from the source.', 'warning');
        return;
    }

    if (!canTransferToTarget(targetContent, sourceContent.length)) {
        addObservation('Transfer blocked: target can hold only three chemicals.', 'warning');
        return;
    }

    pushHistory();
    const moved = sourceContent.map(c => ({ ...c }));

    if (targetType === 'flask') {
        labState.flaskContent = targetContent.concat(moved);
        updateFlaskDisplay();
        updateMixtureInfo();
        checkForReactions();
        triggerPouringVisual(mainFlask, flaskLiquid || flaskContent);
    } else if (targetContainer) {
        targetContainer.content = targetContent.concat(moved);
        updateContainerDisplay(targetContainer.id);
        checkForReactionsFor(targetContainer.id);
        triggerPouringVisual(targetContainer.element, targetContainer.liquidGroup);
    }

    if (sourceType === 'flask') {
        labState.flaskContent = [];
        updateFlaskDisplay();
        updateMixtureInfo();
    } else if (sourceContainer) {
        sourceContainer.content = [];
        updateContainerDisplay(sourceContainer.id);
    }

    updateHazardIndicator();
    addObservation('Contents transferred successfully.', 'info');
}

function setBenchScale(scale) {
    labState.benchScale = Math.min(1.4, Math.max(0.7, scale));
    if (labBench) {
        labBench.style.setProperty('--bench-scale', labState.benchScale);
        labBench.style.setProperty('--bench-expand', (1 / labState.benchScale).toFixed(2));
    }
    if (benchZoomInput) {
        benchZoomInput.value = labState.benchScale.toFixed(1);
    }
}

function setFlaskState(state) {
    if (!mainFlask) return;
    mainFlask.classList.remove('state-empty', 'state-filled', 'state-heating', 'state-reacting');
    if (state) mainFlask.classList.add(state);
}

function setContainerState(containerId, state) {
    const container = labState.containers[containerId];
    if (!container || !container.element) return;
    container.element.classList.remove('state-empty', 'state-filled', 'state-heating', 'state-reacting');
    if (state) container.element.classList.add(state);
}

// ================= CHEMICAL DRAGGING =================
function enableChemicalDragging() {
    document.querySelectorAll('.chemical-item').forEach(item => {
        item.draggable = true;

        item.addEventListener('dragstart', e => {
            document.body.classList.add('dragging');
            const type = item.getAttribute('data-chemical') ? 'chemical' : 'equipment';
            const name = item.getAttribute('data-chemical') || item.getAttribute('data-equipment');
            const color = item.getAttribute('data-color') || '#8a2be2';
            const formula = item.getAttribute('data-formula') || '';
            const chemType = item.getAttribute('data-type') || '';

            e.dataTransfer.setData('type', type);
            e.dataTransfer.setData('name', name);
            e.dataTransfer.setData('color', color);
            e.dataTransfer.setData('formula', formula);
            e.dataTransfer.setData('chemType', chemType);
        });

        item.addEventListener('dragend', () => {
            document.body.classList.remove('dragging');
        });
    });
}

// ================= EQUIPMENT LOADING =================
async function loadEquipmentStock() {
    try {
           const response = await fetch(window.apiUrl('/data/equipment.json'));
        const data = await response.json();
        allEquipment = data.equipment || [];

        const container = document.getElementById('apparatusStock');
        if (!container) return;
        container.innerHTML = '';

        renderEquipment(allEquipment);
        enableChemicalDragging(); // reuse existing drag setup
    } catch (err) {
        console.error('Failed to load equipment.json', err);
        addObservation('⚠ Failed to load equipment stock', 'danger');
    }
}

// ================= REACTIONS LOADING =================
async function loadReactions() {
    try {
           const res = await fetch(window.apiUrl('/data/reactions.json'));
        const data = await res.json();
        labState.reactions = {};

        // Normalize keys: split on '+', uppercase, sort => store map for fast lookup
        Object.keys(data).forEach(rawKey => {
            const parts = rawKey.split('+').map(p => p.trim().toUpperCase());
            const norm = parts.sort().join('+');
            const val = data[rawKey];
            labState.reactions[norm] = {
                product: val.product || null,
                color: val.color || null,
                type: val.type || null,
                raw: val
            };
        });

        // Also load reactants and generate placeholder entries for any missing pair
        try {
                    const rres = await fetch(window.apiUrl('/data/reactants.json'));
            const rdata = await rres.json();
            const chems = rdata.chemicals || [];

            function ident(c) {
                const v = (c.formula && c.formula.toString().trim()) || (c.id && c.id.toString().trim()) || (c.name && c.name.toString().trim()) || '';
                return v.toUpperCase();
            }

            for (let i = 0; i < chems.length; i++) {
                for (let j = i + 1; j < chems.length; j++) {
                    const a = ident(chems[i]);
                    const b = ident(chems[j]);
                    if (!a || !b) continue;
                    const norm = [a, b].sort().join('+');
                    if (!labState.reactions[norm]) {
                        const placeholder = {
                            product: null,
                            color: null,
                            type: 'unknown',
                            heat: null,
                            observations: ['No reaction rule defined for this combination.'],
                            requires: []
                        };
                        labState.reactions[norm] = { product: null, color: null, type: 'unknown', raw: placeholder };
                    }
                }
            }
        } catch (e) {
            // reactants.json missing or failed — still ok
            console.warn('Could not load reactants to generate placeholders', e);
        }

        addObservation('Reaction rules loaded (placeholders generated for missing pairs)', 'info');
    } catch (err) {
        console.error('Failed to load reactions.json', err);
        addObservation('⚠ Failed to load reaction rules', 'danger');
        labState.reactions = {};
    }
}

function renderEquipment(equipmentList) {
    const container = document.getElementById('apparatusStock');
    if (!container) return;
    container.innerHTML = '';
    equipmentList.forEach(eq => {
        const div = document.createElement('div');
        div.className = 'chemical-item'; // reuse class to enable dragging behavior
        div.setAttribute('data-equipment', eq.id);
        if (eq.icon) div.setAttribute('data-icon', eq.icon);
        if (eq.type) div.setAttribute('data-type', eq.type);

        // Build inner HTML with optional icon
        let inner = '';
        if (eq.icon) {
            inner += `<img src="${eq.icon}" alt="${eq.name}" class="equip-icon"/> `;
        }
        inner += `${eq.name}`;
        if (eq.info) inner += ` <span class="amount">${eq.info}</span>`;

        div.innerHTML = inner;
        container.appendChild(div);
    });
}

// Use SVG files in the images folder for apparatus icons
const equipmentSVGs = {
    pipette: `<img src="images/pipette.svg" alt="pipette">`,
    dropper: `<img src="images/dropper.svg" alt="dropper">`,
    stirrer: `<img src="images/stirrer.svg" alt="stirrer">`,
    testtube: `<img src="images/testtube.svg" alt="testtube">`,
    burner: `<img class="bench-burner-img" src="images/burner-off.svg" alt="burner">`
};

// Place apparatus inside the lab bench at given coordinates (relative to bench)
function placeApparatus(name, x, y, options = {}) {
    const el = document.createElement('div');
    el.className = 'movable-apparatus';
    el.dataset.type = name;
    // Prefer the icon path from loaded equipment data when available
    const eqMeta = allEquipment.find(e => e.id === name);
    const isVessel = (eqMeta && eqMeta.type === 'vessel') || vesselNames.has(name);
    if (!isVessel) {
        if (eqMeta && eqMeta.icon) {
            // ensure burner images get the special class so updateBurnerFlame can find them
            const extraClass = (eqMeta.id === 'burner' || name === 'burner') ? ' bench-burner-img' : '';
            el.innerHTML = `<img src="${eqMeta.icon}" alt="${eqMeta.name}" class="equip-icon${extraClass}"/>`;
        } else {
            el.innerHTML = equipmentSVGs[name] || `<div style="width:40px;height:40px;background:#666;border-radius:6px;"></div>`;
        }
    }

    // Position with center alignment (half of 120px size)
    const half = 60;
    const snappedX = snapToGrid(x - half);
    const snappedY = snapToGrid(y - half);
    el.style.left = `${snappedX}px`;
    el.style.top = `${snappedY}px`;

    labBench.appendChild(el);
    makeMovable(el);
    if (!options.silent) {
        addObservation(`Placed ${name} on bench`, 'info');
    }
    console.log('[placeApparatus] placed element', { name, id: el.dataset && el.dataset.containerId, hasEqMeta: !!eqMeta, eqMeta });

    // If this equipment is a vessel, attach container support (mini-flask, drop area)
    try {
        if (isVessel) {
            console.log('[placeApparatus] attaching container support for', name, 'eqMeta.type=', eqMeta && eqMeta.type);
            _attachContainerSupport(el, name);
        } else {
            console.log('[placeApparatus] not a vessel:', name);
        }
    } catch (e) { console.error('[placeApparatus] container attach failed', e); }

    // If apparatus is burner, align the actual burner under flask instead
    if (name === 'burner') {
        positionBurnerUnderFlask();
    }

    // If a stirrer is placed, mark it in state so reactions requiring stirring may proceed
    if (name === 'stirrer') {
        labState.stirrer = true;
        if (!options.silent) addObservation('Stirrer is ready on the bench', 'info');
    }
}

// Helper: list of equipment IDs that should act as vessels accepting chemicals
const vesselNames = new Set(['beaker', 'graduated_cylinder', 'volumetric_flask', 'test_tube', 'watch_glass', 'crucible', 'burette']);

// Add container support when placing vessels
function _attachContainerSupport(el, name) {
    // create unique container id and state
    const id = `container-${++containerCounter}`;
    el.dataset.containerId = id;
    labState.containers[id] = { content: [], isReacting: false, pendingReaction: null, element: el, id, name };

    if (transferableVessels.has(name)) {
        attachPourHandle(el, 'container', id);
    }

    // create SVG-based mini-vessel with clipPath to follow the shape
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 120');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.className = 'mini-flask';
    svg.style.width = '90px';
    svg.style.height = '105px';
    svg.style.position = 'absolute';
    svg.style.bottom = '10px';
    svg.style.left = '50%';
    svg.style.transform = 'translateX(-50%)';
    svg.style.overflow = 'visible';

    const defs = document.createElementNS(svgNS, 'defs');
    const clipPath = document.createElementNS(svgNS, 'clipPath');
    const clipId = `clip-${id}`;
    clipPath.setAttribute('id', clipId);
    clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');

    // Build vessel outline + matching clip shape
    let outline = null;
    let clipShape = null;

    switch (name) {
        case 'beaker': {
            outline = document.createElementNS(svgNS, 'path');
            outline.setAttribute('d', 'M 20 12 L 80 12 L 85 110 Q 85 118 75 118 L 25 118 Q 15 118 15 110 Z');
            clipShape = outline.cloneNode();
            break;
        }
        case 'graduated_cylinder': {
            outline = document.createElementNS(svgNS, 'rect');
            outline.setAttribute('x', '26');
            outline.setAttribute('y', '10');
            outline.setAttribute('width', '48');
            outline.setAttribute('height', '105');
            outline.setAttribute('rx', '2');
            clipShape = outline.cloneNode();
            break;
        }
        case 'test_tube': {
            outline = document.createElementNS(svgNS, 'path');
            outline.setAttribute('d', 'M 30 8 L 70 8 L 70 100 Q 70 118 50 118 Q 30 118 30 100 Z');
            clipShape = outline.cloneNode();
            break;
        }
        case 'volumetric_flask': {
            outline = document.createElementNS(svgNS, 'path');
            outline.setAttribute('d', 'M 40 8 L 60 8 L 60 36 Q 60 105 50 112 Q 40 105 40 36 Z');
            clipShape = outline.cloneNode();
            break;
        }
        case 'crucible': {
            outline = document.createElementNS(svgNS, 'path');
            outline.setAttribute('d', 'M 15 20 Q 15 35 18 70 Q 18 110 50 115 Q 82 110 82 70 Q 82 35 85 20 Z');
            clipShape = outline.cloneNode();
            break;
        }
        case 'watch_glass': {
            outline = document.createElementNS(svgNS, 'ellipse');
            outline.setAttribute('cx', '50');
            outline.setAttribute('cy', '62');
            outline.setAttribute('rx', '40');
            outline.setAttribute('ry', '20');
            clipShape = outline.cloneNode();
            break;
        }
        case 'burette': {
            outline = document.createElementNS(svgNS, 'rect');
            outline.setAttribute('x', '43');
            outline.setAttribute('y', '16');
            outline.setAttribute('width', '14');
            outline.setAttribute('height', '96');
            outline.setAttribute('rx', '2');
            clipShape = outline.cloneNode();
            break;
        }
        default: {
            outline = document.createElementNS(svgNS, 'rect');
            outline.setAttribute('x', '20');
            outline.setAttribute('y', '15');
            outline.setAttribute('width', '60');
            outline.setAttribute('height', '95');
            outline.setAttribute('rx', '3');
            clipShape = outline.cloneNode();
        }
    }

    if (outline) {
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', '#9fb8c8');
        outline.setAttribute('stroke-width', '1.5');
        svg.appendChild(outline);
    }

    clipPath.appendChild(clipShape);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    const liquidGroup = document.createElementNS(svgNS, 'g');
    liquidGroup.setAttribute('clip-path', `url(#${clipId})`);
    svg.appendChild(liquidGroup);
    el.appendChild(svg);

    labState.containers[id].liquidGroup = liquidGroup;
    labState.containers[id].clipShape = clipShape;
    labState.containers[id].clipPathEl = clipPath;
    labState.containers[id].svgEl = svg;

    // compute clip box based on shape bbox
    try {
        const bbox = clipShape.getBBox();
        labState.containers[id].clipBox = { x: bbox.x + 1, y: bbox.y + 1, width: Math.max(0, bbox.width - 2), height: Math.max(0, bbox.height - 2) };
    } catch (e) {
        labState.containers[id].clipBox = { x: 20, y: 20, width: 60, height: 90 };
    }

    // Click to select this container for global Start Reaction button
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        setReactionTarget(id);
    });

    // drag/drop handlers on SVG
    svg.addEventListener('dragover', e => e.preventDefault());
    svg.addEventListener('drop', e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const name = e.dataTransfer.getData('name');
        const color = e.dataTransfer.getData('color');
        const formula = e.dataTransfer.getData('formula');
        const chemType = e.dataTransfer.getData('chemType');
        if (type === 'chemical') {
            addChemicalToContainer(id, name, color, formula, chemType);
        } else if (type === 'transfer') {
            const sourceType = e.dataTransfer.getData('sourceType');
            const sourceId = e.dataTransfer.getData('sourceId');
            transferContents(sourceType, sourceId, 'container', id);
        } else if (type === 'equipment') {
            useEquipment(name);
        }
    });

    refreshReactionTargets();
}

function refreshReactionTargets() {
    if (!reactionTargetSelect) return;
    const prev = reactionTargetSelect.value || 'flask';
    reactionTargetSelect.innerHTML = '';

    const flaskOpt = document.createElement('option');
    flaskOpt.value = 'flask';
    flaskOpt.textContent = 'Main Flask';
    reactionTargetSelect.appendChild(flaskOpt);

    Object.values(labState.containers).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name || 'Vessel'} (${c.id})`;
        reactionTargetSelect.appendChild(opt);
    });

    reactionTargetSelect.value = prev in (reactionTargetSelect.options ? {} : {}) ? prev : (labState.selectedContainerId || 'flask');
}

function setReactionTarget(containerId) {
    const prev = labState.selectedContainerId;
    if (prev && labState.containers[prev]) {
        labState.containers[prev].element.classList.remove('selected');
    }

    if (!containerId || containerId === 'flask') {
        labState.selectedContainerId = null;
        if (reactionTargetSelect) reactionTargetSelect.value = 'flask';
        addObservation('Selected main flask for reactions', 'info');
        updateHazardIndicator();
        return;
    }

    if (labState.containers[containerId]) {
        labState.selectedContainerId = containerId;
        labState.containers[containerId].element.classList.add('selected');
        if (reactionTargetSelect) reactionTargetSelect.value = containerId;
        addObservation(`Selected ${labState.containers[containerId].name} (${containerId}) for reactions`, 'info');
        updateHazardIndicator();
    }
}

function addChemicalToContainer(containerId, name, color, formula, chemType = '') {
    const container = labState.containers[containerId];
    if (!container) return;
    if (labState.paused) {
        addObservation('Simulation is paused. Resume to add chemicals.', 'warning');
        return;
    }
    if (container.isReacting) {
        addObservation('Cannot add chemicals while reaction is in progress in that container!', 'danger');
        return;
    }
    if (container.content.length >= 3) {
        addObservation('This container supports reactions between up to THREE chemicals. Remove one before adding another.', 'warning');
        return;
    }
    pushHistory();
    container.content.push({ name, color, formula, type: chemType, amount: labState.chemicalAmount });
    updateContainerDisplay(containerId);
    triggerPouringVisual(container.element, container.liquidGroup);
    addObservation(`Added ${name} to ${containerId}`, 'info');
    checkForReactionsFor(containerId);
    updateHazardIndicator();
}

function updateContainerDisplay(containerId) {
    const container = labState.containers[containerId];
    if (!container) return;

    const n = container.content.length;
    const liquidGroup = container.liquidGroup;
    const clipBox = container.clipBox;
    if (!liquidGroup || !clipBox) return;

    while (liquidGroup.firstChild) liquidGroup.removeChild(liquidGroup.firstChild);
    if (n === 0) {
        setContainerState(containerId, 'state-empty');
        return;
    }

    setContainerState(containerId, 'state-filled');

    // Use same physics as main flask: layered rects from bottom
    const totalAmount = container.content.reduce((sum, chem) => sum + (chem.amount || 10), 0);
    const heightPct = Math.min(totalAmount, 80);
    let baseY = clipBox.y + clipBox.height;
    let maxFillPx = clipBox.height;
    let x = clipBox.x;
    let width = clipBox.width;

    const totalFillPx = Math.round((heightPct / 100) * maxFillPx);
    let cumulative = 0;
    for (let i = 0; i < n; i++) {
        const chem = container.content[i];
        const ratio = (chem.amount || 10) / totalAmount;
        const h = Math.max(1, Math.round(totalFillPx * ratio));
        cumulative += h;
        const y = baseY - cumulative;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', width);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', chem.color || '#8a2be2');
        rect.setAttribute('opacity', '0.95');
        liquidGroup.appendChild(rect);
    }
}

function checkForReactionsFor(containerId) {
    const container = labState.containers[containerId];
    if (!container) return;
    if (container.content.length < 2) {
        container.pendingReaction = null;
        return;
    }
    const formulas = container.content.map(c => (c.formula || c.name).toString().trim().toUpperCase());
    const key = formulas.sort().join('+');
    if (labState.reactions && labState.reactions[key]) {
        const rule = labState.reactions[key];
        const rtype = (rule.raw && rule.raw.type ? rule.raw.type : '').toString().toLowerCase();
        const hasProduct = !!(rule.product || (rule.raw && rule.raw.product));
        if (rtype === 'no reaction' || rtype === 'unknown' || (!hasProduct && !rtype)) {
            container.pendingReaction = null;
            addObservation('No reaction rule defined for this combination.', 'info');
            return;
        }
        container.pendingReaction = rule;
        addObservation(`Possible reaction in container ${containerId}: ${formulas.join(' + ')} → ${rule.product || ''}${getRequirementHint(rule.raw)}`, 'warning');
    } else {
        container.pendingReaction = null;
        addObservation('No reaction rule defined for this combination.', 'info');
    }
}

function startChemicalReactionFor(containerId) {
    const container = labState.containers[containerId];
    if (!container) return;
    if (labState.paused) { addObservation('Simulation is paused. Resume to react.', 'warning'); return; }
    if (container.content.length < 2) { addObservation('Need at least 2 chemicals for a reaction!', 'warning'); return; }
    if (container.isReacting) { addObservation('Reaction already in progress in that container!', 'warning'); return; }

    const pending = container.pendingReaction;
    if (pending && pending.raw && pending.raw.requires && pending.raw.requires.includes('stirrer')) {
        const placedStirrer = document.querySelector('.movable-apparatus[data-type="stirrer"]');
        if (!placedStirrer) { addObservation('⚠️ This reaction REQUIRES STIRRING! Place a stirrer.', 'danger'); return; }
    }

    if (pending && pending.raw && pending.raw.heat) {
        const heatType = pending.raw.heat.toLowerCase();
        if (heatType.includes('endothermic') && !labState.burnerOn) {
            addObservation('⚠️ This reaction requires HEAT! Turn on the burner first.', 'danger');
            return;
        }
    }

    if (pending && pending.raw) {
        const minTemp = Number(pending.raw.min_temp);
        const maxTemp = Number(pending.raw.max_temp);
        if (!Number.isNaN(minTemp) && labState.temperature < minTemp) {
            addObservation(`⚠️ This reaction needs at least ${minTemp}°C. Increase heat.`, 'danger');
            return;
        }
        if (!Number.isNaN(maxTemp) && labState.temperature > maxTemp) {
            addObservation(`⚠️ This reaction must stay below ${maxTemp}°C. Reduce heat.`, 'danger');
            return;
        }
    }

    container.isReacting = true;
    setContainerState(containerId, 'state-reacting');
    const el = container.element;
    const mini = el.querySelector('.mini-flask');
    if (mini) {
        mini.classList.add('bubbling');
        mini.classList.add('reacting-visual');
    }

    if (reactionStatus && statusText) {
        reactionStatus.style.display = 'block';
        statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reacting...';
    }

    addObservation('Reaction started in container ' + containerId, 'info');
    const durationMs = pending && pending.raw && (pending.raw.duration_ms || (pending.raw.duration_seconds ? pending.raw.duration_seconds * 1000 : null));
    scheduleReactionCompletion('container', containerId, durationMs);
}

function completeReactionFor(containerId) {
    const container = labState.containers[containerId];
    if (!container) return;
    container.isReacting = false;
    setContainerState(containerId, 'state-filled');
    const pending = container.pendingReaction;
    const el = container.element;
    const mini = el.querySelector('.mini-flask');
    if (mini) {
        mini.classList.remove('bubbling');
        mini.classList.remove('reacting-visual');
    }

    let observation = '';
    let color = null;
    let shouldChangeColor = false;

    let equation = '';
    if (pending) {
        if (Array.isArray(pending.raw && pending.raw.observations)) {
            observation = '✓ ' + pending.raw.observations.join('; ');
        } else if (pending.raw && pending.raw.observations && typeof pending.raw.observations === 'string') {
            observation = '✓ ' + pending.raw.observations;
        } else if (pending.product) {
            observation = `✓ Reaction produced: ${pending.product}`;
        } else {
            observation = 'Reaction completed';
        }

        if (pending.raw && pending.raw.product) {
            equation = formatReactionEquation(container.content, pending.raw.product);
        } else if (pending.product) {
            equation = formatReactionEquation(container.content, pending.product);
        }

        if (pending.color && pending.raw && pending.raw.type !== 'no reaction') {
            color = pending.color;
            shouldChangeColor = true;
        }
    } else {
        observation = 'No significant reaction observed';
    }

    if (shouldChangeColor && color) {
        // Replace contents with product color and re-render using same liquid physics
        const totalAmount = container.content.reduce((sum, chem) => sum + (chem.amount || 10), 0);
        container.content = [{ name: pending?.product || 'Product', color, formula: pending?.product || '', amount: totalAmount || 10 }];
        updateContainerDisplay(containerId);
    }

    container.pendingReaction = null;

    addObservation(observation, 'success');
    if (equation) {
        addObservation(`Equation: ${equation}`, 'info');
    }
    showObservationsWindowFor(5000);
    updateHazardIndicator();

    if (reactionStatus && statusText) {
        statusText.innerHTML = '<i class="fas fa-check-circle"></i> Reaction Complete';
        setTimeout(() => {
            reactionStatus.style.display = 'none';
        }, 3000);
    }
}

// Make an element movable with pointer events
function makeMovable(el) {
    let startX = 0, startY = 0, origX = 0, origY = 0;

    function onPointerDown(e) {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        startX = e.clientX; startY = e.clientY;
        const rect = el.getBoundingClientRect();
        const benchRect = labBench.getBoundingClientRect();
        origX = rect.left - benchRect.left; origY = rect.top - benchRect.top;
        el.style.cursor = 'grabbing';
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
        const dx = e.clientX - startX; const dy = e.clientY - startY;
        const benchRect = labBench.getBoundingClientRect();
        let nx = origX + dx; let ny = origY + dy;
        nx = Math.max(0, Math.min(benchRect.width - el.offsetWidth, nx));
        ny = Math.max(0, Math.min(benchRect.height - el.offsetHeight, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
    }

    function onPointerUp(e) {
        el.style.cursor = 'grab';
        try { el.releasePointerCapture(e.pointerId); } catch(_){}
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        // Keep burner under flask if any burner element exists
        if (el.dataset.type === 'burner') {
            positionBurnerUnderFlask();
        } else {
            const benchRect = labBench.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            const snappedLeft = snapToGrid(rect.left - benchRect.left);
            const snappedTop = snapToGrid(rect.top - benchRect.top);
            el.style.left = `${snappedLeft}px`;
            el.style.top = `${snappedTop}px`;
        }
    }

    el.addEventListener('pointerdown', onPointerDown);
}

// Ensure the burner element stays centered under the flask
function positionBurnerUnderFlask() {
    const placed = getPlacedBurner();
    if (!placed || !mainFlask || !labBench) return;
    const benchRect = labBench.getBoundingClientRect();
    const flaskRect = mainFlask.getBoundingClientRect();
    const burnerRect = placed.getBoundingClientRect();
    const left = flaskRect.left - benchRect.left + (flaskRect.width / 2) - (burnerRect.width / 2);
    // place burner horizontally centered under the flask
    placed.style.left = `${left}px`;
    // put the burner slightly below the flask
    const top = flaskRect.bottom - benchRect.top + 8;
    placed.style.top = `${top}px`;
}

// Allow dropping equipment onto the bench to place movable apparatus
if (labBench) {
    labBench.addEventListener('dragover', e => e.preventDefault());
    labBench.addEventListener('drop', e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const name = e.dataTransfer.getData('name');
        if (type === 'equipment') {
            const rect = labBench.getBoundingClientRect();
            pushHistory();
            placeApparatus(name, e.clientX - rect.left, e.clientY - rect.top);
        }
    });
}


mainFlask.addEventListener('dragover', e => {
    e.preventDefault();
    mainFlask.classList.add('active');
});

mainFlask.addEventListener('dragleave', () => {
    mainFlask.classList.remove('active');
});

mainFlask.addEventListener('drop', e => {
    e.preventDefault();
    mainFlask.classList.remove('active');

    const type = e.dataTransfer.getData('type');
    const name = e.dataTransfer.getData('name');
    const color = e.dataTransfer.getData('color');
    const formula = e.dataTransfer.getData('formula');
    const chemType = e.dataTransfer.getData('chemType');

    if (type === 'chemical') {
        addChemicalToFlask(name, color, formula, chemType);
    } else if (type === 'transfer') {
        const sourceType = e.dataTransfer.getData('sourceType');
        const sourceId = e.dataTransfer.getData('sourceId');
        transferContents(sourceType, sourceId, 'flask', 'flask');
    } else if (type === 'equipment') {
        useEquipment(name);
    }
});
async function loadChemicalStock() {
    try {
        const response = await fetch(window.apiUrl('/data/reactants.json'));
        const data = await response.json();

        allChemicals = data.chemicals; // Store for search/filter

        chemicalStockContainer.innerHTML = '';

        renderChemicals(allChemicals);
        enableChemicalDragging(); // IMPORTANT

        // Build filter buttons dynamically from the loaded chemical types
        renderFilterButtonsFromChemicals(allChemicals);
    } catch (err) {
        console.error('Failed to load reactants.json', err);
        addObservation('⚠ Failed to load chemical stock', 'danger');
    }
}

function renderFilterButtonsFromChemicals(chemicals) {
    const container = document.getElementById('filterButtons');
    if (!container) return;

    // Extract unique types and sort for predictability
    const types = Array.from(new Set(chemicals.map(c => c.type))).sort();

    // Helper to produce nice labels
    const labelMap = {
        acid: 'Acids',
        base: 'Bases',
        salt: 'Salts',
        indicator: 'Indicators',
        solvent: 'Solvents',
        oxidizer: 'Oxidizers',
        reagent: 'Reagents',
        gas: 'Gases'
    };

    // Start with 'All'
    container.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.setAttribute('data-filter', 'all');
    allBtn.textContent = 'All';
    container.appendChild(allBtn);

    // Create a button for each type
    types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.setAttribute('data-filter', t);
        btn.textContent = labelMap[t] || (t.charAt(0).toUpperCase() + t.slice(1));
        container.appendChild(btn);
    });

    // Attach click handlers
    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterChemicals(e.target.getAttribute('data-filter'));
        });
    });
}

function renderChemicals(chemicals) {
    chemicalStockContainer.innerHTML = '';
    
    chemicals.forEach(chem => {
        const div = document.createElement('div');
        div.className = 'chemical-item';
        div.draggable = true;

        div.setAttribute('data-chemical', chem.id);
        div.setAttribute('data-color', chem.color);
        div.setAttribute('data-formula', chem.formula);
        div.setAttribute('data-type', chem.type);

        const state = getChemicalState(chem);
        const hazard = getHazardColor(chem.type);

        div.innerHTML = `
            <span class="chem-info">
                <span class="chem-name">${chem.name}</span>
                <span class="chem-formula">${chem.formula}</span>
                <span class="chem-meta">
                    <span class="hazard-dot" style="background:${hazard}"></span>
                    <span>${chem.type || 'unknown'}</span>
                    <span class="chem-state">${state}</span>
                </span>
            </span>
        `;

        chemicalStockContainer.appendChild(div);
    });
    
    enableChemicalDragging();
}

// ================= CHEMICAL FUNCTIONS =================
function addChemicalToFlask(name, color, formula, chemType = '') {
    if (labState.paused) {
        addObservation('Simulation is paused. Resume to add chemicals.', 'warning');
        return;
    }
    if (labState.isReacting) {
        addObservation('Cannot add chemicals while reaction is in progress!', 'danger');
        return;
    }

    // Enforce 3-chemical limit: inform user and block adding more than 3
    if (labState.flaskContent.length >= 3) {
        addObservation('⚠️ This simulator supports reactions between up to THREE chemicals. Remove one before adding another.', 'warning');
        return;
    }

    pushHistory();
    labState.flaskContent.push({ name, color, formula, type: chemType, amount: labState.chemicalAmount });

    // Update flask display
    updateFlaskDisplay();
    triggerPouringVisual(mainFlask, flaskLiquid || flaskContent);

    // Update mixture info
    updateMixtureInfo();

    // Add observation
    addObservation(`Added ${name} (${formula}) to flask`, 'info');

    // Check for immediate reactions
    checkForReactions();
    updateHazardIndicator();
}

function updateFlaskDisplay() {
    // Support both HTML element and SVG rect for flaskContent
    const isSVGRect = (flaskContent && flaskContent.namespaceURI === 'http://www.w3.org/2000/svg');

    // If empty, remove any existing liquid layers
    if (labState.flaskContent.length === 0) {
        if (flaskLiquid && flaskLiquid.namespaceURI === 'http://www.w3.org/2000/svg') {
            while (flaskLiquid.firstChild) flaskLiquid.removeChild(flaskLiquid.firstChild);
        } else if (flaskContent) {
            // fallback if HTML element present
            flaskContent.style.height = '0%';
            flaskContent.style.backgroundColor = 'transparent';
        }
        setFlaskState('state-empty');
        return;
    }

    if (labState.burnerOn) {
        setFlaskState('state-heating');
    } else {
        setFlaskState('state-filled');
    }

    // Calculate total height percentage (max 80%)
    const totalAmount = labState.flaskContent.reduce((sum, chem) => sum + (chem.amount || 10), 0);
    const heightPct = Math.min(totalAmount, 80);

    // If we're using the SVG group for liquid layers
    if (flaskLiquid && flaskLiquid.namespaceURI === 'http://www.w3.org/2000/svg') {
        const svgElem = flaskLiquid.ownerSVGElement || document.querySelector('#mainFlask svg');
        let baseY = 250;
        let maxFillPx = 100;
        let svgWidth = 220;
        try {
            const outline = svgElem ? svgElem.querySelector('#flaskOutline') : null;
            if (outline && typeof outline.getBBox === 'function') {
                const bbox = outline.getBBox();
                baseY = bbox.y + bbox.height;
                maxFillPx = bbox.height;
                svgWidth = Math.max(bbox.width, svgWidth);
            }
        } catch (e) {
            baseY = 250;
            maxFillPx = 100;
        }

        const totalFillPx = Math.round((heightPct / 100) * maxFillPx);

        // Remove previous layers
        while (flaskLiquid.firstChild) flaskLiquid.removeChild(flaskLiquid.firstChild);

        const n = labState.flaskContent.length;
        let cumulative = 0;
        for (let i = 0; i < n; i++) {
            const chem = labState.flaskContent[i];
            const ratio = (chem.amount || 10) / totalAmount;
            const h = Math.max(1, Math.round(totalFillPx * ratio));
            cumulative += h;
            const y = baseY - cumulative;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', 0);
            rect.setAttribute('y', y);
            rect.setAttribute('width', svgWidth);
            rect.setAttribute('height', h);
            rect.setAttribute('fill', chem.color || '#8a2be2');
            rect.setAttribute('opacity', '0.95');
            flaskLiquid.appendChild(rect);
        }
    } else if (flaskContent) {
        // HTML fallback
        flaskContent.style.height = `${heightPct}%`;
        if (labState.flaskContent.length === 1) {
            flaskContent.style.backgroundColor = labState.flaskContent[0].color;
        } else {
            flaskContent.style.backgroundColor = '#8a2be2';
        }
    }
}

function updateMixtureInfo() {
    const mixtureTargets = [currentMixture, currentMixturePanel].filter(Boolean);
    if (labState.flaskContent.length === 0) {
        mixtureTargets.forEach(target => {
            target.innerHTML = '<p style="color: #ccc; font-style: italic;">Empty flask</p>';
        });
    } else {
        let html = '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
        labState.flaskContent.forEach(chem => {
            const amount = chem.amount || 10;
            html += `
                <div style="background: ${chem.color}22; padding: 5px 10px; border-radius: 15px; 
                      border: 1px solid ${chem.color}; color: ${chem.color}; font-size: 0.9rem;">
                    ${chem.name} (${chem.formula}) · ${amount} mL
                </div>
            `;
        });
        html += '</div>';

        mixtureTargets.forEach(target => {
            target.innerHTML = html;
        });
    }
    
    // Make the bottom section active (visible) when flask content is updated
    const bottomSection = document.querySelector('.lab-bottom-section');
    if (bottomSection) {
        bottomSection.classList.add('active');
        // Remove active class after 5 seconds of inactivity
        clearTimeout(bottomSection.activeTimeout);
        bottomSection.activeTimeout = setTimeout(() => {
            bottomSection.classList.remove('active');
        }, 5000);
    }
}

// ================= REACTION SYSTEM =================
function checkForReactions() {
    if (labState.flaskContent.length < 2) return;

    // Use formulas (fall back to name) and ignore order so HCl + NaOH and NaOH + HCl both match
    const formulas = labState.flaskContent.map(c => (c.formula || c.name).toString().trim().toUpperCase());
    const key = formulas.sort().join('+');
    // Lookup in loaded reactions map (normalized keys)
    console.log('[checkForReactions] Lookup key:', key);
    if (labState.reactions && labState.reactions[key]) {
        const rule = labState.reactions[key];
        const rtype = (rule.raw && rule.raw.type ? rule.raw.type : '').toString().toLowerCase();
        const hasProduct = !!(rule.product || (rule.raw && rule.raw.product));
        if (rtype === 'no reaction' || rtype === 'unknown' || (!hasProduct && !rtype)) {
            console.log('[checkForReactions] Rule is no reaction/unknown for key:', key);
            labState.pendingReaction = null;
            addObservation('No reaction rule defined for this combination.', 'info');
            return;
        }
        console.log('[checkForReactions] Found rule:', rule);
        addObservation(`Possible reaction detected: ${formulas.join(' + ')} → ${rule.product || ''}${getRequirementHint(rule.raw)}`, 'warning');
        reactionStatus.style.display = 'block';
        statusText.textContent = `Ready: ${formulas.join(' + ')}`;
        labState.pendingReaction = rule;
    } else {
        console.log('[checkForReactions] No reaction found for key:', key);
        labState.pendingReaction = null;
        addObservation('No reaction rule defined for this combination.', 'info');
    }
}

function startChemicalReaction() {
    if (labState.paused) {
        addObservation('Simulation is paused. Resume to react.', 'warning');
        return;
    }
    if (labState.flaskContent.length < 2) {
        addObservation('Need at least 2 chemicals for a reaction!', 'warning');
        return;
    }

    if (labState.isReacting) {
        addObservation('Reaction already in progress!', 'warning');
        return;
    }

    // Check if reaction requires stirring
    const pending = labState.pendingReaction;
    console.log('[startChemicalReaction] pendingReaction:', pending);
    if (pending && pending.raw && pending.raw.requires && pending.raw.requires.includes('stirrer')) {
        // allow if a stirrer apparatus is placed on the bench (visual requirement)
        const placedStirrer = document.querySelector('.movable-apparatus[data-type="stirrer"]');
        console.log('[startChemicalReaction] Stirrer required. placedStirrer:', !!placedStirrer);
        if (!placedStirrer) {
            addObservation('⚠️ This reaction REQUIRES STIRRING! Drag a Stirrer onto the bench or click "Add Stirrer" button first.', 'danger');
            return;
        }
    }

    // Check if reaction requires heat
    if (pending && pending.raw && pending.raw.heat) {
        const heatType = pending.raw.heat.toLowerCase();
        if (heatType.includes('endothermic') && !labState.burnerOn) {
            addObservation('⚠️ This reaction requires HEAT! Turn on the burner first.', 'danger');
            return;
        }
    }

    if (pending && pending.raw) {
        const minTemp = Number(pending.raw.min_temp);
        const maxTemp = Number(pending.raw.max_temp);
        if (!Number.isNaN(minTemp) && labState.temperature < minTemp) {
            addObservation(`⚠️ This reaction needs at least ${minTemp}°C. Increase heat.`, 'danger');
            return;
        }
        if (!Number.isNaN(maxTemp) && labState.temperature > maxTemp) {
            addObservation(`⚠️ This reaction must stay below ${maxTemp}°C. Reduce heat.`, 'danger');
            return;
        }
    }

    labState.isReacting = true;
    setFlaskState('state-reacting');
    reactionStatus.style.display = 'block';
    statusText.textContent = 'Reaction in progress...';
    statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reacting...';

    // Use the pendingReaction detected earlier (order-insensitive)
    let reaction = 'no reaction';
    if (pending) {
        if (pending.type) reaction = pending.type;
        else if (pending.product && pending.product.toLowerCase().includes('na')) reaction = 'neutralization';
        else reaction = 'other';
    }

    // Start reaction animation
    if (flaskLiquid) {
        flaskLiquid.classList.add('bubbling');
        flaskLiquid.classList.add('reacting-visual');
    } else if (flaskContent) {
        flaskContent.classList.add('bubbling');
        flaskContent.classList.add('reacting-visual');
    }

    const durationMs = pending && pending.raw && (pending.raw.duration_ms || (pending.raw.duration_seconds ? pending.raw.duration_seconds * 1000 : null));
    scheduleReactionCompletion('flask', 'flask', durationMs);
}

function startReactionForTarget() {
    const target = reactionTargetSelect ? reactionTargetSelect.value : null;
    if (target && target !== 'flask' && labState.containers[target]) {
        startChemicalReactionFor(target);
    } else if (labState.selectedContainerId && labState.containers[labState.selectedContainerId]) {
        startChemicalReactionFor(labState.selectedContainerId);
    } else {
        startChemicalReaction();
    }
}

function completeReaction(type, chemicals) {
    labState.isReacting = false;
    if (labState.burnerOn) {
        setFlaskState('state-heating');
    } else {
        setFlaskState('state-filled');
    }
    if (flaskLiquid) {
        flaskLiquid.classList.remove('bubbling');
        flaskLiquid.classList.remove('reacting-visual');
    } else if (flaskContent) {
        flaskContent.classList.remove('bubbling');
        flaskContent.classList.remove('reacting-visual');
    }


    // Prefer using the loaded reaction rule (if any) for observations/color
    const pending = labState.pendingReaction;
    let observation = '';
    let color = null;  // null means don't change the flask color
    let shouldChangeColor = false;

    let equation = '';
    if (pending) {
        if (Array.isArray(pending.raw && pending.raw.observations)) {
            observation = '✓ ' + pending.raw.observations.join('; ');
        } else if (pending.raw && pending.raw.observations && typeof pending.raw.observations === 'string') {
            observation = '✓ ' + pending.raw.observations;
        } else if (pending.product) {
            observation = `✓ Reaction produced: ${pending.product}`;
        } else {
            observation = 'Reaction completed';
        }

        // Add heat information to observation
        if (pending.raw && pending.raw.heat) {
            observation += ` [${pending.raw.heat}]`;
        }

        // Only change color if there's an actual visible change (not "no reaction" type and has a color)
        if (pending.raw && pending.raw.product) {
            equation = formatReactionEquation(labState.flaskContent, pending.raw.product);
        } else if (pending.product) {
            equation = formatReactionEquation(labState.flaskContent, pending.product);
        }

        if (pending.color && pending.raw && pending.raw.type !== 'no reaction') {
            color = pending.color;
            shouldChangeColor = true;
        }
    } else {
        // Fallback to previous heuristics
        switch (type) {
            case 'neutralization':
                observation = '✓ Neutralization complete: HCl + NaOH → NaCl + H₂O';
                color = '#ffffff';
                shouldChangeColor = true;
                break;
            case 'precipitation':
                if (chemicals.includes('CUSO4') || chemicals.includes('CUSO4')) {
                    observation = '✓ Blue precipitate formed: CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄';
                    color = '#0099cc';
                } else {
                    observation = '✓ White precipitate formed';
                    color = '#ffffff';
                }
                shouldChangeColor = true;
                break;
            default:
                observation = 'No significant reaction observed';
        }
    }

    // Update flask contents/color ONLY if there's a visible change
    if (shouldChangeColor && color) {
        const totalAmount = labState.flaskContent.reduce((sum, chem) => sum + (chem.amount || 10), 0);
        labState.flaskContent = [{ name: pending?.product || 'Product', color, formula: pending?.product || '', amount: totalAmount || 10 }];
        updateFlaskDisplay();
    }

    // Add observation (success)
    addObservation(observation, 'success');
    if (equation) {
        addObservation(`Equation: ${equation}`, 'info');
    }
    showObservationsWindowFor(5000);

    // Update status
    statusText.innerHTML = '<i class="fas fa-check-circle"></i> Reaction Complete';
    setTimeout(() => {
        reactionStatus.style.display = 'none';
    }, 3000);
    updateHazardIndicator();
}

// ================= BURNER CONTROL =================
heatSlider.addEventListener('input', () => {
    labState.temperature = parseInt(heatSlider.value);
    heatValue.textContent = `${labState.temperature}°C`;

    if (labState.burnerOn) {
        pushHistory();
        updateBurnerFlame();
        addObservation(`Temperature adjusted to ${labState.temperature}°C`, 'info');
    }
});

toggleBurner.addEventListener('click', () => {
    if (labState.paused) {
        addObservation('Simulation is paused. Resume to toggle burner.', 'warning');
        return;
    }
    pushHistory();
    labState.burnerOn = !labState.burnerOn;

    if (labState.burnerOn) {
        toggleBurner.innerHTML = '<i class="fas fa-fire"></i> Turn Off Burner';
        toggleBurner.classList.add('danger');
        addObservation('Burner turned ON', 'warning');
    } else {
        toggleBurner.innerHTML = '<i class="fas fa-fire"></i> Turn On Burner';
        toggleBurner.classList.remove('danger');
        heatSlider.value = 100;
        heatValue.textContent = '100°C';
        addObservation('Burner turned OFF', 'info');
    }


    updateBurnerFlame();
});

function updateBurnerFlame() {
    const placed = getPlacedBurner();
    const img = placed ? placed.querySelector('.bench-burner-img') : null;
    if (!img) return;

    if (labState.burnerOn) {
        // choose image based on temperature
        if (labState.temperature > 500) {
            img.src = 'images/burner-blue.svg';
        } else {
            img.src = 'images/burner-red.svg';
        }

        // subtle scale proportional to temperature (visual cue)
        const scale = 1 + Math.min((labState.temperature - 100) / 1400, 1) * 0.6;
        img.style.transform = `scale(${scale})`;

        if (labState.flaskContent.length > 0) {
            if (flaskLiquid) flaskLiquid.classList.add('bubbling');
            else if (flaskContent) flaskContent.classList.add('bubbling');
            setFlaskState('state-heating');
        }
    } else {
        img.src = 'images/burner-off.svg';
        img.style.transform = '';
        if (flaskLiquid) flaskLiquid.classList.remove('bubbling');
        else if (flaskContent) flaskContent.classList.remove('bubbling');
        if (labState.flaskContent.length > 0) {
            setFlaskState('state-filled');
        } else {
            setFlaskState('state-empty');
        }
    }
}

// ================= EQUIPMENT FUNCTIONS =================
function useEquipment(name) {
    switch (name) {
        case 'pipette':
            addObservation('Using pipette to measure 5mL of solution', 'info');
            break;
        case 'dropper':
            addObservation('Added reagent drop by drop', 'info');
            break;
        case 'stirrer':
            addObservation('Stirring the mixture...', 'info');
            // Visual stir effect
            if (flaskLiquid) {
                flaskLiquid.style.animation = 'bubble 1s infinite';
                setTimeout(() => { flaskLiquid.style.animation = ''; }, 3000);
            } else if (flaskContent) {
                flaskContent.style.animation = 'bubble 1s infinite';
                setTimeout(() => { flaskContent.style.animation = ''; }, 3000);
            }
            // Mark that a stirrer action/state is present so reactions that require it can proceed
            labState.stirrer = true;
            break;
        case 'burner': {
            // If no burner placed, auto-place one under the flask
            let placed = getPlacedBurner();
            if (!placed && labBench && mainFlask) {
                const benchRect = labBench.getBoundingClientRect();
                const flaskRect = mainFlask.getBoundingClientRect();
                const x = flaskRect.left - benchRect.left + (flaskRect.width / 2);
                const y = flaskRect.bottom - benchRect.top + 8;
                placeApparatus('burner', x, y);
                placed = getPlacedBurner();
            }

            // Toggle burner if placed
            if (placed) {
                labState.burnerOn = !labState.burnerOn;
                if (labState.burnerOn) {
                    toggleBurner.innerHTML = '<i class="fas fa-fire"></i> Turn Off Burner';
                    toggleBurner.classList.add('danger');
                    addObservation('Burner turned ON', 'warning');
                } else {
                    toggleBurner.innerHTML = '<i class="fas fa-fire"></i> Turn On Burner';
                    toggleBurner.classList.remove('danger');
                    addObservation('Burner turned OFF', 'info');
                }
                updateBurnerFlame();
            } else {
                addObservation('Place a burner on the bench to operate it', 'warning');
            }
        }
            break;
        case 'condenser':
            addObservation('Condenser attached - will reduce vapor loss', 'info');
            labState.condenser = true;
            break;
        case 'retort_stand':
        case 'stand':
            addObservation('Retort stand placed - can support apparatus', 'info');
            labState.stand = true;
            break;
        case 'test_tube_rack':
            addObservation('Test tube rack ready to hold tubes', 'info');
            break;
        case 'beaker':
        case 'volumetric_flask':
        case 'graduated_cylinder':
        case 'test_tube':
            addObservation(`Placed ${name} - can be moved to bench`, 'info');
            break;
        default:
            addObservation(`Used ${name}`, 'info');
    }
}

// ================= TIMER =================
function startLabTimer(minutes, resume = false) {
    if (labState.paused) {
        addObservation('Simulation is paused. Resume to start timer.', 'warning');
        return;
    }

    const baseSeconds = resume ? Math.ceil(labState.timerRemaining) : Math.floor((parseFloat(minutes) || 1) * 60);
    let seconds = Math.max(0, baseSeconds);
    labState.timerRemaining = seconds;

    if (labState.timer) {
        clearInterval(labState.timer);
    }

    timerDisplay.textContent = `⏳ ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    timerDisplay.style.color = '#ff9900';

    const tickMs = Math.max(200, Math.round(1000 / Math.max(0.5, labState.simSpeed || 1)));

    labState.timer = setInterval(() => {
        seconds--;
        labState.timerRemaining = seconds;

        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        timerDisplay.textContent = `⏳ ${min}:${sec.toString().padStart(2, '0')}`;

        if (seconds <= 10) {
            timerDisplay.style.color = '#ff3333';
        }

        if (seconds <= 0) {
            clearInterval(labState.timer);
            labState.timer = null;
            labState.timerRemaining = 0;
            timerDisplay.innerHTML = '<span style="color: #00cc66;">✅ Time\'s up!</span>';
            addObservation('Timer completed', 'success');

            if (labState.flaskContent.length >= 2) {
                startChemicalReaction();
            }
        }
    }, tickMs);
}

startTimer.addEventListener('click', () => {
    pushHistory();
    startLabTimer(timerInput.value);
});

// ================= OBSERVATIONS LOG =================
function addObservation(text, type = 'info') {
    // Show all observations (including apparatus actions) so user sees equipment feedback
    if (!text || typeof text !== 'string') return;

    if (!isReactionRelevantObservation(text, type)) {
        return;
    }

    const observationTargets = [observations, observationsPanel].filter(Boolean);
    observationTargets.forEach(target => {
        const placeholder = target.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }
    });
    if (observationsWindowContent) {
        const placeholder = observationsWindowContent.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }
    }

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const obs = document.createElement('div');
    obs.className = `observation ${type}`;

    let icon = 'fa-info-circle';
    let prefix = '';
    if (type === 'success') {
        icon = 'fa-check-circle';
        prefix = '✓ ';
    }
    if (type === 'warning') {
        icon = 'fa-exclamation-triangle';
        prefix = '⚠ ';
    }
    if (type === 'danger') {
        icon = 'fa-times-circle';
        prefix = '❌ ';
    }

    obs.innerHTML = `
        <span class="observation-content">
            <i class="fas ${icon}" style="color: ${getColorForType(type)};"></i>
            <span class="observation-text">${prefix}${text}</span>
        </span>
        <span class="time">${time}</span>
    `;

    observationTargets.forEach(target => {
        const clone = obs.cloneNode(true);
        target.prepend(clone);
    });
    if (observationsWindowContent) {
        const bubble = document.createElement('div');
        bubble.className = `bubble ${type}`;
        bubble.innerHTML = `
            <span class="observation-content">
                <i class="fas ${icon}" style="color: ${getColorForType(type)};"></i>
                <span class="observation-text">${prefix}${text}</span>
            </span>
            <span class="time">${time}</span>
        `;
        observationsWindowContent.prepend(bubble);
    }

    // Fade in animation
    obs.style.opacity = '0';
    obs.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        obs.style.transition = 'all 0.3s ease';
        obs.style.opacity = '1';
        obs.style.transform = 'translateY(0)';
    }, 10);

    // Make the bottom section active (visible) when observation is added
    const bottomSection = document.querySelector('.lab-bottom-section');
    if (bottomSection) {
        bottomSection.classList.add('active');
        // Remove active class after 5 seconds of inactivity
        clearTimeout(bottomSection.activeTimeout);
        bottomSection.activeTimeout = setTimeout(() => {
            bottomSection.classList.remove('active');
        }, 5000);
    }

    // Limit to 10 observations per panel
    observationTargets.forEach(target => {
        while (target.children.length > 10) {
            target.removeChild(target.lastChild);
        }
        target.scrollTop = 0;
    });
    if (observationsWindowContent) {
        while (observationsWindowContent.children.length > 10) {
            observationsWindowContent.removeChild(observationsWindowContent.lastChild);
        }
    }

    // Mirror warnings into the warnings panel and auto-open when needed
    if (type === 'warning' || type === 'danger') {
        if (warningsWindowContent) {
            const placeholder = warningsWindowContent.querySelector('.placeholder-text');
            if (placeholder) {
                placeholder.remove();
            }
            const warn = document.createElement('div');
            warn.className = `bubble ${type}`;
            warn.innerHTML = `
                <span class="observation-content">
                    <i class="fas ${type === 'danger' ? 'fa-times-circle' : 'fa-exclamation-triangle'}" style="color: ${getColorForType(type)};"></i>
                    <span class="observation-text">${type === 'danger' ? '❌ ' : '⚠ '}${text}</span>
                </span>
                <span class="time">${time}</span>
            `;
            warningsWindowContent.prepend(warn);
        }
        if (warningsWindow) {
            warningsWindow.classList.add('open');
            warningsWindow.setAttribute('aria-hidden', 'false');
        }
    }
}

function showObservationsWindowFor(ms) {
    if (!observationsWindow) return;
    observationsWindow.classList.add('open');
    observationsWindow.setAttribute('aria-hidden', 'false');
    clearTimeout(observationsWindow._autoHideTimer);
    observationsWindow._autoHideTimer = setTimeout(() => {
        observationsWindow.classList.remove('open');
        observationsWindow.setAttribute('aria-hidden', 'true');
    }, ms);
}

function isReactionRelevantObservation(text, type) {
    if (type === 'warning' || type === 'danger' || type === 'success') return true;
    const lowered = text.toLowerCase();
    const reactionKeywords = [
        'reaction',
        'react',
        'reacting',
        'product',
        'precipitate',
        'neutralization',
        'bubbling',
        'gas',
        'heat',
        'temperature',
        'endothermic',
        'exothermic',
        'stirring',
        'stirrer'
    ];
    return reactionKeywords.some(keyword => lowered.includes(keyword));
}

function getColorForType(type) {
    switch (type) {
        case 'success': return '#00cc66';
        case 'warning': return '#ff9900';
        case 'danger': return '#ff3333';
        default: return '#8a2be2';
    }
}

// ================= EVENT LISTENERS =================
startReaction.addEventListener('click', startReactionForTarget);

if (statusStartReaction) {
    statusStartReaction.addEventListener('click', startReactionForTarget);
}

if (reactionTargetSelect) {
    reactionTargetSelect.addEventListener('change', () => {
        const val = reactionTargetSelect.value;
        setReactionTarget(val === 'flask' ? null : val);
    });
}

addStirrer.addEventListener('click', () => {
    pushHistory();
    useEquipment('stirrer');
});

resetLab.addEventListener('click', () => {
    pushHistory();
    labState.flaskContent = [];
    labState.burnerOn = false;
    labState.isReacting = false;
    labState.temperature = 100;
    labState.stirrer = false;  // Reset stirrer flag when lab resets
    labState.paused = false;
    labState.simSpeed = 1;
    labState.timerRemaining = 0;
    if (labState.timer) {
        clearInterval(labState.timer);
        labState.timer = null;
    }

    // Reset visual elements
    updateFlaskDisplay();
    updateMixtureInfo();
    heatSlider.value = 100;
    heatValue.textContent = '100°C';
    if (simSpeedInput) simSpeedInput.value = '1';
    // reset any placed burner images to off
    document.querySelectorAll('.bench-burner-img').forEach(img => img.src = 'images/burner-off.svg');
    toggleBurner.innerHTML = '<i class="fas fa-fire"></i> Turn On Burner';
    toggleBurner.classList.remove('danger');
    if (flaskLiquid) {
        flaskLiquid.classList.remove('bubbling');
        flaskLiquid.classList.remove('reacting-visual');
    } else if (flaskContent) {
        flaskContent.classList.remove('bubbling');
        flaskContent.classList.remove('reacting-visual');
    }
    reactionStatus.style.display = 'none';

    // Remove any movable apparatus placed on the bench (burners, stirrers, etc.)
    document.querySelectorAll('.movable-apparatus').forEach(el => el.remove());

    // Reset apparatus-related flags
    labState.stirrer = false;
    labState.condenser = false;
    labState.stand = false;

    // Clear timer
    if (labState.timer) {
        clearInterval(labState.timer);
        labState.timer = null;
    }
    timerDisplay.textContent = '';

    addObservation('Lab has been reset to initial state', 'info');
    updateHazardIndicator();
});
function filterChemicals(type) {
    if (type === "all") {
        renderChemicals(allChemicals);
    } else {
        renderChemicals(
            allChemicals.filter(c => c.type === type)
        );
    }
}

function searchChemicals(query) {
    const q = query.toLowerCase();
    renderChemicals(
        allChemicals.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.formula.toLowerCase().includes(q)
        )
    );
}


// ================= INITIALIZATION =================
window.addEventListener('load', async () => {
    // Ensure data is loaded before enabling interactions so reaction rules are available
    try {
        await loadChemicalStock();      // JSON → UI
    } catch (e) { /* ignore - loadChemicalStock logs errors */ }
    try {
        await loadEquipmentStock();     // load equipment from JSON
    } catch (e) { /* ignore */ }
    try {
        await loadReactions();          // load reaction rules from JSON
    } catch (e) { /* ignore */ }
    enableChemicalDragging(); // enable dragging for chemicals & equipment

    // Setup search functionality
    const chemicalSearch = document.getElementById('chemicalSearch');
    if (chemicalSearch) {
        chemicalSearch.addEventListener('input', e => {
            searchChemicals(e.target.value);
        });
    }

    // Setup filter toggle button
    const filterToggle = document.getElementById('filterToggle');
    const filterButtons = document.getElementById('filterButtons');
    if (filterToggle && filterButtons) {
        filterToggle.addEventListener('click', () => {
            filterButtons.classList.toggle('visible');
            filterToggle.classList.toggle('active');
        });
    }

    if (chemicalAmountInput && chemicalAmountValue) {
        chemicalAmountInput.addEventListener('input', e => {
            labState.chemicalAmount = parseInt(e.target.value, 10) || 10;
            chemicalAmountValue.textContent = `${labState.chemicalAmount} mL`;
        });
        chemicalAmountValue.textContent = `${labState.chemicalAmount} mL`;
    }

    if (benchZoomInput) {
        benchZoomInput.addEventListener('input', e => {
            setBenchScale(parseFloat(e.target.value));
        });
        setBenchScale(labState.benchScale);
    }

    if (simSpeedInput) {
        simSpeedInput.addEventListener('input', e => {
            labState.simSpeed = parseFloat(e.target.value) || 1;
            if (labState.timer && !labState.paused) {
                startLabTimer(labState.timerRemaining / 60, true);
            }
        });
        simSpeedInput.value = labState.simSpeed.toString();
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => setPaused(true));
    }
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => setPaused(false));
    }

    document.querySelectorAll('[data-action="undo"]').forEach(btn => {
        btn.addEventListener('click', undo);
    });
    document.querySelectorAll('[data-action="redo"]').forEach(btn => {
        btn.addEventListener('click', redo);
    });
    document.querySelectorAll('[data-action="save"]').forEach(btn => {
        btn.addEventListener('click', saveLab);
    });
    document.querySelectorAll('[data-action="load"]').forEach(btn => {
        btn.addEventListener('click', loadLab);
    });

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => setBenchScale(labState.benchScale + 0.05));
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => setBenchScale(labState.benchScale - 0.05));
    }

    // Setup filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            // Remove active class from all buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            // Filter chemicals
            filterChemicals(e.target.getAttribute('data-filter'));
        });
    });

    addObservation('Note: This simulator supports reactions between up to THREE chemicals. Do not add more than three reactants.', 'warning');

    // Auto-hide the limit banner after 5 seconds (fade out then remove)
    const twoChemBanner = document.getElementById('twoChemBanner');
    if (twoChemBanner) {
        // ensure visible initially
        twoChemBanner.style.opacity = '1';
        twoChemBanner.style.transition = 'opacity 0.6s ease';
        setTimeout(() => {
            twoChemBanner.style.opacity = '0';
            // remove from layout after transition
            setTimeout(() => { twoChemBanner.style.display = 'none'; }, 650);
        }, 5000);
    }

    updateHazardIndicator();
});


// ================= TOOLTIPS =================
document.querySelectorAll('.equipment, .chemical-item').forEach(item => {
    item.addEventListener('mouseenter', e => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = item.textContent.trim();
        document.body.appendChild(tooltip);

        const rect = item.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 30}px`;
        tooltip.style.transform = 'translateX(-50%)';

        item._tooltip = tooltip;
    });

    item.addEventListener('mouseleave', () => {
        if (item._tooltip) {
            item._tooltip.remove();
            delete item._tooltip;
        }
    });
});
