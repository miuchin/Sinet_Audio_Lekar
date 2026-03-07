# SINET Audio Lekar / SINET Audio Doctor
> **Bilingual README (Srpski + English)**  
> Javni opis projekta za GitHub, Netlify i docs/support arhivu.  
> Datum: **2026-03-07**

---

# SRPSKI

## 1) Šta je SINET Audio Lekar

**SINET Audio Lekar** je **offline-first web/PWA aplikacija** za organizaciju simptoma, frekvencijskih sesija, ličnih protokola, anamneze, zdravstvenog konteksta i pomoćnih integrativnih sadržaja.

Aplikacija je napravljena tako da bude:

- **jednostavna za korišćenje**
- **čitljiva i logična**
- **prilagođena mobilnom radu**
- **pogodna i za starije korisnike, naročito 60+**
- **bez obavezne registracije i bez obavezne cloud zavisnosti**

Važno: SINET Audio Lekar je **informativno-organizacioni alat**.  
**Nije medicinski uređaj, ne postavlja dijagnozu i ne zamenjuje lekara, hitnu pomoć, terapiju ili laboratorijsku obradu.**

---

## 2) Osnovna ideja projekta

Projekat je nastao iz potrebe da korisnik ima **jedno pregledno mesto** za:

- katalog simptoma i tema
- lokalno generisane audio frekvencije
- radne liste i protokole
- lične favorite
- anamnezu i zdravstveni kontekst
- LAB Bridge i zdravstveni karton
- backup/restore
- integrativne vodiče i pomoćne module
- dokumentaciju i jasan tok rada

Cilj nije „efekat komplikovanog sistema“, nego **miran, logičan i jasan rad**.

---

## 3) Šta aplikacija radi

### 3.1 Početni ekran
Početni ekran je namerno pojednostavljen i sadrži:

- **Posvetu** — stalno vidljivu
- **⚡ PRVA POMOĆ**
- **☰ GLAVNI MENI**

Time korisnik odmah vidi dva glavna pravca rada:

- **brz ulaz** u najvažnije alate
- **pun ulaz** u sve module

### 3.2 Glavni meni i hamburger meni
Aplikacija koristi dve navigacije sa **istim redosledom stavki**, ali sa **različitim prikazom**:

- **GLAVNI MENI** → otvara **kartice**
- **HAMBURGER MENI** → otvara **listu**

Ovo omogućava:
- istu logiku kretanja kroz aplikaciju
- različit stil prikaza, zavisno od situacije
- manje zbunjenosti za korisnika

### 3.3 Katalog simptoma i tema
Katalog je centralna baza sadržaja aplikacije i omogućava:

- pregled simptoma i tema
- pretragu i filtriranje
- otvaranje detalja
- dodavanje u listu / radnu queue
- dopunu kataloga kroz buduće patch-eve i studio alate

Katalog se projektno vodi kao **stalno rastuća baza**, a ne kao „zatvoren spisak“.

### 3.4 Moji simptomi, favoriti, protokoli i lista
Aplikacija omogućava korisniku da organizuje sopstveni rad kroz:

- **Moje simptome**
- **Moje favorite**
- **Moje protokole**
- **Listu (Queue)**

Ovo znači da korisnik ne mora svaki put da počinje od nule, nego može da izgradi sopstveni radni tok.

### 3.5 Audio frekvencijski rad
Jedna od glavnih specifičnosti projekta je da aplikacija:

- **ne povlači svaku frekvenciju sa interneta**
- nego **lokalno generiše audio tonove** u samoj aplikaciji
- koristi sopstveni audio engine
- podržava rad sa pojedinačnim frekvencijama i sekvencama

To znači da je rad:
- brži
- stabilniji
- manje zavistan od interneta
- pogodniji za privatnost i offline upotrebu

### 3.6 Queue, loop i ponavljanje
SINET Audio Lekar podržava:

- sekvencijalni rad kroz listu frekvencija
- rad kroz listu simptoma / tema
- loop po segmentu
- ponavljanje simptoma ili cele queue liste
- nastavak rada i kontinuitet sesije

Ovo je posebno važno kada korisnik želi jednostavan i predvidljiv rad, bez stalnog ručnog ponavljanja koraka.

