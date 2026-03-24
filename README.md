# SINET Audio Lekar

**Verzija:** v16.0.0.118.31  
**Status:** stabilna radna verzija za deljenje, testiranje i dalje dopune kataloga.

## Šta je ovo
SINET Audio Lekar je mobilno prilagođena web/PWA aplikacija za rad sa simptomima, frekvencijama, ličnim listama, favoritima, protokolima i pomoćnim modulima. Aplikacija je organizovana tako da korisnik brzo dođe do simptoma, otvori detalj, pokrene rad i sačuva lične izbore.

## Glavne mogućnosti
- **Početna** sa jasnim ulazom u rad
- **Katalog simptoma** sa pretragom i filtrima
- **Puni katalog** kao kompaktna listing lista, pogodna za mobilni
- **Atlas simptoma** kao brz pregled po oblastima
- **Detalj simptoma** sa akcijama: Pusti, U listu, Favorit, Moje, Protokol, AI
- **Moji simptomi** za dopune i lične stavke
- **Favoriti** za brz pristup
- **Lista / Queue** za radni redosled
- **Protokoli** za ponovljive rutine
- **AI / Studio tok** za dopunu kataloga NDJSON batch-evima
- **Prikaz verzije** na Početnoj strani

## Šta je novo u ovoj stabilnoj fazi
- dodat **Puni katalog** sa KPI brojevima
- dodat **Atlas simptoma** kao zaseban ekran
- uveden **kompaktni listing** za Puni katalog / samo sa frekvencijama / samo sa MKB-10
- uklonjena dupla Favorit akcija
- uveden fallback tako da **Favoriti** rade i kada lokalna DB kasni

## Brzi start
### Lokalno
Otvorite aplikaciju preko lokalnog servera, na primer:
- `http://localhost:8010/index.html`

### GitHub / Netlify
1. Otpakujte runtime paket projekta.
2. Postavite sadržaj projekta na GitHub repozitorijum.
3. Na Netlify povežite repozitorijum ili uradite ručni deploy.
4. Za statički deploy pazite da svi fajlovi ostanu u istoj strukturi foldera.

## Preporučena struktura za GitHub
- `index.html`
- `atlas.html`
- `admin.html`
- `anamneza.html`
- `js/`
- `data/`
- `docs/` i/ili `SINET_Audio_Lekar_DOCS_SUPPORT/`
- `style.css`
- `manifest.json`
- `service-worker.js`
- `netlify.toml`
- `README.md`

## Napomena o browser storage
Korisnički podaci se primarno čuvaju lokalno u browseru. Ako browser privremeno ne otvori IndexedDB na vreme, aplikacija koristi zaštitne fallback mehanizme za rad. Za ozbiljniju upotrebu preporuka je redovan **Backup / Restore** tok.

## Preporučeno pre deljenja prijateljima
- proveriti osnovni rad na mobilnom telefonu
- proveriti Početnu, Katalog, Atlas i Favorit
- uraditi jedan testni backup
- proveriti da se prikazuje tačan broj verzije

## Važna napomena
SINET Audio Lekar je informativno-organizacioni alat. Nije medicinski uređaj, ne postavlja dijagnozu i ne zamenjuje lekara, hitnu pomoć, terapiju niti laboratorijsku obradu.

## Sledeća faza razvoja
Sledeći prirodan korak je **dopuna kataloga za novih 2000 simptoma** u serijama od po 200, kroz Studio / AI NDJSON tok.
