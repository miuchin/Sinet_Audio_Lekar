# PATCH MANIFEST — ACTIVE v16.0.0.118.40.10 — generator polish Phase 4

## Fokus
Vizuelno usaglašavanje **Integrativnog vodiča (generator)** sa SINET print/export standardom, bez diranja drugih delova aplikacije.

## Menjan fajl
- `pages/integrativni_vodic.html`

## Šta je dorađeno
- uvodna **hero/meta kartica** bliža SINET kartici simptoma
- kompaktniji **meta pregled**: MKB, broj stavki, frekvencije/alternative, narodni sloj
- jasniji **section kicker** markeri po glavnim blokovima
- sekcije pretvorene u ujednačenije **section-card** blokove
- dodata **print optimizacija**:
  - A4 portrait margine
  - manji print font
  - izbegavanje ružnih page-break preloma unutar kartica i blokova
  - konzistentniji grid za print
- markdown quick overview usklađen sa novom uvodnom meta karticom

## Šta NIJE dirano
- aktivna runtime verzija ostaje **v16.0.0.118.40.10**
- Atlas / Katalog navigacija
- audio engine
- server / LAN sloj
- sadržaj kataloga i bridge data fix

## Očekivanje za proveru
U Integrativnom vodiču treba da se vidi:
- jača uvodna kartica
- pregledniji meta blok na vrhu
- sekcije 1 / 2 / 3 / 4 / 4b / 4c / 5 u ujednačenijem formatu
- lepši i stabilniji print/export raspored
