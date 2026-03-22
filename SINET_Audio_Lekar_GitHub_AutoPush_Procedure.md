# SINET Audio Lekar — GitHub povezivanje i automatski upload

## Tvoj lokalni folder
`/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/`

## Tvoj GitHub repo
`git@github.com:miuchin/Sinet_Audio_Lekar.git`

---

## 1. Instaliraj potrebne pakete na Manjaro

```bash
sudo pacman -S git openssh inotify-tools rsync unzip
```

---

## 2. Poveži laptop sa GitHub nalogom preko SSH

GitHub za SSH povezivanje vodi kroz proveru postojećeg ključa, generisanje novog ključa, dodavanje ključa na nalog i test SSH veze. citeturn654348view0

### 2.1 Proveri da li već imaš SSH ključ

```bash
ls -la ~/.ssh
```

Ako vidiš `id_ed25519` i `id_ed25519.pub`, možeš preći na deo **2.3**.

### 2.2 Generiši novi SSH ključ

```bash
ssh-keygen -t ed25519 -C "smiuchin@gmail.com"
```

Pritisni `Enter` za podrazumevanu putanju.

### 2.3 Uključi ssh-agent i dodaj ključ

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### 2.4 Prikaži javni ključ

```bash
cat ~/.ssh/id_ed25519.pub

AAAAC3NzaC1lZDI1NTE5AAAAIATw8muQ9QnMIRzTY9AeZmwuoWiNfnbveE6J955W0sjq smiuchin@gmail.com
```

Kopiraj ceo izlaz, pa na GitHub idi na:

**Settings → SSH and GPG keys → New SSH key**

Nalepi ključ i sačuvaj.

### 2.5 Test konekcije

```bash
ssh -T git@github.com
```

Ako dobiješ poruku tipa:

```text
Hi miuchin! You've successfully authenticated, but GitHub does not provide shell access.
```

veza radi.

---

## 3. Kopiraj skripte u projekat

Uđi u projektni folder i napravi `scripts` folder:

```bash
mkdir -p /home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts
```

Zatim kopiraj ova dva fajla u taj folder:

- `SINET_Audio_Lekar_github_sync_now.sh`
- `SINET_Audio_Lekar_github_autopush_watch.sh`

I postavi izvršne dozvole:

```bash
chmod +x /home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts/SINET_Audio_Lekar_github_sync_now.sh
chmod +x /home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts/SINET_Audio_Lekar_github_autopush_watch.sh
```

---

## 4. Prvi ručni sync

GitHub za rad sa remote repozitorijumima koristi `git remote add` za novo povezivanje i `git remote set-url` za promenu postojećeg remote URL-a. citeturn654348view1

Pokreni ručni sync prvi put:

```bash
/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts/SINET_Audio_Lekar_github_sync_now.sh
```

Ova skripta radi:

- inicijalizuje Git ako treba
- postavlja `origin` na `git@github.com:miuchin/Sinet_Audio_Lekar.git`
- koristi branch `main`
- radi `git add -A`
- pravi commit samo ako zaista ima promena
- radi `git push -u origin main`

Napomena: GitHub web upload ima stroža ograničenja po fajlu, dok CLI push koristi Git tok rada i to je pravi put za ovaj projekat. citeturn654348view2

---

## 5. Automatski upload čim se nešto promeni

### 5.1 Testiraj watcher ručno

```bash
/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts/SINET_Audio_Lekar_github_autopush_watch.sh
```

Watcher radi ovako:

- prati sve promene u projektu
- ignoriše `.git`, `node_modules`, `dist`, `build`
- čeka kratki debounce prozor da ne pravi commit za svaku sitnicu
- posle promene poziva `SINET_Audio_Lekar_github_sync_now.sh`

Zaustavljaš ga sa:

```bash
Ctrl+C
```

---

## 6. Pokreni watcher kao systemd user servis

Napravi user service folder:

```bash
mkdir -p ~/.config/systemd/user
```

Kopiraj service fajl kao:

`~/.config/systemd/user/sinet-audio-github-autopush.service`

Zatim osveži i uključi servis:

```bash
systemctl --user daemon-reload
systemctl --user enable --now sinet-audio-github-autopush.service
```

Provera statusa:

```bash
systemctl --user status sinet-audio-github-autopush.service
```

Praćenje loga uživo:

```bash
journalctl --user -u sinet-audio-github-autopush.service -f
```

Ako želiš da ga ugasiš:

```bash
systemctl --user disable --now sinet-audio-github-autopush.service
```

---

## 7. Važne napomene

- Ovaj sistem radi **auto-commit i auto-push** za svaku grupu promena.
- Ako menjaš mnogo fajlova brzo, debounce sprečava previše commit-ova.
- Skripta koristi `git add -A`, što znači da hvata i **brisanja** i **preimenovanja**.
- Ako u projektu imaš lokalne fajlove koje ne želiš na GitHub-u, obavezno dodaj `.gitignore` pre uključivanja watcher-a.
- Ako želiš čistiji istorijat, koristi watcher za backup/sigurnost, a velike logičke izmene i dalje radi ručno sa namenskim commit porukama.

---

## 8. Najkraći redosled

```bash
sudo pacman -S git openssh inotify-tools rsync unzip
ssh-keygen -t ed25519 -C "smiuchin@gmail.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
ssh -T git@github.com
mkdir -p /home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts
# kopiraj skripte u scripts/
chmod +x /home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts/*.sh
/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts/SINET_Audio_Lekar_github_sync_now.sh
mkdir -p ~/.config/systemd/user
# kopiraj service fajl
systemctl --user daemon-reload
systemctl --user enable --now sinet-audio-github-autopush.service
```