### 3.7 Content Studio — Symptom Studio
**Content Studio / Symptom Studio** je interni alat za dopunu i održavanje kataloga.  
Njegova uloga je da omogući:

- kreiranje i uređivanje novih stavki
- validaciju strukture
- pripremu patch-eva
- uvoz / izvoz dopuna
- bržu dopunu kataloga simptomima i frekvencijama

Dalji cilj razvoja je da dopuna kataloga bude moguća na **jedan ili dva klika**, bez komplikovanog toka.

### 3.8 Anamneza
Modul **Anamneza** služi za unos i organizaciju ličnog zdravstvenog konteksta korisnika.  
On treba da bude osnova za:

- jasniji profil korisnika
- logičniji izbor sadržaja
- bolji tok rada kroz ostale module
- povezivanje sa LAB Bridge i Zdravstvenim kartonom

### 3.9 Zdravstveni karton
**Zdravstveni karton** je zamišljen kao pregledniji korisnički sloj zdravstvenih podataka, tako da korisnik može da vidi svoj kontekst na jednom mestu.

### 3.10 LAB Bridge
**LAB Bridge** je most između laboratorijskih nalaza, korisničkog razumevanja i daljeg rada u aplikaciji.

Cilj ovog modula nije da „glumi laboratoriju“, nego da:
- olakša unos i pregled nalaza
- pomogne korisniku da se ne izgubi
- poveže nalaze sa ostatkom SINET toka rada

### 3.11 Integrativni moduli
Aplikacija sadrži i dodatne pomoćne module kao što su:

- Integrativna biblioteka
- Integrativni vodič — RA šake
- Integrativni vodič — generator
- Akupunktura
- Tai Chi za seniore
- Antiparazitski program
- Brzi linkovi / Prva pomoć

Ovi moduli služe kao dopunski informativni i organizacioni sloj.

### 3.12 PWA i offline rad
Aplikacija je pripremljena za:

- rad u browseru
- instaliranje kao PWA
- rad bez interneta kada su ključni resursi lokalno dostupni
- lakši mobilni pristup

### 3.13 Backup / Restore
Podržani su mehanizmi za:

- backup korisničkih podataka
- restore podataka
- povrat radnog stanja
- čuvanje važnih korisničkih izbora i istorije rada

To je posebno važno jer browser storage nije večan i korisnik treba da ima kontrolu nad svojim podacima.

### 3.14 Audit i admin sloj
Projektni standard uključuje i:

- **Audit log** (ko / šta / kad)
- **Admin dijagnostiku**
- alate za proveru, održavanje i tehnički pregled

---

## 4) Posebne karakteristike SINET pristupa

SINET Audio Lekar nije pravljen kao klasična „još jedna health app“ aplikacija. Njegove posebnosti su:

1. **offline-first pristup**
2. **bez obavezne registracije**
3. **lokalno generisanje frekvencija**
4. **korisnički podaci ostaju pod kontrolom korisnika**
5. **senior-friendly UX filozofija**
6. **jednostavan ulaz u aplikaciju**
7. **isti redosled stavki kroz različite menije**
8. **mogućnost stalnog širenja kataloga**
9. **backup / restore**
10. **spajanje rada sa simptomima, sesijama, anamnezom i nalazima u jedan sistem**

---

## 5) Senior-friendly pristup (60+)

Aplikacija je projektovana tako da bude pristupačna i starijim korisnicima:

- manje vizuelne gužve
- jasne kartice
- veliki klikabilni elementi
- logičan redosled rada
- stalni obrasci navigacije
- **Početak** i **Nazad** kao obavezni standard
- smanjenje broja nepotrebnih koraka
- fokus na jasnoću, a ne na “efekte”

Ovo je važna razlika u odnosu na mnoge moderne aplikacije koje preopterećuju korisnika.

---

## 6) Privatnost, lokalno čuvanje i GDPR pristup

SINET Audio Lekar je pravljen sa pristupom **privacy by design**:

- nema obavezne registracije
- nema obaveznog cloud naloga
- korisnički podaci se čuvaju lokalno u browser storage-u uređaja
- backup/restore je pod kontrolom korisnika
- korisnik može da prenese ili arhivira svoje podatke

