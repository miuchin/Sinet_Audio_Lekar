# SINET Audio Lekar — ACTIVE 40.10 compat pages/data patch

Ovaj patch je namenjen aktivnom runtime-u koji korisnik trenutno vidi kao v16.0.0.118.40.10.

## Cilj
- uklanjanje 404 gresaka iz /pages/integrativni_vodic.html i drugih /pages/ ekrana
- bez menjanja aktivne verzije u UI
- bez diranja Atlas/Katalog/audio engine

## Dodato
- `pages/data/bridge/health_tag_catalog_v1.json`
- `pages/data/bridge/condition_to_health_tags_v1.json`
- `pages/data/mkb10_sr.json`

## Logika
Stari shared moduli u /pages/ kontekstu traze ./data/... i browser to razresi kao /pages/data/.... Ovim patch-em se dodaje kompatibilni mirror tih podataka kako bi aktivni 40.10 runtime radio bez 404 suma.
