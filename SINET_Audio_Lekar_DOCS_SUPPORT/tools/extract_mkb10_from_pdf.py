#!/usr/bin/env python3
"""Extract a compact MKB-10 (ICD-10) code list from a user-provided PDF.

Why:
- Keep the app fast (JSON instead of PDF).
- Avoid bundling potentially copyrighted translated text in public repos.

Output format:
{
  "meta": {...},
  "entries": [ {"code": "A00.0", "title": "..."}, ... ]
}

Notes:
- This script uses `pdftotext` (poppler). Install it on your system.
- Some PDFs use embedded fonts; characters may come out with placeholders.
  We apply a small normalization map that works for common legacy Serbian Latin PDFs.

Usage:
  python3 tools/extract_mkb10_from_pdf.py --pdf /path/to/mkb10.pdf --out data/mkb10_sr.json

"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple


CODE_INLINE_RE = re.compile(r'^([A-Z][0-9]{2}\.[0-9A-Z]{1,2}[*+]?)\s+(.+)$')
CODE_ONLY_RE   = re.compile(r'^([A-Z][0-9]{2}\.[0-9A-Z]{1,2}[*+]?)$')
BOUNDARY_RE    = re.compile(r'^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?[*+]?(?:\s+|$)')
ICD9_RE        = re.compile(r'^\d{3}(?:\.\d)?$')


def _fix_encoding(s: str) -> str:
    # Legacy placeholders often seen in older Serbian Latin PDFs
    s = s.replace('Ð', 'Đ')
    s = s.replace('~', 'č').replace('^', 'č')
    s = s.replace('{', 'š').replace('}', 'ć')
    s = s.replace('`', 'ž')
    s = s.replace('|', 'I')
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def _title_score(t: str) -> float:
    letters = [ch for ch in t if ch.isalpha()]
    if not letters:
        return 0.0
    lower = sum(ch.islower() for ch in letters)
    return lower / len(letters)


def _shorten_title(t: str) -> str:
    # Cut off common long notes
    cuts = [' Ukljuc', ' Iskljuc', ' Kod šifara', ' Kod šifra', ' Morfologija', ' M8000/']
    for c in cuts:
        idx = t.find(c)
        if idx != -1 and idx > 20:
            t = t[:idx].strip()
            break
    if len(t) > 800:
        m = re.search(r'[.]\s', t)
        if m and m.start() > 20:
            t = t[: m.start() + 1].strip()
        else:
            t = t[:240].rstrip()
    return t


def _run_pdftotext(pdf: Path) -> List[str]:
    try:
        # Use stdout to avoid temp files.
        p = subprocess.run(
            ['pdftotext', str(pdf), '-'],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace',
        )
    except FileNotFoundError:
        raise SystemExit('ERROR: pdftotext not found. Install poppler-utils / poppler.')
    except subprocess.CalledProcessError as e:
        # Some PDFs print warnings but still output. Try to proceed if we have stdout.
        if e.stdout:
            return e.stdout.splitlines()
        msg = e.stderr.strip() if e.stderr else str(e)
        raise SystemExit(f'ERROR: pdftotext failed: {msg}')

    return p.stdout.splitlines()


def extract_dot_codes(lines: List[str]) -> Dict[str, str]:
    """Extract ICD-like dot codes (e.g. A00.0) with titles.

    This intentionally focuses on dot-codes because they are far less ambiguous than
    other classification systems present in mixed medical PDFs.
    """

    raw_entries: List[Tuple[str, str]] = []

    i = 0
    while i < len(lines):
        s = lines[i].strip().replace('\ufeff', '')
        m = CODE_INLINE_RE.match(s)
        m2 = CODE_ONLY_RE.match(s)

        if m or m2:
            code = (m.group(1) if m else m2.group(1)).strip()
            parts: List[str] = []
            if m:
                parts.append(m.group(2).strip())

            j = i + 1
            while j < len(lines):
                t = lines[j].strip()
                if t == '':
                    j += 1
                    continue

                if BOUNDARY_RE.match(t):
                    break

                t = t.replace('\x0c', '').strip()
                if not t:
                    j += 1
                    continue

                # Drop ICD-9 crosswalk numbers that are printed as separate lines.
                if ICD9_RE.match(t):
                    j += 1
                    continue

                parts.append(t)
                j += 1

            title = re.sub(r'\s+', ' ', ' '.join(parts)).strip()
            raw_entries.append((code, title))
            i = j
        else:
            i += 1

    # choose best title per code
    best: Dict[str, str] = {}
    for code, title in raw_entries:
        t = _fix_encoding(title)
        if not t:
            continue

        prev = best.get(code)
        if prev is None:
            best[code] = t
            continue

        if _title_score(t) > _title_score(prev) + 1e-6:
            best[code] = t
        elif abs(_title_score(t) - _title_score(prev)) < 1e-6 and len(t) < len(prev):
            best[code] = t

    # shorten long titles
    best = {c: _shorten_title(t) for c, t in best.items()}

    return best


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', required=True, help='Path to the PDF containing MKB-10 / ICD-10 list')
    ap.add_argument('--out', required=True, help='Output JSON path (e.g. data/mkb10_sr.json)')
    ap.add_argument('--source-note', default='user-provided PDF', help='Metadata note for the output')
    args = ap.parse_args()

    pdf = Path(args.pdf).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()

    if not pdf.exists():
        raise SystemExit(f'ERROR: PDF not found: {pdf}')

    lines = _run_pdftotext(pdf)
    best = extract_dot_codes(lines)

    entries = [{"code": c, "title": best[c]} for c in sorted(best.keys())]

    out.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "meta": {
            "generated": _dt.date.today().isoformat(),
            "source": str(pdf.name),
            "note": args.source_note,
            "warning": "This may include copyrighted translated text. Keep private unless you have rights to redistribute.",
            "format": "mkb10_sr.v1",
        },
        "entries": entries,
    }

    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'OK: wrote {len(entries)} entries to {out}')


if __name__ == '__main__':
    main()
