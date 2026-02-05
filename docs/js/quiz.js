const QUIZ_LENGTH = 10;
let allQuestions = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];

const quizContainer = document.getElementById('quiz-container');
const questionElement = document.getElementById('question');
const optionsElement = document.getElementById('options');
const nextButton = document.getElementById('next-btn');
const prevButton = document.getElementById('prev-btn');
const submitButton = document.getElementById('submit-btn');
const resultElement = document.getElementById('result');
const questionCounter = document.getElementById('questionCounter');
const quizProgress = document.getElementById('quizProgress');
const selectedDifficultyEl = document.getElementById('selectedDifficulty');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardDifficulty = document.getElementById('leaderboardDifficulty');

function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getQuestionKey(question) {
    const text = typeof question.question === 'string' ? question.question.trim() : '';
    const options = Array.isArray(question.options) ? question.options.map(opt => String(opt).trim()) : [];
    return `${text}::${options.join('||')}`;
}

function uniqueQuestions(questions) {
    const seen = new Set();
    const unique = [];
    questions.forEach(q => {
        const key = getQuestionKey(q);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(q);
        }
    });
    return unique;
}

function getDifficulty() {
    const diff = (localStorage.getItem('quizDifficulty') || 'easy').toLowerCase();
    if (selectedDifficultyEl) {
        selectedDifficultyEl.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
    }
    if (leaderboardDifficulty) {
        leaderboardDifficulty.textContent = `Difficulty: ${diff.charAt(0).toUpperCase() + diff.slice(1)}`;
    }
    return diff;
}

async function loadQuestions() {
    const difficulty = getDifficulty();
    const res = await fetch(window.apiUrl(`/data/quiz_${difficulty}.json`), { cache: 'no-store' });
    if (!res.ok) {
        throw new Error('Failed to load quiz data');
    }
    allQuestions = await res.json();
    const uniquePool = uniqueQuestions(allQuestions);
    const randomized = shuffle(uniquePool);
    quizQuestions = randomized.slice(0, Math.min(QUIZ_LENGTH, randomized.length));
    userAnswers = new Array(quizQuestions.length).fill(null);
}

function renderQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    questionElement.innerHTML = `
        <h4>Question ${currentQuestionIndex + 1} of ${quizQuestions.length}</h4>
        <p>${question.question}</p>
    `;

    optionsElement.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'option-btn';
        optionBtn.setAttribute('data-index', index.toString());
        optionBtn.innerHTML = `
            <span class="option-key">${String.fromCharCode(65 + index)}</span>
            <span class="option-text">${option}</span>
        `;

        if (userAnswers[currentQuestionIndex] === index) {
            optionBtn.classList.add('selected');
        }

        optionBtn.addEventListener('click', () => {
            userAnswers[currentQuestionIndex] = index;
            document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
            optionBtn.classList.add('selected');
        });

        optionsElement.appendChild(optionBtn);
    });

    updateButtons();
    updateProgress();
}

function updateButtons() {
    prevButton.disabled = currentQuestionIndex === 0;
    nextButton.disabled = currentQuestionIndex === quizQuestions.length - 1;
    submitButton.style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'inline-block' : 'none';
}

function updateProgress() {
    if (questionCounter) {
        questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    }
    if (quizProgress) {
        const percent = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);
        quizProgress.style.width = `${percent}%`;
        quizProgress.setAttribute('aria-valuenow', String(percent));
    }
}

function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

async function submitQuiz() {
    let score = 0;
    quizQuestions.forEach((q, index) => {
        if (userAnswers[index] === q.answer) {
            score++;
        }
    });

    const total = quizQuestions.length;
    const username = (window.auth && typeof window.auth.getUserName === 'function')
        ? window.auth.getUserName()
        : 'Anonymous';
    const difficulty = getDifficulty();

    let betterThanPct = 0;
    try {
        const res = await fetch(window.apiUrl('/api/quiz/submit'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, score, total, difficulty })
        });
        const data = await res.json();
        if (res.ok && data && typeof data.betterThanPct === 'number') {
            betterThanPct = data.betterThanPct;
        }
    } catch (err) {
        console.warn('Quiz submit failed', err);
    }

    resultElement.innerHTML = `
        <h3>Quiz Completed!</h3>
        <p class="mb-2">Score: <strong>${score}</strong> / ${total}</p>
        <p class="mb-0">You did better than <strong>${betterThanPct}%</strong> of participants at this difficulty.</p>
    `;
    resultElement.style.display = 'block';

    quizContainer.style.display = 'none';
    await loadLeaderboard();
}

async function loadLeaderboard() {
    if (!leaderboardList) return;
    const difficulty = getDifficulty();
    leaderboardList.innerHTML = '<div class="text-muted">Loading leaderboard...</div>';
    try {
        const res = await fetch(window.apiUrl(`/api/quiz/leaderboard?difficulty=${encodeURIComponent(difficulty)}`));
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('Failed to load leaderboard');
        if (!data.scores || data.scores.length === 0) {
            leaderboardList.innerHTML = '<div class="text-muted">No scores yet. Be the first to play!</div>';
            return;
        }
        leaderboardList.innerHTML = '';
        data.scores.forEach((row, index) => {
            const el = document.createElement('div');
            el.className = 'leaderboard-row';
            el.innerHTML = `
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-user">${row.username}</span>
                <span class="leaderboard-score">${row.score}/${row.total}</span>
            `;
            leaderboardList.appendChild(el);
        });
    } catch (err) {
        leaderboardList.innerHTML = '<div class="text-muted">Leaderboard unavailable.</div>';
    }
}

async function initQuiz() {
    if (!quizContainer || !questionElement || !optionsElement) return;
    resultElement.style.display = 'none';
    try {
        await loadQuestions();
        renderQuestion();
        await loadLeaderboard();
    } catch (err) {
        resultElement.style.display = 'block';
        resultElement.innerHTML = '<p>Unable to load quiz questions. Please refresh and try again.</p>';
        quizContainer.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (nextButton) nextButton.addEventListener('click', nextQuestion);
    if (prevButton) prevButton.addEventListener('click', previousQuestion);
    if (submitButton) submitButton.addEventListener('click', submitQuiz);
    initQuiz();
});