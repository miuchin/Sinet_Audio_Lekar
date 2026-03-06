# Enciklopedija narodnih metoda lečenja — import (review-first)

Ovaj dataset je **prestrukturisan** radi lakšeg pregleda i eventualnog uvođenja u SINET kao **informativni sloj**.

## Bezbednost / politika
- Ne tretirati kao medicinski savet.
- Svaku stavku treba pregledati: postoji rizik od nebezbednih saveta (alkohol, insekti, agresivne supstance, sl.).
- U SINET-u ovo ide kao: **Narodne metode (informativno)** + jasna upozorenja.

## Fajlovi
- `sinet_ready_katalog.json` — već grupisan katalog (tegobe, biljke/namirnice, protokoli, opšti saveti)
- `review_candidates.json` — stavke koje traže dodatni review/oprez
- `structured.json` — detaljnije strukturisan sadržaj


- `sinet_paprikas_split.json` - konzervativna procena po lane-u: SINET review-first vs Paprikas kandidat
- `paprikas_hub_candidates.json` - Paprikas kandidati (direktni + posle review-a)
- `sinet_review_priority.json` - SINET red za ručni / review-first pregled
