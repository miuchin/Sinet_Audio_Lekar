# SINET Audio Lekar — Patch Manifest v16.0.0.118.40.6

## Fokus ovog patch-a
- Print/Layout sanacija za **Oblasti**
- Print/Layout sanacija za **Oblasti + Simptomi**
- Gusti refactor za **karticu simptoma**
- Zaključavanje verzije na **v16.0.0.118.40.6** kroz print/export lanac

## Urađeno

### 1. Oblasti
- ekran i print sada imaju jasnije razdvojen režim
- **Oblasti** koriste zbijen 3-kolonski pregled
- kartice oblasti su sabijene i preglednije
- meta red je sažetiji i ujednačen

### 2. Oblasti + Simptomi
- svaka oblast u print modu kreće na novoj strani
- simptomi su u **2 kolone**
- pregled na ekranu je takođe jasnije dvokolonski
- poboljšan “book” raspored i zbijen spacing

### 3. Kartica simptoma
- uklonjena je glavna duplikacija opisa između blokova
- raspored više nije jedna dugačka kolona po sekcijama
- frekvencije i alternative su prebačene u gušći grid raspored
- header i meta sloj su skraćeni i sabijeni
- print kartica je bliža traženom “Nutri” principu: više manjih blokova, manje praznog prostora

### 4. Version lock
Patch podiže print/export sloj na:
- `index.html`
- `index-nosw.html`
- `service-worker.js`
- `anamneza.html`
- `atlas.html`
- `katalog-book.html`
- `pages/area-print.html`
- `pages/anamneza-print.html`
- `pages/symptom-print-card.html`
- `js/app.js`
- `js/sinet-area-export.js`
- `js/sinet-anamneza-export.js`
- `js/sinet-symptom-card.js`
- `SINET_VERSION_ACTIVE.txt`

## Napomena
Ovaj patch je fokusiran na **layout/print tok**. Nije urađena nova funkcionalnost za mobilni background audio u ovom koraku.
