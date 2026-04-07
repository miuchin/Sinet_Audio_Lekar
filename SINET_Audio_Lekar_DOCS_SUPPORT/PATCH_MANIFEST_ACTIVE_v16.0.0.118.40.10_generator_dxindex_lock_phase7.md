# PATCH MANIFEST — ACTIVE v16.0.0.118.40.10 — generator dx_index lock phase 7

## Svrha
Determinističko zaključavanje tematskog izbora za Integrativni vodič (generator), posebno za **M05.9**, kako bi generator prestao da meša nepovezane teme (digestivno, urogenitalno, oralno) u RA vodiču.

## Izmenjeni fajlovi
- `data/sinet_dx_index.json`

## Ključne izmene
- dodat eksplicitan unos za `M05.9`
- pojačan i zamenjen unos za `M06.9`
- dodat eksplicitan unos za `M13.0`
- za svaku od ovih šifara uveden je strogo kuriran `sinet_refs` skup
- generator sada prvo uzima ove refs stavke, umesto da pada na široki fallback

## Očekivani efekat
Za `M05.9` generator treba da ostane u temi:
- reumatoidni artritis
- jutarnja ukočenost
- šake / prsti / ručni zglobovi
- otok / bol / funkcija hvata

Ne sme više da uvlači:
- analnu fisuru
- bol posle jela
- učestalo mokrenje
- suva usta noću
- druge nepovezane sisteme

## Napomena
Ovaj patch namerno ne dira:
- Atlas / Katalog navigaciju
- audio engine
- print shell
- ostale stranice

Cilj je samo da se **izvor selekcije** za generator zaključa na tematski ispravne SINET stavke.