To znači da se u tipičnom self-hosted / GitHub / Netlify scenariju veliki deo privatnih podataka **ne šalje automatski na centralni server**, nego ostaje vezan za korisnikov uređaj i browser profil.

Važna pravna napomena:  
Arhitektura aplikacije je **GDPR-friendly / GDPR-aware**, ali formalna pravna usklađenost uvek zavisi i od konkretnog načina deploy-a, logovanja, integracija, hostinga i organizacionih procedura.  
Drugim rečima: aplikacija je dizajnirana da minimizuje podatke i da zadrži kontrolu kod korisnika, ali implementer i vlasnik deploy-a i dalje moraju proveriti svoje lokalne pravne obaveze.

---

## 7) Uporedni pregled sa drugim rešenjima na tržištu

> **Napomena:** ovo nije tvrdnja da su svi alati direktni konkurenti jedan drugome.  
> Ovo je **orijentaciono poređenje klasa rešenja** koje korisnicima pomaže da razumeju gde se SINET Audio Lekar razlikuje.

| Rešenje | Tip rešenja | Šta tipično radi | Cloud / nalog | Lokalno generisanje frekvencija | Fokus |
|---|---|---|---|---|---|
| **SINET Audio Lekar** | Offline-first web/PWA alat | katalog + sesije + protokoli + anamneza + health/lab kontekst + docs | nije obavezan | **da** | privatnost, jednostavnost, senior-friendly tok |
| **Spooky2** | softver + hardverski ekosistem | frekvencijski programi, generatori, hardver, biofeedback i velika baza programa | PC + često hardver | ne kao browser PWA; oslanja se na svoj sistem i hardver | frekvencijski hardverski ekosistem |
| **Bearable** | symptom tracker | praćenje simptoma, navika, raspoloženja i izveštaja | nalog / mobilna aplikacija | ne | praćenje simptoma i privatnost |
| **CareClinic** | symptom + medication tracker | simptomi, lekovi, podsetnici, izveštaji, care plan | nalog / cloud funkcije | ne | upravljanje rutinama i health tracking |
| **MyChart** | portal zdravstvenih ustanova | medicinski karton, termini, nalazi, poruke, deljenje kartona | vezano za ustanovu | ne | zvanični zdravstveni portal |
| **Brain.fm** | wellness / fokus audio servis | personalizovana muzika za fokus, san i relaksaciju | servis / pretplata | ne u smislu korisničkog frekv. studija | fokus / produktivnost |

### Kratko poređenje u korist SINET pristupa
SINET Audio Lekar je specifičan po tome što u jednom lakšem, preglednom i lokalno-orijentisanom sistemu kombinuje:

- katalog simptoma i tema
- korisničke liste, favorite i protokole
- lokalno generisane frekvencije
- backup/restore
- anamnezu, zdravstveni karton i LAB Bridge
- pomoćne integrativne module
- docs/support arhivu

Drugim rečima, SINET ne pokušava da bude:
- bolnički portal,
- klasični symptom tracker,
- ili hardverski frekvencijski sistem.

On pokušava da bude **jasan korisnički radni sistem**.

---

## 8) Za koga je aplikacija

Aplikacija je namenjena korisnicima koji žele:

- jednostavan i pregledan rad
- lokalnu kontrolu nad podacima
- stabilan katalog i dopune kroz vreme
- rad na telefonu i desktopu
- manje zavisnosti od interneta
- pregledan sistem sesija, simptoma i pratećih alata

Posebno je korisna za:

- starije korisnike
- porodice i neformalne negovatelje
- korisnike koji ne žele komplikovane cloud sisteme
- korisnike kojima je važna arhiva sopstvenih podataka
- projekte koji žele da grade katalog kroz vreme

---

## 9) Ograničenja i važna upozorenja

- Ovo nije hitna medicinska služba.
- Ovo nije zamena za pregled, laboratoriju ili terapiju.
- Tumačenje simptoma i nalaza mora biti oprezno i razumno.
- Browser storage može biti izgubljen ako korisnik obriše podatke uređaja ili browser profila — zato je **backup važan**.
- Neki pomoćni moduli i tokovi su još u doradi i dodatnom UX pojednostavljivanju.

---

## 10) Pravac daljeg razvoja

Najvažniji naredni pravci razvoja su:

