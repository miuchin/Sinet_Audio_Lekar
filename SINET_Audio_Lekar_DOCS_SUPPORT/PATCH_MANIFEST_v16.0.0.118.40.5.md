# PATCH MANIFEST v16.0.0.118.40.5

## Šta je ispravljeno

1. **Integrativni vodič (generator)**
   - popravljen je JavaScript syntax error u `pages/integrativni_vodic.html`
   - uzrok je bio literal `</script>` unutar template string fallback HTML-a
   - zbog toga je browser prerano zatvarao `<script>` blok i ostatak koda nije bio izvršen

2. **iPhone / Safari pozadinski zvuk**
   - ojačan iOS PRO rendered `<audio>` tok
   - hidden audio elementi više nisu `display:none`, nego off-screen / tiny / near-transparent, što je pouzdanije na novijim iOS/Safari buildovima
   - dodat `webkit-playsinline`
   - dodat `load() + wait for ready state` pre seek/play za rendered blob track
   - keeper se ponovo eksplicitno aktivira pred `el.play()`

3. **Version/cache sync**
   - bundle podignut na `v16.0.0.118.40.5`
   - osveženi su `index.html`, `index-nosw.html`, `service-worker.js`, print/export stranice i glavni `app.js` query stringovi

## Ključni fajlovi
- `pages/integrativni_vodic.html`
- `js/app.js`
- `index.html`
- `index-nosw.html`
- `service-worker.js`
- `pages/area-print.html`
- `pages/anamneza-print.html`
- `pages/symptom-print-card.html`
- `js/sinet-symptom-card.js`

## Preporučen test
1. Raspakuj preko runtime root foldera.
2. Otvori `index-nosw.html` i proveri da se vidi `v16.0.0.118.40.5`.
3. Otvori **Integrativni vodič (generator)** i proveri da više nema SyntaxError u F12.
4. Na iPhone: tapni `🔊 AKTIVIRAJ`, zatim `🍏 iPhone MODE`, pa pusti jednu kraću terapiju 10–20 min i testiraj lock-screen.
5. Ako radi, probaj i duži test 40 min.
