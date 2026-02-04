import json, os, sys
p = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'data', 'reactions.json')
try:
    with open(p, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print('ERROR loading JSON:', e)
    sys.exit(1)

norm_map = {}
empty_components = []
invalid_chars = []
count = 0
for raw in data.keys():
    count += 1
    parts = [p.strip() for p in raw.split('+')]
    if any(part == '' for part in parts):
        empty_components.append(raw)
    up = [part.upper() for part in parts if part != '']
    norm = '+'.join(sorted(up))
    norm_map.setdefault(norm, []).append(raw)
    # detect suspicious characters (unbalanced parentheses?)
    if raw.count('(') != raw.count(')'):
        invalid_chars.append((raw, 'unbalanced parentheses'))

duplicates = {k:v for k,v in norm_map.items() if len(v) > 1}

print('Total entries:', count)
print('Entries with empty components (keys containing empty formula/name):', len(empty_components))
for i,k in enumerate(empty_components[:20],1):
    print(f'  {i}. {k}')

print('\nNormalized duplicates (order-insensitive duplicates):', len(duplicates))
for i,(norm, raws) in enumerate(list(duplicates.items())[:50],1):
    print(f'  {i}. Norm: {norm} -> {raws[:5]}')

print('\nInvalid char issues:', len(invalid_chars))
for i,(k,reason) in enumerate(invalid_chars[:20],1):
    print(f'  {i}. {k} ({reason})')

# Also report keys with lowercase formulas (should be uppercase standard) and plus signs in odd places
lower_keys = [k for k in data.keys() if any(c.islower() for c in k)]
print('\nKeys containing lowercase letters:', len(lower_keys))
for k in lower_keys[:20]:
    print('  ', k)

# exit with success
sys.exit(0)
