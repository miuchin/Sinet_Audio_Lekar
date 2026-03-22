#!/usr/bin/env bash
set -euo pipefail

PDF_PATH="${1:-}"
OUT_PATH="${2:-data/mkb10_sr.json}"

if [[ -z "$PDF_PATH" ]]; then
  echo "Usage: tools/extract_mkb10_from_pdf.sh /path/to/mkb10.pdf [data/mkb10_sr.json]"
  exit 1
fi

python3 tools/extract_mkb10_from_pdf.py --pdf "$PDF_PATH" --out "$OUT_PATH"
