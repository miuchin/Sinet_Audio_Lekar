# PATCH NOTE — LAB / BookPro visible module + browser-visible version sync

## Verzija
v16.0.0.118.40.13

## Šta je ispravljeno
- Vidljiv naziv modula više nije ostao skriven iza starog naziva `LAB Bridge`.
- U glavnom meniju kartica sada piše `🧪 LAB / BookPro izveštaji`.
- U hamburger meniju stavka sada piše `🧪 LAB / BookPro izveštaji`.
- Na početnom ekranu dodat je poseban info-card:
  - `NOVI POSEBAN MODUL`
  - `🧪 LAB / BookPro izveštaji`
  - 4 koraka: učitaj/slikaj → analiziraj → HTML report → print/export
- Workflow tekstovi su usklađeni sa novim nazivom modula.

## Browser / cache sync
- Podignuta je verzija u:
  - `index.html`
  - `index-nosw.html`
  - `service-worker.js`
  - `js/app.js`
  - `SINET_VERSION_ACTIVE.txt`
- Cilj je da korisnik odmah vidi šta je stvarno učitano u browser.

## Napomena
Ako browser i dalje drži staru verziju, otvoriti `index-nosw.html` ili uraditi reload koji čisti cache/service worker.
