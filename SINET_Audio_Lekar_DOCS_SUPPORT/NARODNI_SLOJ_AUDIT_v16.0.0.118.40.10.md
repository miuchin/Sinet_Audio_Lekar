# SINET Audio Lekar — Narodni sloj audit v16.0.0.118.40.10

## Sažetak
Ovaj audit je urađen nad `data/SINET_CATALOG.json` i `data/narodne_metode/enciklopedija/sinet_ready_katalog.json`.

## Ključni nalaz
Narodni sloj **nije prazan**. Naprotiv, već postoji u dva paralelna kanala:
- `holisticki.narodni_lek`
- `holisticki.saveti.narodno`

Za realno poliranje, u UI i export-u treba **preferirati `saveti.narodno`**, jer je često konkretniji i praktičniji od generičkog `narodni_lek.opis`.

## Brojevi
- Ukupno katalog unosa: **10,133**
- Unosa sa `narodni_lek` tekstom: **10,133**
- Unosa sa `saveti.narodno`: **10,133**
- Jedinstvenih `narodni_lek` tekstova: **1,651**
- Jedinstvenih `saveti.narodno` tekstova: **1,679**
- `saveti.narodno` sa generičkim / boilerplate obrascem: **3,976**
- `saveti.narodno` sa konkretnijim praktičnim sadržajem: **6,157**
- Kuriranih review-first narodnih kandidata iz Enciklopedije: **147**

## Najčešći generički obrasci (`narodni_lek`)
- **3257×** Alternativni pristup je pomoćni sloj uz osnovnu procenu i ne zamenjuje pregled kada postoje jaki, novi ili alarmantni simptomi.
- **402×** Alternativni pristup je pomoćni sloj uz osnovnu procenu: rasterećenje, kratko kretanje i postepeno vraćanje opterećenja. Ne zamenjuje pregled kada se tegoba pojačava ili odstupa od uobičajenog obrasca. Podrška ostaje blaga i nenasilna: rutina, toplota ili rashlađivanje po toleranciji, odmor, ritam i nežne kućne mere. Ovaj sloj ne zamenjuje pregled kada tegoba jača, traje ili menja karakter.
- **346×** Podržavajuće mere koristiti pažljivo, bez odlaganja pregleda kada postoje red flags.
- **320×** Napomena: Ako se jave gušenje, plavljenje usana, visok napor pri disanju ili naglo pogoršanje, potreban je hitan pregled. Frekvencije su podršne/informativne i nisu dijagnostički alat.
- **250×** Alternativni pristup je pomoćni sloj uz osnovnu procenu: mikro-pauze, rasterećenje hvata i nežno pokretanje šake. Ne zamenjuje pregled kada se tegoba pojačava ili odstupa od uobičajenog obrasca. Podrška ostaje blaga i nenasilna: rutina, toplota ili rashlađivanje po toleranciji, odmor, ritam i nežne kućne mere. Ovaj sloj ne zamenjuje pregled kada tegoba jača, traje ili menja karakter.
- **250×** Alternativni pristup je pomoćni sloj uz osnovnu procenu: sporiji tempo, manji broj simultanih zadataka i ritam pauza. Ne zamenjuje pregled kada se tegoba pojačava ili odstupa od uobičajenog obrasca. Podrška ostaje blaga i nenasilna: rutina, toplota ili rashlađivanje po toleranciji, odmor, ritam i nežne kućne mere. Ovaj sloj ne zamenjuje pregled kada tegoba jača, traje ili menja karakter.

## Najčešći praktični obrasci (`saveti.narodno`)
- **1155×** Pomoćni pristup mogu biti odmor, provetren prostor, topli napici i blago podignut položaj tela, bez odlaganja pregleda kad je disanje otežano.
- **1145×** Pomoćno mogu prijati sporije ustajanje, dovoljno tečnosti, lagano razgibavanje i tople ruke ili stopala, uz pregled kada simptomi traju ili jačaju.
- **471×** Pomoćne mere mogu biti odmor, hidracija, blag ritam dana i jednostavne navike koje telu vraćaju osećaj sigurnosti.
- **352×** Pomoćne mere mogu biti korisne kao podrška: rasterećenje, kratko kretanje i postepeno vraćanje opterećenja. Ako se tegoba naglo pojačava, postaje neobična ili se jave alarmantni znaci, potreban je pregled. Holistički sloj prati oslonac, tempo kretanja, obuću, zamor, disanje tokom napora i osećaj sigurnosti u pokretu. Praktičan fokus je na malim, ponovljivim koracima: ritam, odmor, oprezno doziranje aktivnosti i praćenje šta pogoršava, a šta smanjuje tegobu.
- **320×** Napomena: Ako se jave gušenje, plavljenje usana, visok napor pri disanju ili naglo pogoršanje, potreban je hitan pregled. Frekvencije su podršne/informativne i nisu dijagnostički alat.
- **250×** Pomoćne mere mogu biti korisne kao podrška: mikro-pauze, rasterećenje hvata i nežno pokretanje šake. Ako se tegoba naglo pojačava, postaje neobična ili se jave alarmantni znaci, potreban je pregled. Holistički sloj posmatra odnos ponavljanog rada, mikropauza, položaja ruke, vrata i ramena i subjektivnog osećaja napora. Praktičan fokus je na malim, ponovljivim koracima: ritam, odmor, oprezno doziranje aktivnosti i praćenje šta pogoršava, a šta smanjuje tegobu.
- **250×** Pomoćne mere mogu biti korisne kao podrška: sporiji tempo, manji broj simultanih zadataka i ritam pauza. Ako se tegoba naglo pojačava, postaje neobična ili se jave alarmantni znaci, potreban je pregled. Holistički sloj povezuje san, ritam dana, mentalno opterećenje, preopterećenje stimulacijom i potrebu za kraćim intervalima rada i odmora. Praktičan fokus je na malim, ponovljivim koracima: ritam, odmor, oprezno doziranje aktivnosti i praćenje šta pogoršava, a šta smanjuje tegobu.
- **243×** Napomena: Ako se jave bol u grudima, nesvestica, slabost jedne strane tela, plavljenje ili naglo pogoršanje, potreban je hitan pregled. Frekvencije su podršne/informativne i nisu dijagnostički alat.

## Zaključak za Phase 2
Najbezbedniji nastavak poliranja je:
1. u modalu, exportu i Integrativnom vodiču prikazivati **`saveti.narodno` pre generičkog `narodni_lek.opis`**
2. ne menjati masovno katalog bez ručne verifikacije
3. koristiti Enciklopediju narodnih metoda kao **review-first kandidatski sloj** u generatoru i export-u

## Šta je urađeno u ovom patch-u
- modal i STL/export tok sada preferiraju praktičniji `saveti.narodno` tekst
- Integrativni vodič dobio je novi blok: **Narodni lekovi i kućni koraci**
- Integrativni vodič po potrebi prikazuje i **review-first kandidate** iz Enciklopedije narodnih metoda lečenja
