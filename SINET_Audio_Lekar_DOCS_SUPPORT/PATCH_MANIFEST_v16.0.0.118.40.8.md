# PATCH MANIFEST v16.0.0.118.40.8

## Šta je popravljeno

- Atlas → Katalog prelaz više ne vraća korisnika na početnu niti pravi vidljiv „bljesak" početne strane pri otvaranju detalja iz Atlasa.
- običan klik u Atlasu ostaje u Atlasu, a eksplicitni prelaz u aplikaciju sada ide na `index.html#catalog`
- `index.html` i `index-nosw.html` dobijaju rani pre-nav hint (`window.__SINET_PRE_NAV_PAGE`) i CSS preselection da se Katalog prikaže odmah kada postoji Atlas bridge
- URL nav apply je pomeren na `DOMContentLoaded` + brži `load` fallback
- `app.js` koristi pre-nav page kao početni page i brže aktivira katalog u bridge toku

## Verzija

- aktivna verzija: `v16.0.0.118.40.8`
