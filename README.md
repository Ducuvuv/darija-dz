# Darija DZ — app mobile

HTML/CSS/JS vanilla · localStorage · gh-pages.

## Local

Ouvre `index.html` dans le navigateur, ou :

```bash
cd app
python -m http.server 8080
```

Puis `http://localhost:8080`

## Regénérer les données

Depuis la racine du repo :

```bash
python scripts/build-data.py
```

## Deploy GitHub Pages

1. Crée un repo GitHub (ex. `darija-dz`).
2. À la racine du projet :

```bash
git init
git add .
git commit -m "Darija app v1"
git branch -M main
git remote add origin https://github.com/TON_USER/darija-dz.git
git push -u origin main
```

3. Publie **uniquement** le dossier `app/` sur la branche `gh-pages` :

```bash
git subtree split --prefix app -b gh-pages
git push -u origin gh-pages
```

4. Sur GitHub : **Settings → Pages → Branch `gh-pages` / root**.

5. URL : `https://TON_USER.github.io/darija-dz/`

> Alternative : copier le contenu de `app/` à la racine de `gh-pages` (comme biochimie).

## Pages

| Fichier | Rôle |
|---------|------|
| `index.html` | Hub + Aujourd'hui |
| `flashcards.html` | Flash 5 min / 8 cartes |
| `qcm-player.html` | QCM révisions |
| `deck.html` | Fiche deck |
| `phrases.html` | Phrases + dialogues A/B |
| `verbes.html` | Conjugaisons |
| `suivi.html` | Streak, ratés, % |
