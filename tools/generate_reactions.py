import json
import os

root = os.path.dirname(os.path.dirname(__file__))
reactants_path = os.path.join(root, 'backend', 'data', 'reactants.json')
reactions_path = os.path.join(root, 'backend', 'data', 'reactions.json')
backup_path = reactions_path + '.bak'

with open(reactants_path, 'r', encoding='utf-8') as f:
    reactants = json.load(f).get('chemicals', [])

# Build set of unique identifiers using formula when available else id
id_map = {}
for c in reactants:
    key = (c.get('formula') or c.get('id') or c.get('name') or '').strip()
    if not key:
        continue
    id_map[key] = key

ids = sorted(id_map.keys())

# Load existing reactions (if any)
existing = {}
if os.path.exists(reactions_path):
    try:
        with open(reactions_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    except Exception:
        existing = {}

# Normalize existing keys to set for quick lookup
norm_existing = set()
for rawk in existing.keys():
    parts = [p.strip().upper() for p in rawk.split('+') if p.strip()]
    if parts:
        norm_existing.add('+'.join(sorted(parts)))

result = {}
# copy existing entries first, normalizing keys to order-insensitive UPPERCASE
for rawk, val in existing.items():
    parts = [p.strip().upper() for p in rawk.split('+') if p.strip()]
    if not parts:
        continue
    norm_key = '+'.join(sorted(parts))
    # prefer existing entry but ensure key is normalized
    result[norm_key] = val

# generate placeholders for each unordered pair
from itertools import combinations
for a,b in combinations(ids, 2):
    norm = '+'.join(sorted([a.upper(), b.upper()]))
    if norm in norm_existing:
        continue
    raw_key = norm  # write normalized key (UPPERCASE + sorted)
    entry = {
        "product": None,
        "color": None,
        "type": "unknown",
        "heat": None,
        "observations": ["No reaction rule defined for this combination."],
        "requires": []
    }
    result[raw_key] = entry

# generate placeholders for each unordered triplet
for a, b, c in combinations(ids, 3):
    norm = '+'.join(sorted([a.upper(), b.upper(), c.upper()]))
    if norm in norm_existing:
        continue
    raw_key = norm  # write normalized key (UPPERCASE + sorted)
    entry = {
        "product": None,
        "color": None,
        "type": "unknown",
        "heat": None,
        "observations": ["No reaction rule defined for this combination."],
        "requires": []
    }
    result[raw_key] = entry

# Save backup of current reactions.json
if os.path.exists(reactions_path):
    try:
        os.replace(reactions_path, backup_path)
    except Exception:
        pass

# Write new reactions.json sorted by key
out = dict(sorted(result.items(), key=lambda kv: kv[0]))
with open(reactions_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

print(f'Wrote expanded reactions.json with {len(out)} entries. Backup at {backup_path}')
