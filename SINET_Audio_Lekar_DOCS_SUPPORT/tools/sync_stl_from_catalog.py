#!/usr/bin/env python3
"""
Sync SINET_STL.json with SINET_CATALOG.json without duplicating Model A freq_catalog metadata.

What it does:
- Replaces generic STL item names like "Simptom 123" with SINET_CATALOG.items[i].simptom
- Backfills frekvencije[i].funkcija from catalog frekvencije[i].svrha by item id + hz
- Preserves meta.freq_catalog as the main naziv/opis/izvor source

Usage:
  python tools/sync_stl_from_catalog.py data/SINET_STL.json data/SINET_CATALOG.json
"""
import json, re, sys

def txt(*vals):
    for v in vals:
        if isinstance(v, str):
            s = v.strip()
            if s:
                return s
    return ''

def main(stl_path, cat_path):
    stl = json.load(open(stl_path, 'r', encoding='utf-8'))
    cat = json.load(open(cat_path, 'r', encoding='utf-8'))
    cat_index = {it['id']: it for it in cat.get('items', []) if it.get('id')}
    stats = {'items_total': len(stl.get('simptomi', [])), 'items_matched': 0, 'items_standardized': 0, 'freq_total': sum(len(item.get('frekvencije') or []) for item in stl.get('simptomi', [])), 'freq_functions_filled': 0, 'unmatched': []}
    for item in stl.get('simptomi', []):
        ci = cat_index.get(item.get('id'))
        if not ci:
            stats['unmatched'].append(item.get('id'))
            continue
        stats['items_matched'] += 1
        target_name = txt(ci.get('simptom'), item.get('opis'))
        if re.match(r'^Simptom\s*\d+$', txt(item.get('naziv')), re.I) or not txt(item.get('naziv')):
            if target_name and target_name != item.get('naziv'):
                item['naziv'] = target_name
        if target_name and txt(item.get('naziv')) == target_name:
            stats['items_standardized'] += 1
        if not txt(item.get('simptom')):
            item['simptom'] = txt(item.get('naziv'), ci.get('simptom'))
        cmap = {}
        for cf in ci.get('frekvencije') or []:
            cmap.setdefault(str(cf.get('value')), []).append(cf)
        for f in item.get('frekvencije') or []:
            arr = cmap.get(str(f.get('hz'))) or []
            cf = arr.pop(0) if arr else None
            purpose = txt(cf.get('svrha'), cf.get('funkcija'), cf.get('opis')) if cf else ''
            if purpose and not txt(f.get('funkcija'), f.get('svrha')):
                f['funkcija'] = purpose
            if txt(f.get('funkcija'), f.get('svrha')):
                stats['freq_functions_filled'] += 1
    stl.setdefault('meta', {})['catalog_sync'] = {
        'version': 'v16.0.0.10',
        'generatedAt': '2026-03-01T20:00:00+01:00',
        'strategy': 'name sync + funkcija backfill from SINET_CATALOG while keeping Model A meta.freq_catalog for naziv/opis/izvor',
        'itemsTotal': stats['items_total'],
        'itemsMatched': stats['items_matched'],
        'itemsStandardized': stats['items_standardized'],
        'freqTotal': stats['freq_total'],
        'freqFunctionsFilled': stats['freq_functions_filled'],
        'unmatchedItemIds': stats['unmatched'],
    }
    with open(stl_path, 'w', encoding='utf-8') as f:
        json.dump(stl, f, ensure_ascii=False, indent=2)
    print(json.dumps(stats, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python tools/sync_stl_from_catalog.py data/SINET_STL.json data/SINET_CATALOG.json', file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
