#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SINET dx_index generator

Pravi mali fajl: data/sinet_dx_index.json
Mapira MKB-10 šifre na SINET symptom ids (heuristika).

Pokretanje:
  python3 tools/generate_dx_index.py --symptoms-dir "/putanja/do/foldera" \
     --catalog "data/SINET_STL.json" --out "data/sinet_dx_index.json"
"""

import argparse, json, re, sys
from pathlib import Path
from collections import defaultdict, Counter

ICD_RE = re.compile(r"\b([A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?)\b")

def read_text_file(path: Path, max_bytes: int = 2_000_000) -> str:
    try:
        b = path.read_bytes()
        if len(b) > max_bytes:
            b = b[:max_bytes]
        for enc in ("utf-8", "utf-8-sig", "cp1250", "latin-1"):
            try:
                return b.decode(enc, errors="ignore")
            except Exception:
                continue
        return b.decode("utf-8", errors="ignore")
    except Exception:
        return ""

def normalize_token(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9čćđšž]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def token_set(s: str) -> set:
    s = normalize_token(s)
    toks = [t for t in s.split(" ") if len(t) >= 3]
    return set(toks)

def load_catalog(path: Path):
    data = json.loads(path.read_text(encoding="utf-8"))
    items = data if isinstance(data, list) else data.get("items") or data.get("katalog") or []
    by_id = {}
    id_tokens = {}
    for it in items:
        sid = str(it.get("id") or "").strip()
        if not sid:
            continue
        by_id[sid] = it
        name = f"{it.get('simptom','')} {it.get('naziv','')} {it.get('opis','')}"
        id_tokens[sid] = token_set(name)
    return by_id, id_tokens

def guess_sinet_id_from_filename(stem: str, by_id: dict):
    if stem in by_id:
        return stem
    m = re.search(r"(simptom)\s*[_-]?\s*(\d+)", stem, flags=re.I)
    if m:
        num = m.group(2)
        for sid, it in by_id.items():
            s = str(it.get("simptom") or "")
            if s.strip().lower() == f"simptom {num}".lower():
                return sid
    return None

def best_match_by_content(text: str, id_tokens: dict, top_k: int = 3):
    ts = token_set(text)
    if not ts:
        return []
    scores = []
    for sid, toks in id_tokens.items():
        if not toks:
            continue
        inter = len(ts & toks)
        if inter <= 2:
            continue
        score = inter / max(5, len(toks))
        scores.append((score, sid))
    scores.sort(reverse=True)
    return scores[:top_k]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--symptoms-dir", required=True)
    ap.add_argument("--catalog", default="data/SINET_STL.json")
    ap.add_argument("--out", default="data/sinet_dx_index.json")
    ap.add_argument("--max-files", type=int, default=50000)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    base = Path(args.symptoms_dir).expanduser().resolve()
    cat = Path(args.catalog).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()

    if not base.exists():
        print("ERROR: symptoms dir does not exist:", base, file=sys.stderr)
        sys.exit(2)
    if not cat.exists():
        print("ERROR: catalog not found:", cat, file=sys.stderr)
        sys.exit(2)

    by_id, id_tokens = load_catalog(cat)

    mapping = {}
    src_count = defaultdict(int)

    exts = {".html", ".htm", ".md", ".txt", ".json"}
    files = []
    for p in base.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            files.append(p)
            if len(files) >= args.max_files:
                break

    for p in files:
        text = read_text_file(p)
        if not text:
            continue
        codes = sorted(set(ICD_RE.findall(text)))
        if not codes:
            continue

        stem = p.stem
        guessed = guess_sinet_id_from_filename(stem, by_id)
        matches = []
        if not guessed:
            matches = best_match_by_content(text[:20000], id_tokens, top_k=3)
            if matches and matches[0][0] >= 0.18:
                guessed = matches[0][1]

        kw = set()
        kw |= token_set(stem.replace("_"," ").replace("-"," "))
        m = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.I|re.S)
        if m:
            kw |= token_set(m.group(1)[:200])
        m = re.search(r"<h1[^>]*>(.*?)</h1>", text, flags=re.I|re.S)
        if m:
            kw |= token_set(m.group(1)[:200])

        for code in codes:
            rec = mapping.get(code)
            if not rec:
                rec = {"label":"", "keywords":[], "sinet_refs":[], "sources":[], "confidence":0.0}
                mapping[code] = rec

            if kw:
                cur = set(rec["keywords"])
                for t in sorted(kw):
                    if len(cur) >= 30:
                        break
                    cur.add(t)
                rec["keywords"] = sorted(cur)

            src_count[code] += 1
            if len(rec["sources"]) < 12:
                try:
                    rec["sources"].append(str(p.relative_to(base)).replace("\\","/"))
                except Exception:
                    rec["sources"].append(str(p))

            if guessed:
                if guessed not in rec["sinet_refs"]:
                    rec["sinet_refs"].append(guessed)
                rec["confidence"] = max(rec["confidence"], 0.55)
            elif matches:
                for sc, sid in matches[:2]:
                    if sid not in rec["sinet_refs"]:
                        rec["sinet_refs"].append(sid)
                    rec["confidence"] = max(rec["confidence"], float(sc))

    mapping_sorted = {k: mapping[k] for k in sorted(mapping.keys())}

    if args.dry_run:
        print("Found ICD codes:", len(mapping_sorted))
        top = Counter(src_count).most_common(20)
        print("Top by occurrences:")
        for code, c in top:
            print(f"  {code}: {c} files")
        return

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(mapping_sorted, ensure_ascii=False, indent=2), encoding="utf-8")
    print("OK ->", out)

if __name__ == "__main__":
    main()
