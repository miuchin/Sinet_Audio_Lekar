# SINET Audio Lekar Runtime Patch v16.0.0.118.3

- Dodata kartica **Server / Operativni centar** na Početnu stranu, odmah ispod ulaza PRVA POMOĆ / GLAVNI MENI.
- Dodato i header dugme + meni stavka za isti centar.
- Mobilni prikaz je prioritetno pokriven kroz karticu na Početnoj, da server ulaz bude vidljiv i kada header dugmad nisu sva dostupna.
- Portovi za Audio Lekar su podešeni na **8130 / 8131**.
- Server centar je ispravljen tako da start/restart/stop/status rade pouzdanije preko bridge porta.
- Aplikacija normalno radi u web režimu i bez lokalnog runtime-a; u tom slučaju centar samo prikazuje informaciju da local runtime nije dostupan u tom režimu.

## Komande

```bash
./start.sh
./status.sh
./stop.sh
```
