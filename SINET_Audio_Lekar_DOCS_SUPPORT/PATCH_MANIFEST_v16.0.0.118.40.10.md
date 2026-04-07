# SINET Audio Lekar — PATCH manifest v16.0.0.118.40.10

## Tema
Katalog polish — Phase 2 (narodni sloj + usaglašeniji generator/export)

## Šta je promenjeno
- `pages/integrativni_vodic.html`
  - dodat blok **Narodni lekovi i kućni koraci**
  - prikazuju se praktični narodni saveti iz odabranih SINET stavki
  - dodati su review-first kandidati iz `data/narodne_metode/enciklopedija/sinet_ready_katalog.json`
  - badge/meta sloj sada nosi i broj narodnih unosa
  - JSON SharePack sada nosi i folkMethods meta sloj
- `js/app.js`
  - u modalu i STL/export toku preferira se `holisticki.saveti.narodno` pre generičkog `holisticki.narodni_lek.opis`
- verzija zaključana na `v16.0.0.118.40.10`

## Namerno nije dirano
- server / mreža / LAN sloj
- Atlas / Katalog navigacija
- osnovni audio engine osim version-lock usaglašavanja
- masovno prepisivanje svih katalog unosa

## Audit dokumenti
- `SINET_Audio_Lekar_DOCS_SUPPORT/NARODNI_SLOJ_AUDIT_v16.0.0.118.40.10.md`

## Cilj
Bezbedno poliranje postojećeg sadržaja, bez kvarenja drugih delova aplikacije.
