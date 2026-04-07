#!/usr/bin/env python3
import json
from pathlib import Path

def empty(v):
    if v is None:
        return True
    if isinstance(v, str):
        return not v.strip()
    if isinstance(v, (list, dict)):
        return len(v) == 0
    return False

root = Path(__file__).resolve().parents[1]
catalog_path = root / 'data' / 'SINET_CATALOG.json'
with catalog_path.open(encoding='utf-8') as f:
    items = json.load(f)['items']

stats = {
    'total': len(items),
    'missing_opis': 0,
    'missing_mkb10_obj': 0,
    'missing_mkb10_title': 0,
    'missing_frekvencije': 0,
    'missing_freq_descs': 0,
    'missing_alternatives': 0,
    'missing_alt_descs': 0,
    'missing_preporuka': 0,
    'missing_narodne': 0,
}

for it in items:
    if empty(it.get('opis')):
        stats['missing_opis'] += 1
    mo = it.get('mkb10_obj')
    if empty(mo):
        stats['missing_mkb10_obj'] += 1
    elif empty(mo.get('naziv')):
        stats['missing_mkb10_title'] += 1
    fre = it.get('frekvencije') or []
    if not fre:
        stats['missing_frekvencije'] += 1
    elif any(not str((f or {}).get('opis') or (f or {}).get('funkcija') or (f or {}).get('svrha') or '').strip() for f in fre if isinstance(f, dict)):
        stats['missing_freq_descs'] += 1
    alt = it.get('alternativne_metode') or []
    if not alt:
        stats['missing_alternatives'] += 1
    elif any(not str((a or {}).get('opis') or (a or {}).get('summary') or (a or {}).get('desc') or '').strip() for a in alt if isinstance(a, dict)):
        stats['missing_alt_descs'] += 1
    if empty(it.get('preporuka')):
        stats['missing_preporuka'] += 1
    nar = it.get('narodne_metode') or it.get('narodni_lekovi') or []
    if not nar:
        stats['missing_narodne'] += 1

for k, v in stats.items():
    print(f'{k}: {v}')
