#!/usr/bin/env bash
python3 - <<'PY'
import socket
for p in range(8000, 8151):
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", p))
        s.close()
        print(f"{p}: FREE")
    except OSError:
        print(f"{p}: USED")
PY
