# SINET Audio Lekar — GitHub upload vodič

Ovaj vodič služi da ZIP paket `Sinet_Audio_Lekar.zip` bezbedno prebaciš u GitHub repo:

- repo: `miuchin/Sinet_Audio_Lekar`
- grana: `main`

## Zašto ne browser upload
GitHub web upload obično ograničava:
- do 100 fajlova po jednoj turi
- oko 25 MiB po fajlu u browser upload režimu

U ovom projektu postoji veliki fajl `data/SINET_CATALOG.json`, pa je zato sigurniji put `git push` sa lokalnog računara.

## Potrebno na Manjaro / Linux
Instalirano:
- `git`
- `unzip`
- `rsync`

Primer:
```bash
sudo pacman -S git unzip rsync
```

## Fajlovi
Koristi ova dva fajla:
- `Sinet_Audio_Lekar.zip`
- `SINET_Audio_Lekar_push_to_github.sh`

Stavi ih npr. u isti folder, recimo:
```bash
~/Desktop/SINET/upload/
```

## Pokretanje
Otvori terminal u tom folderu i pokreni:
```bash
chmod +x SINET_Audio_Lekar_push_to_github.sh
./SINET_Audio_Lekar_push_to_github.sh ./Sinet_Audio_Lekar.zip
```

## Šta skripta radi
1. raspakuje ZIP u privremeni folder
2. klonira repo ako već ne postoji
3. prebacuje se na `main`
4. radi `git pull --ff-only`
5. sinhronizuje sadržaj ZIP-a u repo root
6. pravi commit
7. radi `git push origin main`

## Ako traži GitHub prijavu
Ako ti GitHub traži autentikaciju, koristi:
- Git Credential Manager ako ga imaš
- ili Personal Access Token umesto lozinke

## Ako već imaš lokalni repo
Možeš zadati i svoj postojeći repo folder kao drugi argument:
```bash
./SINET_Audio_Lekar_push_to_github.sh ./Sinet_Audio_Lekar.zip ~/Desktop/SINET/Sinet_Audio_Lekar
```

## Ako želiš drugačiju commit poruku
Peti argument je commit poruka:
```bash
./SINET_Audio_Lekar_push_to_github.sh ./Sinet_Audio_Lekar.zip ~/Desktop/SINET/Sinet_Audio_Lekar https://github.com/miuchin/Sinet_Audio_Lekar.git main "Deploy v16.0.0.117.0"
```

## Važna napomena
Skripta koristi `rsync --delete`, što znači:
- fajlovi koji više ne postoje u ZIP-u biće obrisani iz repo-a

To je dobro ako želiš da GitHub repo bude **tačno isti kao ZIP paket**.

## Preporučeni tok
1. napravi backup ako želiš dodatnu sigurnost
2. pokreni skriptu
3. proveri GitHub repo
4. zatim po potrebi uradi deploy na Netlify

## Brza provera posle push-a
Na GitHub-u proveri:
- da li je `README.md` u root-u
- da li su `index.html`, `manifest.webmanifest`, `sw.js`, `js/`, `css/`, `data/` prisutni
- da li se vidi poslednji commit

