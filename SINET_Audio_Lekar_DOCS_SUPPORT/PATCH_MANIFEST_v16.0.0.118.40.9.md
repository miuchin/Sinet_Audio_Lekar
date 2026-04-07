# PATCH MANIFEST — v16.0.0.118.40.9

## Tema
Catalog Polish Phase 1 / Generator Print Sync / Audio Normalization

## Izmenjeni fajlovi
- `SINET_VERSION_ACTIVE.txt`
- `index.html`
- `index-nosw.html`
- `service-worker.js`
- `atlas.html`
- `anamneza.html`
- `katalog-book.html`
- `js/app.js`
- `js/audio/audio-engine.js`
- `js/audio/ios-rendered-track.js`
- `js/sinet-symptom-card.js`
- `pages/integrativni_vodic.html`
- `pages/area-print.html`
- `pages/anamneza-print.html`
- `pages/symptom-print-card.html`
- `scripts/catalog_polish_audit.py`
- `SINET_Audio_Lekar_DOCS_SUPPORT/CATALOG_POLISH_AUDIT_v16.0.0.118.40.9.md`

## Šta je urađeno
1. **Integrativni vodič (generator)**
   - dodat MKB-10 blok sa šifrom, nazivom i opisom
   - dodat blok opisa simptoma / teme vodiča
   - frekvencije se izvoze sa opisom i izvorom
   - alternativne metode se izvoze sa opisom i evidence oznakom
   - HTML/MD/TXT izlaz je bliže SINET print standardu

2. **Audio polish**
   - jači default master gain
   - ujednačenija loudness normalizacija
   - sve frekvencije ispod **120 Hz** koriste **noseći 200 Hz**
   - iOS rendered track koristi isti prag i isti carrier bed

3. **Audit kataloga**
   - dodat report i skripta za bezbednu proveru popunjenosti kataloga
   - potvrđeno: opis/MKB/frekvencije/alternative/preporuka su popunjeni
   - otvoren sloj: narodne metode nisu još direktno mapirane po stavkama
