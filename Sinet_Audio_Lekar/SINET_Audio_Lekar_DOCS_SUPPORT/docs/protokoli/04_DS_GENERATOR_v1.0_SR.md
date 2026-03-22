Ovo je **čitljiva HTML** verzija protokola (korak‑po‑korak). ✅

Nađi
[Otvori MD](./04_DS_GENERATOR_v1.0_SR.md)

Sadržaj

* [1) Step-by-step (osnovni tok)](#1-step-by-step-osnovni-tok)
* [2) Polje-po-polje (šta znači, kako popuniti)](#2-polje-po-polje-sta-znaci-kako-popuniti)

+ [A) Glavna tema / cilj](#a-glavna-tema-cilj)
+ [B) Kontekst / stanje](#b-kontekst-stanje)
+ [C) Ograničenja](#c-ogranicenja)
+ [D) Izbor izlaza](#d-izbor-izlaza)

* [3) Izvoz (Template v2)](#3-izvoz-template-v2)
* [4) Istorija (lokalno)](#4-istorija-lokalno)
* [5) Tipični protokoli](#5-tipicni-protokoli)

+ [“Hoću vodič za štampu”](#hocu-vodic-za-stampu)
+ [“Hoću da uđe u SINET kao terapija”](#hocu-da-udje-u-sinet-kao-terapija)

* [6) Troubleshooting](#6-troubleshooting)



# SINET — PROTOKOL: DS-Generator (v1.0, SR)

**Uloga DS-Generatora:** da napravi strukturisan vodič (tekstualno) i da po potrebi kreira protokol koji SINET može odmah da pusti.

> ð§­ **Brzi smisao modula:** DS-Generator pravi Äitljiv vodiÄ i, po potrebi, bridge ka SINET terapiji. Koristi ga kada Å¾eliÅ¡ strukturisan plan, a ne samo jednu izdvojenu stavku.

---

## 1) Step-by-step (osnovni tok)

1. Otvori **DS-Generator**
2. Popuni polja (redom) — vidi “Polje-po-polje”
3. Klikni **Generiši**
4. Pregledaj rezultat
5. Izaberi izvoz:

* TXT / MD / HTML (Template v2)

1. Ako želiš da rezultat postane terapija:

* klikni bridge dugme (kreira `SINET_DS_BRIDGE`) i ubaci u SINET

---

## 2) Polje-po-polje (šta znači, kako popuniti)

> Napomena: nazivi polja mogu blago varirati po verziji, ali redosled logike je isti.

### A) Glavna tema / cilj

* **Šta unosiš:** “šta želiš da dobiješ” (npr. “plan oporavka posle stresa”)
* **Kako:** 1 rečenica, bez romana

### B) Kontekst / stanje

* **Šta unosiš:** ključne informacije (npr. “nesanica 3 dana, nervoza”)
* **Kako:** kratko + konkretno

### C) Ograničenja

* alergije, vreme, oprema, dnevni raspored (ako je relevantno)

### D) Izbor izlaza

* vodič samo tekst / vodič + protokol (ako opcija postoji)

---

## 3) Izvoz (Template v2)

Kada klikneš **HTML**, dobijaš:

* topbar (Nazad / TXT / MD / HTML / Štampa / E-mail)
* **📋 Kopiraj kompletan plan** (HTML + plain tekst)
* ko-autorstvo

---

## 4) Istorija (lokalno)

DS-Generator čuva istoriju lokalno u browseru.

* koristi istoriju da vratiš stari vodič
* napravi Backup da ne izgubiš istoriju

---

## 5) Tipični protokoli

### “Hoću vodič za štampu”

1) Generiši → 2) HTML export → 3) Štampa

### “Hoću da uđe u SINET kao terapija”

1) Generiši → 2) Bridge → 3) Ubaci u protokol/listu → 4) ▶

---

## 6) Troubleshooting

* **Ne pamti istoriju** → browser briše storage; koristi PWA i isključi auto-clear
* **Bridge ne radi** → osveži (Ctrl+F5) + proveri da si na istoj verziji (SW)