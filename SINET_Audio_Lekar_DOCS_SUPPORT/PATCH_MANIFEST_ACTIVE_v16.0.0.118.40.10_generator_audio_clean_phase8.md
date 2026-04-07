# PATCH MANIFEST — ACTIVE v16.0.0.118.40.10 — Generator Audio Clean Phase 8

## Cilj
Smanjenje broja frekvencija u Integrativnom vodiču za reumatološke MKB teme (M05.9, M06.9, M13.0) tako da clean print i SharePack ne vuku cele derivatne serije i sporedne varijante.

## Izmena
Menjan je samo fajl:
- `pages/integrativni_vodic.html`

## Šta je urađeno
- uveden je `GUIDE_AUDIO_WHITELISTS` za:
  - `M05.9`
  - `M06.9`
  - `M13.0`
- generator sada iz svih odabranih stavki sklapa **sažeti audio protokol** umesto punog zbira frekvencija
- za RA/poliartritis clean print i SharePack sada favorizuju samo glavne frekvencije:
  - 5, 10, 20, 40, 55, 72, 95, 110, 174, 220, 285, 432 Hz
  - za M13.0 bez 5 Hz
- derivatne/bliske serije kao npr. 57.75 / 60.5 / 63.25 / 66 / 68.75 / 71.5 Hz više se ne guraju u clean print vodič
- `buildSharePack()` sada koristi isti očišćeni protokol kao i print/report, da sadržaj bude usklađen

## Očekivani efekat za M05.9
Umesto ~88 frekvencija, clean print vodič treba da padne na približno **12 glavnih frekvencija** i da bude znatno reprezentativniji za RA.

## Napomena
Ovaj patch ne dira:
- Atlas/Katalog navigaciju
- audio engine reprodukcije izvan generator vodiča
- globalnu verziju aplikacije
