#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inject/merge a frequency catalog into SINET_STL.json under meta.freq_catalog (Model A).
Usage:
  python inject_freq_catalog.py /path/to/SINET_STL.json freq_catalog_seed.json

Notes:
- Keeps filename and structure intact.
- Adds/merges meta.freq_catalog entries by normalized key (string).
"""
import json, sys, math

def hz_key(hz):
    try:
        n = float(hz)
        if math.isfinite(n):
            n = round(n, 3)  # avoid float noise
            # convert -0.0 to 0
            if n == 0:
                n = 0.0
            s = ('%g' % n)
            return s
    except Exception:
        pass
    return str(hz).strip()

def main():
    if len(sys.argv) < 3:
        print("Usage: python inject_freq_catalog.py SINET_STL.json freq_catalog_seed.json", file=sys.stderr)
        sys.exit(2)

    stl_path = sys.argv[1]
    seed_path = sys.argv[2]

    with open(stl_path, "r", encoding="utf-8") as f:
        stl = json.load(f)

    with open(seed_path, "r", encoding="utf-8") as f:
        seed = json.load(f)

    meta = stl.setdefault("meta", {})
    fc = meta.setdefault("freq_catalog", {})

    added = 0
    updated = 0
    for k, v in seed.items():
        nk = hz_key(k)
        if nk not in fc:
            fc[nk] = v
            added += 1
        else:
            # merge conservatively: fill blanks only
            cur = fc[nk]
            for field in ("naziv","opis","evidence","tags","izvor"):
                if field not in cur or cur.get(field) in (None,"",[],{}):
                    cur[field] = v.get(field)
            updated += 1

    meta["freq_catalog"] = fc

    with open(stl_path, "w", encoding="utf-8") as f:
        json.dump(stl, f, ensure_ascii=False, indent=2)

    print(f"OK: added={added}, updated={updated}, total={len(fc)}")

if __name__ == "__main__":
    main()