1. **Content Studio — Symptom Studio**
   - dopuna kataloga na 1–2 klika

2. **Anamneza**
   - jednostavniji i logičniji tok unosa

3. **Zdravstveni karton**
   - jasniji pregled i povezivanje sa ostalim modulima

4. **LAB Bridge**
   - intuitivniji unos i tumačenje nalaza

5. **Senior UX hardening**
   - da sve bude mirno, jasno i bez zabune

---

## 11) Deploy i paket isporuke

Standard projekta:

- program ide u folder **`Sinet_Audio_Lekar/`**
- dokumentacija ide u folder **`SINET_Audio_Lekar_DOCS_SUPPORT/`**
- runtime i docs se mogu isporučivati odvojeno ili kao bundle ZIP

Za javni repo i hosting:
- README ide u root programskog foldera
- docs/support ostaje odvojen radi čistoće runtime paketa

---

## 12) Reference za uporedni pregled (javne, reprezentativne)

- Spooky2 — zvanične strane i vodiči:
  - https://www.spooky2.com/sp/download-spooky2-software/
  - https://www.spooky2.com/product/spooky2-portable-generatorx-pro-essential-kit/
  - https://www.spooky2.com/resources/Spooky2_Users_Guide_20250124.pdf

- Bearable:
  - https://bearable.app/
  - https://bearable.app/support/common-questions/is-there-a-browser-or-desktop-version-of-bearable/
  - https://bearable.app/support/common-questions/can-i-write-or-import-data-to-another-app-from-bearable/
  - https://bearable.app/privacy-policy/

- CareClinic:
  - https://careclinic.io/managing-chronic-illness-app/
  - https://careclinic.io/pill-reminder/
  - https://careclinic.io/export-share/
  - https://start.careclinic.io/knowledgebase/privacy-and-security/hipaa-compliant-or-compliant-equivalent/325/

- MyChart:
  - https://www.mychart.org/
  - https://www.mychart.org/Sharing-Your-Medical-Record

- Brain.fm:
  - https://www.brain.fm/

---

# ENGLISH

## 1) What SINET Audio Lekar is

**SINET Audio Lekar** is an **offline-first web/PWA application** for organizing symptoms, frequency sessions, personal protocols, anamnesis, health context, and supporting integrative content.

It is designed to be:

- **easy to use**
- **clear and readable**
- **mobile-friendly**
- **suitable for all ages, especially seniors 60+**
- **free from mandatory registration and mandatory cloud dependency**

Important: SINET Audio Lekar is an **informational and organizational tool**.  
It is **not a medical device**, it does **not diagnose**, and it does **not replace physicians, emergency care, treatment, or laboratory workups.**

---

## 2) Core idea

The project was created from the need to give the user **one structured place** for:

- symptom and topic catalogues
- locally generated audio frequencies
- working lists and protocols
- personal favorites
- anamnesis and health context
- LAB Bridge and health record
- backup/restore
- integrative guides and helper modules
- documentation and clear workflow

The goal is not “system complexity”; the goal is **calm, logical, low-friction use**.

---

## 3) What the app does

### 3.1 Home screen
The home screen is intentionally simplified and contains:

- a **Dedication** section — always visible
- **⚡ FIRST AID**
- **☰ MAIN MENU**

This gives the user two clear entry paths:

- **fast access** to the most important tools
- **full access** to all modules

### 3.2 Main menu and hamburger menu
The app uses two navigation patterns with the **same item order**, but **different presentation**:

- **MAIN MENU** → opens a **card-based view**
- **HAMBURGER MENU** → opens a **list view**

This creates:
- one consistent navigation logic
- two different visual modes
- less user confusion

### 3.3 Symptom/topic catalogue
The catalogue is the central content base of the application and supports:

- browsing symptoms and topics
- search and filtering
- opening details
- adding items to the working list / queue
- expanding the catalogue with future patches and studio tools

The catalogue is treated as a **living, growing knowledge base**, not a closed list.

### 3.4 My Symptoms, Favorites, Protocols and List
The app lets users organize their work through:

- **My Symptoms**
- **My Favorites**
- **My Protocols**
- **List (Queue)**

This means the user does not need to start from scratch every time.

### 3.5 Audio frequency workflow
One of the main specifics of the project is that the app:

