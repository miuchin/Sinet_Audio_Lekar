# SINET Prompt — Sakupljanje još 2500 novih simptoma  
## Verzija: v1.0  
## Režim: FILE ONLY / JSON ONLY / 10x250  
## Cilj: premašiti 10.000 simptoma u katalogu

Radi se nastavak proširenja SINET Audio Lekar kataloga, **tačno istim metodom kao u prethodnom uspešnom ciklusu**.

---

# 1. GLAVNI CILJ

Potrebno je sakupiti **još 2500 novih simptoma** tako da ukupan katalog pređe **10.000 simptoma**.

Polazimo od činjenice da je trenutno stabilni runtime/data sloj već proširen na:

- **7633 simptoma**

Zato novi cilj glasi:

- **7633 + 2500 = 10133 simptoma**

---

# 2. NAČIN RADA — RADIMO BAŠ KAO U PRETHODNOM USPEŠNOM CIKLUSU

Radi se **u 10 serija po 250 simptoma**.

Dakle:

- Batch 01 = 250 simptoma
- Batch 02 = 250 simptoma
- Batch 03 = 250 simptoma
- Batch 04 = 250 simptoma
- Batch 05 = 250 simptoma
- Batch 06 = 250 simptoma
- Batch 07 = 250 simptoma
- Batch 08 = 250 simptoma
- Batch 09 = 250 simptoma
- Batch 10 = 250 simptoma

Ukupno:

- **2500 novih simptoma**

---

# 3. NAJVAŽNIJE PRAVILO

## RADIMO IDENTIČNO KAO U PRETHODNOM CIKLUSU

To znači:

1. prvo se **sakupljaju novi simptomi**
2. radi se **stroga deduplikacija**
3. isporučuje se **jedan čist JSON fajl po batch-u**
4. **bez razgovora u rezultatu**
5. **bez modala**
6. **bez markdown omota**
7. **bez objašnjenja u izlazu**
8. tek kasnije, u sledećoj fazi, radi se:
   - MKB-10
   - frekvencije
   - opis frekvencija
   - preporuke
   - alternativne metode
   - STL poravnanje
   - merge u katalog

Drugim rečima:

## FAZA A = samo sakupljanje novih simptoma  
## FAZA B = enrichment i protokoli

U ovoj fazi radimo samo **FAZU A**.

---

# 4. SOURCE OF TRUTH

## Source of Truth za sadržaj

Source of Truth za proveru duplikata i novine je:

- postojeći čisti katalog simptoma koji je trenutno u radu
- aktuelni runtime katalog
- svi prethodno prihvaćeni batch-evi iz ovog ciklusa

Ako postoji bilo kakva sumnja da je neki simptom već postojao ranije, ili da je previše sličan već postojećem unosu, **takav unos treba izbaciti i zameniti drugim**.

---

# 5. STROGA DEDUPE PRAVILA

Svaki novi batch mora biti očišćen od:

## A. exact duplikata
- potpuno isti naziv simptoma već postoji u katalogu

## B. trivijalnih jezičkih varijacija
Primeri:
- isti smisao, samo promenjen red reči
- isto značenje sa malom gramatičkom promenom
- jednina/množina bez stvarne razlike
- blaža/stilska parafraza bez nove kliničke vrednosti

## C. prevelike semantičke sličnosti
Ako je novi kandidat praktično isto što i postojeći simptom, samo malo drugačije napisan, treba ga odbaciti.

Cilj nije da bude „novo samo po formulaciji“, nego da bude:

- stvarno novo
- korisno
- prepoznatljivo
- praktično za korisnika

---

# 6. KAKVE SIMPTOME TRAŽIMO

Traže se:

- funkcionalni simptomi
- subjektivne smetnje
- situacione tegobe
- obrasci pogoršanja
- senzacije i doživljaji tela
- simptomi vezani za svakodnevne situacije
- simptomi koji korisnik realno može da prepozna i pretraži

Poželjni su simptomi iz oblasti:

- glava
- vrat
- oči
- uši
- nos
- sinusi
- grlo
- disanje
- srce i cirkulacija
- stomak i varenje
- jetra i žuč
- creva i stolica
- koža
- kosa
- nokti
- termoregulacija
- znojenje
- kosti i zglobovi
- mišići
- leđa
- karlica
- mokraćni sistem
- žensko zdravlje
- muško zdravlje
- hormonski disbalansi
- san
- energija
- slabost
- umor
- ravnoteža
- neurološke senzacije
- senzorne smetnje
- simptomi kod dece
- simptomi kod starijih
- oporavak nakon bolesti
- funkcionalne i svakodnevne smetnje

---

# 7. KAKVE SIMPTOME NE TREBA GENERISATI

Ne generisati:

- očigledne duplikate
- generičke i prazne nazive bez praktične vrednosti
- preširoke nazive koji nisu stvarni simptomi
- čiste dijagnoze bez simptomskog oblika
- previše stručne nazive koje prosečan korisnik ne bi tražio
- iste simptome u nekoliko skoro identičnih verzija
- veštački napumpane varijante samo radi broja

---

# 8. FORMAT IZLAZA

Za svaki batch isporučiti **isključivo jedan JSON fajl**.

Naziv fajla:

- `SINET_Novi_Simptomi_Batch_01.json`
- `SINET_Novi_Simptomi_Batch_02.json`
- ...
- `SINET_Novi_Simptomi_Batch_10.json`

