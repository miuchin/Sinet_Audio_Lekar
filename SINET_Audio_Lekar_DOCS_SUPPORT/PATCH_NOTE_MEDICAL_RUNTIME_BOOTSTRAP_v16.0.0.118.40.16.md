# PATCH NOTE — Medical Runtime Bootstrap
## Verzija: v16.0.0.118.40.17

U ovom paketu su dodati:
- kanonski `data/runtime/` JSON starter fajlovi
- `js/core/id-service.js`
- `js/core/runtime-store.js`
- `js/core/audit-service.js`
- `zdravstveni_karton.html`
- `lab_bookpro.html`
- `audit_center.html`
- `backup_restore.html`
- `css/sinet-medical-runtime.css`
- početne kartice na `index.html` za novi medicinski workflow

## Namena ovog paketa
Ovo je **prvi kod-paket** za novu medicinsku runtime arhitekturu.
Cilj mu je da uvede:
- runtime bootstrap
- owner podelu po JSON fajlovima
- osnovne UI ekrane
- audit trag
- backup/restore preview logiku

## Važna napomena
U ovom koraku runtime čuva strukturisane zapise u **IndexedDB overlay** sloju.
Pravi binarni upis attachment fajlova na disk/API sloj dolazi u sledećem paketu.