- **does not need to fetch each frequency from the internet**
- instead **generates audio tones locally**
- uses its own audio engine
- supports both individual frequencies and sequences

This makes the workflow:
- faster
- more stable
- less internet-dependent
- more privacy-friendly and offline-friendly

### 3.6 Queue, loop and repetition
SINET Audio Lekar supports:

- sequential frequency playback
- symptom/topic-based queues
- looped segments
- repeating one symptom or the entire queue
- session continuity and resuming

This is especially important for users who want predictable, low-stress operation.

### 3.7 Content Studio — Symptom Studio
**Content Studio / Symptom Studio** is the internal catalogue maintenance tool.  
Its role is to support:

- creating and editing items
- validating structure
- preparing patches
- importing/exporting catalogue updates
- faster expansion of symptoms and frequencies

The next goal is to make catalogue updates possible in **one or two clicks**.

### 3.8 Anamnesis
The **Anamnesis** module is used to enter and organize the user’s health context.  
It is meant to become the basis for:

- a clearer user profile
- more logical content selection
- better flow across modules
- connection with LAB Bridge and Health Record

### 3.9 Health Record
**Health Record** is intended as a clearer user-facing layer for health-related information so the user can review important context in one place.

### 3.10 LAB Bridge
**LAB Bridge** acts as a bridge between laboratory values, user understanding, and the next step inside the app.

Its purpose is not to imitate a laboratory, but to:
- simplify entry and review of findings
- reduce confusion
- connect findings with the broader SINET workflow

### 3.11 Integrative modules
The application also includes helper modules such as:

- Integrative Library
- Integrative Guide — RA Hands
- Integrative Guide — Generator
- Acupuncture
- Tai Chi for Seniors
- Anti-parasite Program
- Quick Links / First Aid

These modules serve as supporting informational and organizational layers.

### 3.12 PWA and offline use
The application is prepared for:

- browser-based use
- PWA installation
- offline work when key assets are available locally
- easier phone-based access

### 3.13 Backup / Restore
The app supports:

- user data backup
- restore
- recovery of working state
- preserving important user selections and history

This matters because browser storage is not eternal and the user should remain in control of their data.

### 3.14 Audit and admin layer
The project standard also includes:

- **Audit log** (who / what / when)
- **Admin diagnostics**
- maintenance and technical inspection tools

---

## 4) What makes the SINET approach different

SINET Audio Lekar is not designed as “just another health app”.  
Its distinctives are:

1. **offline-first design**
2. **no mandatory registration**
3. **local frequency generation**
4. **user-controlled data**
5. **senior-friendly UX philosophy**
6. **simple app entry**
7. **same item order across navigation modes**
8. **continuously expandable catalogue**
9. **backup / restore**
10. **one system that connects symptoms, sessions, anamnesis, and health/lab context**

---

## 5) Senior-friendly design (60+)

The app is intentionally shaped to be more accessible for older users:

- less visual clutter
- clear cards
- large touch targets
- logical work order
- stable navigation patterns
- **Home** and **Back** as required standards
- fewer unnecessary steps
- clarity over visual effects

This is an important difference compared with many modern apps that overload the user.

---

## 6) Privacy, local storage and GDPR-oriented design

SINET Audio Lekar follows a **privacy by design** approach:

- no mandatory account
- no mandatory cloud account
- user data is stored locally in browser/device storage
- backup/restore stays under user control
- the user can archive and transfer data

In a typical self-hosted / GitHub / Netlify scenario, a large portion of private data **does not need to be automatically sent to a central server**, but remains tied to the user’s own device and browser profile.

Important legal note:  
The architecture is **GDPR-friendly / GDPR-aware**, but formal legal compliance always also depends on the actual deployment model, logging, integrations, hosting, and organizational procedures.  
In other words: the app is designed to minimize data and keep control with the user, but the deployer/operator must still review their own legal obligations.

---

## 7) Comparative overview with other solutions on the market

> **Note:** this is not a claim that all listed products are direct one-to-one competitors.  
> It is an **orientation table across different solution classes** so users can understand where SINET Audio Lekar differs.

