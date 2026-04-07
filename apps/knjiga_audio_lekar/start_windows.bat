@echo off
set PORT=%1
if "%PORT%"=="" set PORT=8130
echo [SINET_KNJIGA_AUDIO_LEKAR] Startujem lokalni server na http://127.0.0.1:%PORT%/
python -m http.server %PORT%
