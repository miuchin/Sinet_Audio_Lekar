# SINET Server Bootstrap Installed

Projekt: **Sinet_Audio_Lekar**

Instalirani elementi:
- `server/runtime.config.json`
- `server/static_server.py`
- `server/runtime_control_bridge.py`
- `server/index.html`
- `scripts/start.sh`
- `scripts/stop.sh`
- `scripts/status.sh`
- `start.sh`
- `stop.sh`

## Podrazumevani portovi
- Server: `8120`
- Bridge: `8121`
- Opseg: `8120-8180`

## Pravilo
Glavni ulaz aplikacije ostaje **`index.html`**. Versioned HTML snapshot fajlovi idu u arhivu, ne kao glavni runtime entry.
