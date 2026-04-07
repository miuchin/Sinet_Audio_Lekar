# SINET Audio Lekar Runtime Patch v16.0.0.118.40.11

## Fokus
Integrativni vodič (`pages/integrativni_vodic.html`) — tvrdo sažimanje za RA / M05.9 pre print sloja.

## Šta je presečeno
- uveden stroži `GUIDE_PROFILES` za `M05.9`, `M06.9`, `M13.0`
- `itemLimit` spušten na 6 za RA/poliartritis profile
- `strictRefOnly` aktivan kada postoje `dx_index` reference
- audio whitelist sužen na reprezentativni skup (`M05.9` / `M06.9`: 8 frekvencija ciljano)
- alternative se dedupliraju po naslovu metode, ne po svakoj varijanti opisa
- narodni sloj se deduplira po stvarnom sadržaju (`desc`), ne po svakoj mikrostavci
- review-first kandidati iz enciklopedije prolaze dodatni topic filter za stroge RA profile
- integrativni bundle render ide u `compact` modu
- print preview alternative više ne prikazuju prazno/`undefined` polje za `kind`

## Očekivani efekat za M05.9
- mali reprezentativni RA vodič
- sažet audio protokol
- manje rasipanja na mikrosimptome
- brojači u hero/meta delu prate sažeti skup, ne prenaduvani zbir

## Napomena
Ovo je patch fokusiran na aktivni HTML generator source. Print shell nije bio primarni cilj ovog koraka.
