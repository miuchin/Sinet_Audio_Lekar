# PATCH MANIFEST v16.0.0.118.40.7

## Fokus
- Atlas: klik na simptom više ne izbacuje odmah na početak/home.
- Izbor simptoma sada ostaje u Atlasu i otvara desni detaljni panel.
- Samo eksplicitna dugmad **📖 Otvori u Katalogu** / **📖 Detalj** vode u glavni Katalog.

## Izmenjeni fajlovi
- `atlas.html`
- version-lock osvežen na `v16.0.0.118.40.7` u glavnim runtime fajlovima

## Glavna ispravka
Ranije je `selectItem(id, action='catalog')` pri običnom kliku na red simptoma odmah zvao `sendBridge(...)`, pa je Atlas napuštao stranicu.
Sada običan klik radi samo **select + detail preview** unutar Atlasa.
