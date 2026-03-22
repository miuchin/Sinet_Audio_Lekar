#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SINET dx_index generator (iz kataloga)

Pravi fajl: data/sinet_dx_index.json

Ideja:
- Koristi već popunjena polja u kanonskom katalogu: simptomi[].mkb10.sifra / mkb10.naziv
- Generiše mapu: ICD-10 šifra -> { title, keywords, sinet_refs }

Upotreba:
  python3 tools/generate_dx_index_from_catalog.py \
    --catalog "data/SINET_STL.json" \
    --mkb "data/mkb10_sr.json" \
    --out "data/sinet_dx_index.json" \
    --add-parent \
    --max-refs 24
"""

import argparse, json, re
from pathlib import Path

STOP = {
  'i','ili','na','u','uz','od','do','za','sa','bez','te','je','su','se','koji','koja','koje','što','to','kao',
  'kod','nad','pod','pri','po','per','et','non','sine','status',
  'akutna','akutni','hronicna','hronicni','nespecificiran','nespecificirana','nespecificirano'
}

def normalize(s: str) -> str:
    s = (s or '').lower()
    s = re.sub(r"[^a-z0-9čćđšž\.\s-]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def keywords_from(*texts, limit=18):
    out = []
    seen = set()
    for t in texts:
        for w in normalize(t).split(" "):
            if len(w) < 4: 
                continue
            if w in STOP:
                continue
            if w in seen:
                continue
            seen.add(w)
            out.append(w)
            if len(out) >= limit:
                return out
    return out

def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def mkb_by_code(mkb):
    d = {}
    if isinstance(mkb, list):
        for it in mkb:
            code = (it or {}).get("code")
            if code:
                d[str(code)] = it
    return d

def add_ref(mapping, code, title, kw, sid, max_refs):
    if not code:
        return
    rec = mapping.get(code)
    if not rec:
        rec = {"title": title or "", "keywords": [], "sinet_refs": []}
        mapping[code] = rec
    if not rec.get("title") and title:
        rec["title"] = title
    # keywords merge
    for k in (kw or []):
        if k and k not in rec["keywords"]:
            rec["keywords"].append(k)
        if len(rec["keywords"]) >= 30:
            break
    # refs
    if sid and sid not in rec["sinet_refs"] and len(rec["sinet_refs"]) < max_refs:
        rec["sinet_refs"].append(sid)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default="data/SINET_STL.json")
    ap.add_argument("--mkb", default="data/mkb10_sr.json")
    ap.add_argument("--out", default="data/sinet_dx_index.json")
    ap.add_argument("--max-refs", type=int, default=24)
    ap.add_argument("--add-parent", action="store_true")
    args = ap.parse_args()

    catalog = load_json(Path(args.catalog))
    if isinstance(catalog, dict) and isinstance(catalog.get("simptomi"), list):
        items = catalog["simptomi"]
    elif isinstance(catalog, list):
        items = catalog
    else:
        raise SystemExit("Ne prepoznajem STL format (očekujem {meta, simptomi[]} ili direktan niz).")

    mkb_map = {}
    try:
        mkb_map = mkb_by_code(load_json(Path(args.mkb)))
    except Exception:
        mkb_map = {}

    max_refs = max(6, min(200, int(args.max_refs)))

    mapping = {}
    non_icd = 0
    mapped = 0

    for it in items:
        sid = str((it or {}).get("id") or "").strip()
        if not sid:
            continue
        mkb = (it or {}).get("mkb10") or {}
        if not isinstance(mkb, dict):
            mkb = {}
        kind = str(mkb.get("kind") or "").strip()
        code = str(mkb.get("sifra") or mkb.get("šifra") or mkb.get("code") or "").strip()
        if kind == "NON_ICD" or code in ("NONE", "NON_ICD"):
            non_icd += 1
            continue
        if not code:
            continue

        mapped += 1
        title = str(mkb.get("naziv") or mkb.get("title") or "").strip()
        if not title and code in mkb_map:
            title = str(mkb_map[code].get("title_sr") or mkb_map[code].get("title") or "").strip()

        kw = keywords_from(title, (it or {}).get("naziv") or "", (it or {}).get("opis") or "")

        add_ref(mapping, code, title, kw, sid, max_refs)

        if args.add_parent and "." in code:
            parent = code.split(".", 1)[0]
            ptitle = ""
            if parent in mkb_map:
                ptitle = str(mkb_map[parent].get("title_sr") or mkb_map[parent].get("title") or "").strip()
            add_ref(mapping, parent, ptitle, keywords_from(ptitle or parent), sid, max_refs)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    mapping_sorted = {k: mapping[k] for k in sorted(mapping.keys())}
    out.write_text(json.dumps(mapping_sorted, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK → {out}  | šifre: {len(mapping_sorted)} | mapirano stavki: {mapped} | NON_ICD: {non_icd}")

if __name__ == "__main__":
    main()
