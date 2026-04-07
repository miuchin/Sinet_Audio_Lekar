#!/usr/bin/env python3
import json, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'data' / 'SINET_CATALOG.json'
OUT = ROOT / 'SINET_Audio_Lekar_DOCS_SUPPORT' / 'NARODNI_SLOJ_AUDIT_v16.0.0.118.40.10.md'
READY = ROOT / 'data' / 'narodne_metode' / 'enciklopedija' / 'sinet_ready_katalog.json'

def main():
    data = json.loads(CATALOG.read_text(encoding='utf-8'))
    items = data['items'] if isinstance(data, dict) and 'items' in data else data
    nar_counter = collections.Counter()
    sav_counter = collections.Counter()
    generic = 0
    specific = 0
    generic_markers = [
        'alternativni pristup je pomocni sloj',
        'pomocne mere mogu biti korisne kao podrska',
        'kod akutnih stanja pomocne mere su samo podrska',
        'frekvencije su podr',
    ]
    for it in items:
        h = it.get('holisticki', {}) if isinstance(it, dict) else {}
        nar = h.get('narodni_lek') or {}
        nar_txt = (nar.get('opis') or nar.get('tekst') or '').strip() if isinstance(nar, dict) else ''
        sav_txt = ((h.get('saveti') or {}).get('narodno', '')).strip()
        if nar_txt:
            nar_counter[nar_txt] += 1
        if sav_txt:
            sav_counter[sav_txt] += 1
            n = sav_txt.lower()
            if any(m in n for m in generic_markers):
                generic += 1
            else:
                specific += 1
    ready = json.loads(READY.read_text(encoding='utf-8'))
    ready_count = sum(len(v) for v in ready.values() if isinstance(v, list))

    parts = []
    parts.append('# SINET Audio Lekar — Narodni sloj audit v16.0.0.118.40.10\n')
    parts.append('## Sažetak\nAudit proverava praktični narodni sloj u katalogu i review-first dataset iz Enciklopedije.\n')
    parts.append('## Brojevi\n')
    parts.append(f'- Ukupno katalog unosa: **{len(items):,}**\n')
    parts.append(f'- Unosa sa `narodni_lek` tekstom: **{sum(nar_counter.values()):,}**\n')
    parts.append(f'- Unosa sa `saveti.narodno`: **{sum(sav_counter.values()):,}**\n')
    parts.append(f'- Jedinstvenih `narodni_lek` tekstova: **{len(nar_counter):,}**\n')
    parts.append(f'- Jedinstvenih `saveti.narodno` tekstova: **{len(sav_counter):,}**\n')
    parts.append(f'- Generičkih / boilerplate narodnih saveta: **{generic:,}**\n')
    parts.append(f'- Konkretnijih praktičnih narodnih saveta: **{specific:,}**\n')
    parts.append(f'- Kuriranih review-first kandidata iz Enciklopedije: **{ready_count}**\n')
    parts.append('\n## Top obrasci (`saveti.narodno`)\n')
    for txt, n in sav_counter.most_common(8):
        parts.append(f'- **{n}×** {txt}\n')
    OUT.write_text(''.join(parts), encoding='utf-8')
    print(f'Wrote {OUT}')

if __name__ == '__main__':
    main()
