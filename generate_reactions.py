import json
from itertools import combinations

# Define all unique reactions with proper data
reactions = {
    'HCl+NaOH': {
        'product': 'NaCl + H2O',
        'color': '#ffffff',
        'type': 'neutralization',
        'heat': 'exothermic',
        'observations': ['Solution becomes colorless', 'Heat released', 'pH approaches neutral'],
        'requires': []
    },
    'H2SO4+NaOH': {
        'product': 'Na2SO4 + H2O',
        'color': '#ffffff',
        'type': 'neutralization',
        'heat': 'exothermic',
        'observations': ['Heat released', 'Colorless solution forms', 'Temperature increases'],
        'requires': []
    },
    'HNO3+NaOH': {
        'product': 'NaNO3 + H2O',
        'color': '#ffffff',
        'type': 'neutralization',
        'heat': 'exothermic',
        'observations': ['Heat released', 'Colorless solution forms'],
        'requires': []
    },
    'CH3COOH+NaOH': {
        'product': 'CH3COONa + H2O',
        'color': '#ffffff',
        'type': 'neutralization',
        'heat': 'exothermic',
        'observations': ['Heat released', 'Mild warmth felt', 'pH becomes neutral'],
        'requires': []
    },
    'HCl+KOH': {
        'product': 'KCl + H2O',
        'color': '#ffffff',
        'type': 'neutralization',
        'heat': 'exothermic',
        'observations': ['Heat released', 'Colorless solution'],
        'requires': []
    },
    'H2SO4+KOH': {
        'product': 'K2SO4 + H2O',
        'color': '#ffffff',
        'type': 'neutralization',
        'heat': 'exothermic',
        'observations': ['Heat released', 'Colorless solution forms'],
        'requires': []
    },
    'HNO3+KOH': {
        'product': 'KNO3 + H2O',
        'color': '#ffffff',
        'type': 'neutralization',
        'heat': 'exothermic',
        'observations': ['Heat released', 'Colorless solution'],
        'requires': []
    },
    'CuSO4+NaOH': {
        'product': 'Cu(OH)2 + Na2SO4',
        'color': '#0099cc',
        'type': 'precipitation',
        'heat': 'slightly exothermic',
        'observations': ['Blue precipitate forms', 'Solution turns cloudy/blue'],
        'requires': ['stirrer']
    },
    'AgNO3+NaCl': {
        'product': 'AgCl + NaNO3',
        'color': '#ffffff',
        'type': 'precipitation',
        'heat': 'negligible',
        'observations': ['White precipitate forms', 'Solution becomes cloudy'],
        'requires': []
    },
    'FeCl3+NaOH': {
        'product': 'Fe(OH)3 + NaCl',
        'color': '#8B4513',
        'type': 'precipitation',
        'heat': 'slightly exothermic',
        'observations': ['Brown/reddish precipitate forms', 'Solution turns cloudy'],
        'requires': ['stirrer']
    },
    'BaCl2+Na2SO4': {
        'product': 'BaSO4 + NaCl',
        'color': '#ffffff',
        'type': 'precipitation',
        'heat': 'negligible',
        'observations': ['White precipitate forms', 'Solution becomes cloudy'],
        'requires': ['stirrer']
    },
    'Pb(NO3)2+NaCl': {
        'product': 'PbCl2 + NaNO3',
        'color': '#ffffcc',
        'type': 'precipitation',
        'heat': 'negligible',
        'observations': ['White/yellow precipitate forms', 'Solution becomes cloudy'],
        'requires': ['stirrer']
    },
    'CuSO4+KOH': {
        'product': 'Cu(OH)2 + K2SO4',
        'color': '#0099cc',
        'type': 'precipitation',
        'heat': 'slightly exothermic',
        'observations': ['Blue precipitate forms', 'Solution becomes cloudy/blue'],
        'requires': ['stirrer']
    },
    'AgNO3+NaI': {
        'product': 'AgI + NaNO3',
        'color': '#ffff99',
        'type': 'precipitation',
        'heat': 'negligible',
        'observations': ['Yellow precipitate forms', 'Solution becomes cloudy'],
        'requires': ['stirrer']
    },
    'KMnO4+H2O2': {
        'product': 'MnO2 + H2O + O2',
        'color': '#800080',
        'type': 'redox',
        'heat': 'exothermic',
        'observations': ['Purple solution fades', 'Oxygen gas bubbles', 'Brown precipitate may form'],
        'requires': []
    },
    # INDICATOR REACTIONS - Color change based on pH
    'HCl+MethylOrange': {
        'product': None,
        'color': '#ff6b35',  # Red/orange in acid
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED/ORANGE (acid detected)'],
        'requires': []
    },
    'HCl+Litmus': {
        'product': None,
        'color': '#ff4d4d',  # Red in acid
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'HCl+MethylRed': {
        'product': None,
        'color': '#ff5050',  # Red in acid
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'HCl+Phenolphthalein': {
        'product': None,
        'color': '#ffffff',  # Colorless in acid
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator remains COLORLESS (acid detected)'],
        'requires': []
    },
    'H2SO4+MethylOrange': {
        'product': None,
        'color': '#ff6b35',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED/ORANGE (acid detected)'],
        'requires': []
    },
    'H2SO4+Litmus': {
        'product': None,
        'color': '#ff4d4d',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'H2SO4+MethylRed': {
        'product': None,
        'color': '#ff5050',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'H2SO4+Phenolphthalein': {
        'product': None,
        'color': '#ffffff',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator remains COLORLESS (acid detected)'],
        'requires': []
    },
    'HNO3+MethylOrange': {
        'product': None,
        'color': '#ff6b35',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED/ORANGE (acid detected)'],
        'requires': []
    },
    'HNO3+Litmus': {
        'product': None,
        'color': '#ff4d4d',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'HNO3+MethylRed': {
        'product': None,
        'color': '#ff5050',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'HNO3+Phenolphthalein': {
        'product': None,
        'color': '#ffffff',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator remains COLORLESS (acid detected)'],
        'requires': []
    },
    'H3PO4+MethylOrange': {
        'product': None,
        'color': '#ff6b35',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED/ORANGE (acid detected)'],
        'requires': []
    },
    'H3PO4+Litmus': {
        'product': None,
        'color': '#ff4d4d',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'H3PO4+MethylRed': {
        'product': None,
        'color': '#ff5050',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'H3PO4+Phenolphthalein': {
        'product': None,
        'color': '#ffffff',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator remains COLORLESS (acid detected)'],
        'requires': []
    },
    'CH3COOH+MethylOrange': {
        'product': None,
        'color': '#ff6b35',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED/ORANGE (acid detected)'],
        'requires': []
    },
    'CH3COOH+Litmus': {
        'product': None,
        'color': '#ff4d4d',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'CH3COOH+MethylRed': {
        'product': None,
        'color': '#ff5050',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns RED (acid detected)'],
        'requires': []
    },
    'CH3COOH+Phenolphthalein': {
        'product': None,
        'color': '#ffffff',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator remains COLORLESS (acid detected)'],
        'requires': []
    },
    # BASE + INDICATOR reactions
    'NaOH+MethylOrange': {
        'product': None,
        'color': '#ffff99',  # Yellow in base
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns YELLOW (base detected)'],
        'requires': []
    },
    'NaOH+Litmus': {
        'product': None,
        'color': '#4d94ff',  # Blue in base
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns BLUE (base detected)'],
        'requires': []
    },
    'NaOH+MethylRed': {
        'product': None,
        'color': '#ffff99',  # Yellow in base
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns YELLOW (base detected)'],
        'requires': []
    },
    'NaOH+Phenolphthalein': {
        'product': None,
        'color': '#ff66cc',  # Pink/magenta in base
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns PINK/MAGENTA (base detected)'],
        'requires': []
    },
    'NaOH+BromothymolBlue': {
        'product': None,
        'color': '#4da6ff',  # Blue in base
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns BLUE (base detected)'],
        'requires': []
    },
    'KOH+MethylOrange': {
        'product': None,
        'color': '#ffff99',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns YELLOW (base detected)'],
        'requires': []
    },
    'KOH+Litmus': {
        'product': None,
        'color': '#4d94ff',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns BLUE (base detected)'],
        'requires': []
    },
    'KOH+MethylRed': {
        'product': None,
        'color': '#ffff99',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns YELLOW (base detected)'],
        'requires': []
    },
    'KOH+Phenolphthalein': {
        'product': None,
        'color': '#ff66cc',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns PINK/MAGENTA (base detected)'],
        'requires': []
    },
    'KOH+BromothymolBlue': {
        'product': None,
        'color': '#4da6ff',
        'type': 'indicator',
        'heat': None,
        'observations': ['Indicator turns BLUE (base detected)'],
        'requires': []
    }
}

# List of all chemicals
chemicals = ['HCl', 'H2SO4', 'HNO3', 'H3PO4', 'CH3COOH', 'NaOH', 'KOH', 'NH3_aq', 'NH4OH', 
             'EtOH', 'MeOH', 'IPA', 'Acetone', 'H2O', 'H2O2', 'KMnO4', 'KCl', 'CaCl2', 'MgSO4', 
             'Na2CO3', 'KNO3', 'CaCO3', 'FeCl3', 'FeSO4', 'Al2(SO4)3', 'Na2S2O3', 'NaBH4', 'ZnSO4', 
             'NaHCO3', 'NaCl', 'MethylOrange', 'BromothymolBlue', 'Litmus', 'MethylRed', 'Phenolphthalein',
             'O2_gas', 'H2_gas', 'CO2_gas', 'NH3_gas', 'Cl2_gas', 'EDTA', 'AgNO3', 'CuSO4', 'Cu(NO3)2',
             'NaI', 'Na2SO4', 'Pb(NO3)2', 'BaCl2', 'BaSO4', 'I2', 'Br2']

# Generate all combinations and add default 'no reaction' for undefined ones
for chem1, chem2 in combinations(chemicals, 2):
    key1 = f'{chem1}+{chem2}'
    key2 = f'{chem2}+{chem1}'
    
    if key1 not in reactions and key2 not in reactions:
        reactions[key1] = {
            'product': None,
            'color': None,
            'type': 'no reaction',
            'heat': None,
            'observations': ['No visible change observed'],
            'requires': []
        }

# Generate all triplet combinations and add default 'no reaction' for undefined ones
for chem1, chem2, chem3 in combinations(chemicals, 3):
    key = f'{chem1}+{chem2}+{chem3}'
    if key not in reactions:
        reactions[key] = {
            'product': None,
            'color': None,
            'type': 'no reaction',
            'heat': None,
            'observations': ['No visible change observed'],
            'requires': []
        }

with open('backend/data/reactions.json', 'w') as f:
    json.dump(reactions, f, indent=2)

print(f'Generated {len(reactions)} reaction entries')