| Solution | Solution type | Typical role | Cloud/account dependency | Local frequency generation | Main focus |
|---|---|---|---|---|---|
| **SINET Audio Lekar** | offline-first web/PWA tool | catalogue + sessions + protocols + anamnesis + health/lab context + docs | not required | **yes** | privacy, simplicity, senior-friendly workflow |
| **Spooky2** | software + hardware ecosystem | frequency programs, generators, hardware, biofeedback, large preset databases | PC + often hardware | not as a browser PWA; relies on its own software/hardware stack | hardware-based frequency ecosystem |
| **Bearable** | symptom tracker | symptoms, habits, mood, reports | account / mobile app | no | symptom tracking and privacy |
| **CareClinic** | symptom + medication tracker | symptoms, medication, reminders, reports, care plans | account / cloud features | no | routine management and health tracking |
| **MyChart** | provider-connected health portal | health record, appointments, results, messaging, record sharing | linked to healthcare organization | no | official healthcare portal |
| **Brain.fm** | wellness / focus audio service | personalized music for focus, sleep and relaxation | service / subscription | no in the sense of user-controlled frequency studio | focus / productivity |

### Short comparison in favor of the SINET approach
SINET Audio Lekar is distinctive because it combines, inside one lighter and more locally controlled system:

- symptom/topic catalogues
- user lists, favorites and protocols
- locally generated frequencies
- backup/restore
- anamnesis, health record and LAB Bridge
- helper integrative modules
- a documentation/support archive

In other words, SINET does **not** try to be:
- a hospital portal,
- a classic symptom tracker,
- or a hardware-driven frequency platform.

It tries to be a **clear user workflow system**.

---

## 8) Who the app is for

The app is suitable for users who want:

- simple and structured operation
- local control over data
- a stable catalogue that can grow over time
- phone and desktop use
- less dependency on the internet
- a more coherent system of sessions, symptoms, and helper tools

It can be especially useful for:

- older users
- families and informal caregivers
- users who do not want complicated cloud systems
- users who care about archiving their own data
- projects that want to grow a catalogue over time

---

## 9) Limitations and important warnings

- This is not an emergency medical service.
- This does not replace clinical evaluation, lab work, or therapy.
- Symptoms and findings must be approached carefully and reasonably.
- Browser storage can be lost if device/browser data is cleared — this is why **backup matters**.
- Some helper modules and workflows are still being refined and simplified.

---

## 10) Next development priorities

The most important next steps are:

1. **Content Studio — Symptom Studio**
   - one-click or two-click catalogue updates

2. **Anamnesis**
   - simpler and more logical data entry flow

3. **Health Record**
   - clearer overview and better connection to other modules

4. **LAB Bridge**
   - more intuitive entry and interpretation flow

5. **Senior UX hardening**
   - calm, obvious, low-confusion operation everywhere

---

## 11) Deployment and package structure

Project standard:

- program goes into **`Sinet_Audio_Lekar/`**
- documentation goes into **`SINET_Audio_Lekar_DOCS_SUPPORT/`**
- runtime and docs can be delivered separately or as one bundle ZIP

For public repository and hosting:
- README belongs in the root of the program folder
- docs/support remains separate to keep the runtime package clean

---

## 12) Public reference points used for the comparison

- Spooky2:
  - https://www.spooky2.com/sp/download-spooky2-software/
  - https://www.spooky2.com/product/spooky2-portable-generatorx-pro-essential-kit/
  - https://www.spooky2.com/resources/Spooky2_Users_Guide_20250124.pdf

- Bearable:
  - https://bearable.app/
  - https://bearable.app/support/common-questions/is-there-a-browser-or-desktop-version-of-bearable/
  - https://bearable.app/support/common-questions/can-i-write-or-import-data-to-another-app-from-bearable/
  - https://bearable.app/privacy-policy/

- CareClinic:
  - https://careclinic.io/managing-chronic-illness-app/
  - https://careclinic.io/pill-reminder/
  - https://careclinic.io/export-share/
  - https://start.careclinic.io/knowledgebase/privacy-and-security/hipaa-compliant-or-compliant-equivalent/325/

- MyChart:
  - https://www.mychart.org/
  - https://www.mychart.org/Sharing-Your-Medical-Record

- Brain.fm:
  - https://www.brain.fm/

---

**Autor / Author:** miuchins / Svetozar Miuchin  
**Co-author:** SINET AI
