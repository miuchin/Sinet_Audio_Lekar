#!/usr/bin/env bash
set -euo pipefail
python3 tools/generate_dx_index_from_catalog.py --catalog "data/SINET_STL.json" --mkb "data/mkb10_sr.json" --out "data/sinet_dx_index.json" --add-parent --max-refs 24