Svaki fajl mora sadržati **tačno 250 stavki**.

---

# 9. OBAVEZNA JSON ŠEMA

Svaka stavka mora imati ovu strukturu:

```json
{
  "oblast": "",
  "simptom": "",
  "opis": "",
  "mkb10": "",
  "frekvencije": []
}
```

---

# 10. PRAVILA ZA POLJA

## `oblast`
- kratka i smislena oblast kojoj simptom pripada

## `simptom`
- jasan naziv simptoma
- praktičan za pretragu
- razumljiv korisniku

## `opis`
- 1 do 3 rečenice
- jasno opisuje kako se simptom ispoljava
- bez nepotrebnog razvlačenja
- bez medicinskog eseja

## `mkb10`
U ovoj fazi ostaje:

```json
""
```

## `frekvencije`
U ovoj fazi ostaje:

```json
[]
```

Jer enrichment dolazi kasnije, u posebnom koraku.

---

# 11. REDOSLED RADA PO BATCH-EVIMA

Radi se ovako:

1. generiši 250 kandidata
2. proveri exact duplikate prema postojećem katalogu
3. proveri bliske/trivijalne duplikate
4. proveri da nema unutrašnjih duplikata unutar batch-a
5. proveri da nema preklapanja sa prethodno prihvaćenim batch-evima iz ove iste serije
6. zameni sve sumnjive unose
7. isporuči čist JSON fajl

---

# 12. POSEBNO NAGLASITI

Svaki sledeći batch mora biti nov u odnosu na:

- osnovni postojeći katalog
- sve ranije prihvaćene batch-eve iz ove serije

Primer:

- Batch 05 mora biti očišćen i od kataloga i od Batch 01–04
- Batch 10 mora biti očišćen i od kataloga i od Batch 01–09

---

# 13. KVALITET JE VAŽNIJI OD SILA BROJA

Ne popunjavati broj po svaku cenu ako je unos slab, suvišan ili skoro isti kao postojeći.

Bolje je:
- manje trivijalnosti
- više stvarno novih i korisnih simptoma

Ali cilj ostaje da svaki batch na kraju ipak bude doveden do **punih 250 kvalitetnih stavki**.

---

# 14. TEMATSKI PRISTUP JE DOZVOLJEN I POŽELJAN

Kao i u prethodnom ciklusu, batch može biti organizovan tematski, na primer:

- Batch 01: ORL / respiratorni / sinusi
- Batch 02: varenje / stolica / žuč / apetit
- Batch 03: kosti / mišići / zglobovi / leđa
- Batch 04: oči / uši / ravnoteža / senzacije
- Batch 05: energija / san / umor / neurofunkcionalno
- Batch 06: koža / kosa / nokti / znojenje / termoregulacija
- Batch 07: urinarno / karlica / hormonsko / žensko-muško zdravlje
- Batch 08: cirkulacija / pritisak / srce / hladnoća / slabost
- Batch 09: funkcionalne svakodnevne smetnje / oporavak / senzorne tegobe
- Batch 10: deca / seniori / situacioni i posebni obrasci

Ovo nije strogo obavezno, ali je poželjno jer daje bolji kvalitet i lakšu kontrolu duplikata.

---

# 15. ZABRANA NARATIVNOG IZLAZA

Ne isporučivati:

- uvode
- objašnjenja
- komentare
- sažetke
- analize
- razgovor
- markdown tekst oko rezultata

Isporuka mora biti samo:

## jedan gotov JSON fajl po batch-u

---

# 16. KADA SE ZAVRŠI OVIH 2500

Tek po završetku svih 10 batch-eva po 250 prelazi se na sledeću fazu:

- popunjavanje MKB-10
- mapiranje frekvencijskih porodica
- dodavanje frekvencija sa opisima
- preporuke
- alternativne metode
- STL sloj
- merge u runtime katalog
- Book poravnanje
- finalni stabilni ZIP

Dakle:

## sada ne enrichment  
## sada samo sakupljanje novih simptoma

---

# 17. GLAVNA RADNA KOMANDA

Radi identično kao u prethodnom uspešnom ciklusu:

- sakupljaj 2500 novih simptoma
- u serijama po 250
- strogo deduplikovano
- praktično i korisnički prepoznatljivo
- JSON only
- file only
- bez chat objašnjenja u izlazu
- svaki sledeći batch mora biti nov i u odnosu na katalog i u odnosu na sve prethodno prihvaćene batch-eve

---

# 18. PRVA ISPORUKA

Počni od:

## `SINET_Novi_Simptomi_Batch_01.json`

sa tačno:

- **250 novih simptoma**

u obaveznoj JSON šemi:

```json
{
  "oblast": "",
  "simptom": "",
  "opis": "",
  "mkb10": "",
  "frekvencije": []
}
```

i radi dalje istim redom do:

## `SINET_Novi_Simptomi_Batch_10.json`

---

# 19. KRATKA OPERATIVNA NAPOMENA

Ovaj prompt je namenski napravljen da se radi **baš kao u ovom chat-u**:

- prvo prikupljanje čistih novih simptoma
- zatim kasnije enrichment
- zatim merge
- zatim Book poravnanje
- zatim finalni stabilni ZIP

To je obavezni redosled rada.
