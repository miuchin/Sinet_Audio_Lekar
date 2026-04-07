# SINET Knjiga Audio Lekar — Integration Ready Pack v0.3.8

Ovaj paket je pripremljen za kasnije priključenje u glavni projekat **Audio Lekar**.

## Predloženi raspored u Audio Lekar root-u

```text
Audio_Lekar/
  apps/
    knjiga_audio_lekar/
      index.html
      css/
      js/
      pages/
      data/
      start.sh
```

## Kako da pokreneš modul samostalno

Iz foldera `apps/knjiga_audio_lekar/`:

```bash
./start.sh
```

ili:

```bash
python3 -m http.server 8035
```

pa otvori:

```text
http://127.0.0.1:8035/
```

## Kako da priključiš modul u Audio Lekar

Najčistiji prvi korak je da iz glavne aplikacije dodaš link / karticu:

- **📘 KNJIGA AUDIO LEKAR**

koja vodi na:

```text
/apps/knjiga_audio_lekar/
```

ili na lokalnom testu:

```text
http://127.0.0.1:8035/
```

## Šta je uključeno

- clean runtime Knjige
- svi potrebni CSS/JS/HTML fajlovi
- book indeksi i area chunkovi
- verzija: **v0.3.8**

## Šta nije uključeno

- istorijski overlay paketi
- test PDF/HTML/TXT/MD exporti
- radni screenshot fajlovi
- stari build eksperimenti

## Napomena

Ovaj paket je namenjen za **integraciju**. Ne menja ništa u glavnom Audio Lekar projektu dok ga ručno ne kopiraš ili ne pokreneš instalacionu skriptu iz ovog paketa.
