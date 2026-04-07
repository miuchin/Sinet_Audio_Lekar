# PATCH MANIFEST — ACTIVE v16.0.0.118.40.10 — Generator Print Clean Phase 5

## Cilj
Integrativni vodič je štampao previše UI hroma i nereprezentativan “prazan generator” izlaz. Ovaj patch uvodi čist print-only shell za browser print i dugme Štampaj.

## Izmena
Menjan je samo fajl:
- `pages/integrativni_vodic.html`

## Šta je popravljeno
- browser print sada koristi `#printShell` clean SINET print izlaz
- dugme `Štampaj` više ne zove sirovi `window.print()` nad celim ekranom bez pripreme, već prvo gradi clean print dokument
- ako nije izabrana MKB-10 šifra, print daje kratku jednolistnu poruku da vodič nije generisan, umesto 9 strana praznog/generičkog materijala
- print izlaz više ne nosi UI sekcije kao što su profilni kontekst, standardizovani ekran, MKB picker i chooser deo
- sekcije su sabijene u reprezentativniji SINET print raspored: meta, opis, pretrage, standardna medicina, psihosomatika, ishrana, zvučna terapija, alternative, narodni i duhovni sloj

## Napomena
Browser datum/URL zaglavlja i podnožja dolaze iz samog browser print dijaloga. Ako korisnik želi potpuno čist PDF bez tih linija, treba isključiti `Headers and footers` u print dijalogu browsera.
