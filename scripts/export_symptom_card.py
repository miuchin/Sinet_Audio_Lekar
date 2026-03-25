#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, html
from pathlib import Path
VERSION = '16.0.0.118.34'
TEMPLATE = """<!doctype html><html lang='sr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>{title}</title><style>body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#14324a;margin:0;padding:12px}.sheet{border:1px solid #d9e7f5;border-radius:16px;padding:14px}.title{font-size:28px;font-weight:800;margin:0 0 8px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.block{border:1px solid #d9e7f5;border-radius:12px;padding:10px;break-inside:avoid}.small{color:#5f7288;font-size:12px}.item{margin:0 0 8px 0}@page{size:A4 landscape;margin:10mm}@media print{body{padding:0}.sheet{border:none;padding:0}}</style></head><body><div class='sheet'>{body}</div></body></html>"""
def esc(v=''):
    return html.escape(str(v or ''))
def main():
    ap=argparse.ArgumentParser(description='Export one SINET symptom print card to standalone HTML.')
    ap.add_argument('--catalog', default='data/SINET_CATALOG.json')
    ap.add_argument('--id', required=True)
    ap.add_argument('--out', required=True)
    args=ap.parse_args()
    data=json.load(open(args.catalog,'r',encoding='utf-8'))
    items=data.get('items') or []
    item=next((x for x in items if x.get('id')==args.id), None)
    if not item: raise SystemExit(f'Symptom id not found: {args.id}')
    mkb=item.get('mkb10_obj') or item.get('mkb10') or {}
    hol=item.get('holisticki') or {}
    freqs=item.get('frekvencije') or []
    alts=item.get('alternativne_metode') or []
    body=f"<div class='title'>{esc(item.get('simptom') or item.get('naziv') or item.get('id'))}</div><div class='small'>SINET print kartica v{VERSION} • {esc(item.get('id'))}</div><div class='grid'><div class='block'><h3>Oblast</h3><div class='item'><b>{esc(item.get('oblast'))}</b></div><div class='item'>Podoblast: {esc(item.get('podOblast'))}</div><div class='item'>MKB-10: {esc((mkb.get('sifra') if hasattr(mkb,'get') else mkb) or 'NONE')} — {esc(mkb.get('naziv') if hasattr(mkb,'get') else '')}</div></div><div class='block'><h3>Opis</h3><div>{esc(item.get('opis'))}</div></div><div class='block'><h3>Holistički pristup</h3><div>{esc(hol.get('opis'))}</div></div></div><div class='grid' style='margin-top:12px'><div class='block'><h3>Frekvencije</h3>{''.join(f'<div class="item"><b>{esc(f.get("naziv") or (str(f.get("hz")) + " Hz"))}</b><div class="small">{esc(f.get("opis"))}</div></div>' for f in freqs) or '<div class="small">Nema frekvencija.</div>'}</div><div class='block'><h3>Alternative</h3>{''.join(f'<div class="item"><b>{esc(a.get("naziv") or a.get("id"))}</b><div class="small">{esc(a.get("opis") or a.get("summary"))}</div></div>' for a in alts) or '<div class="small">Nema alternativa.</div>'}</div><div class='block'><h3>Napomene</h3><div>{esc(item.get('preporuka'))}</div></div></div>"
    out=TEMPLATE.replace('{title}', esc(f"SINET kartica - {item.get('simptom') or item.get('id')}")).replace('{body}', body)
    Path(args.out).write_text(out, encoding='utf-8')
    print(args.out)
if __name__=='__main__':
    main()
