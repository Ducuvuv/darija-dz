# TODO — app Darija (style PASS / Biochimie)

Roadmap pour construire **comme tes autres projets** : dossier `app/`, HTML/CSS/JS vanilla, localStorage, gh-pages — **optimisé langue** (arabe RTL, latn, decks, phrases).

Références :
- `PASS_Sorbonne/app/` — accueil « Aujourd’hui », flash SRS, suivi, tabbar
- `biochimie las 2/app/` — hub fiches, `engine.js` RPG/TDAH, QCM vies/combo

---

## Architecture cible (comme chez toi)

```
langues/
├── app/                          ← l’app (comme biochimie)
│   ├── index.html                ← hub + carte « Aujourd’hui »
│   ├── flashcards.html           ← session flash (5 min / 8 cartes)
│   ├── qcm-player.html           ← quiz (05-revisions + exos decks)
│   ├── deck.html                 ← une fiche/deck (lecture + mini-exos)
│   ├── phrases.html              ← phrases & dialogues (03, 08)
│   ├── verbes.html               ← tableaux 04-verbes
│   ├── suivi.html                ← streak, ratés, XP, decks %
│   ├── styles.css
│   ├── js/
│   │   ├── engine.js             ← DAR.* (copie adaptée de BIO.*)
│   │   ├── store.js              ← progrès decks, ratés, streak
│   │   ├── flash-srs.js          ← répétition espacée (comme PASS)
│   │   ├── today-target.js       ← « quoi faire aujourd’hui »
│   │   ├── flash-player.js       ← flip FR → arab
│   │   ├── qcm.js                ← QCM (adapté biochimie)
│   │   └── shell-tabbar.js       ← nav bas mobile (option PASS)
│   └── data/
│       └── cards.js              ← généré depuis les .md
├── scripts/
│   └── build-data.mjs            ← parse markdown → cards.js
├── 02-lexique-quotidien.md       ← source (inchangé)
├── … (tous les .md existants)
├── 13-plan-TDAH.md
└── 14-todo-site.md               ← ce fichier
```

**Deploy :** branche `gh-pages` → `https://…github.io/darija/` (comme biochimie)

**Pas de Next.js** — même stack que tes projets qui marchent déjà.

---

## Phase 0 — Décisions (ensemble, 5 min)

- [ ] **Nom** + URL GitHub (ex. `darija-deck`, `langues-dz`)
- [ ] **Visuel** : reprendre palette PASS (sobre) ou Biochimie (immersion colorée) ?
- [ ] **Tabbar** mobile comme PASS ? (Accueil · Flash · QCM · Suivi)
- [ ] **Repo git** dans `langues/` (init si pas encore)

---

## Phase 1 — Données (comme `data/qcm-all.js`)

- [x] Script `scripts/build-data.mjs` + `scripts/build-data.py` : lire les `.md` → `app/data/cards.js`
- [x] Parser tableaux `| id | fr | arab | latn | …`
- [x] Extraire **decks** depuis `## Deck N — Titre` ou `## Titre`
- [x] Types : `word` · `idiom` · `phrase` · `verb`
- [x] **`decks`** dans `cards.js` : id, titre, source, niv, count
- [x] Vérifier ~1 570 entrées, ids uniques → **1566 cartes · 91 decks**
- [x] Commande : `python scripts/build-data.py` (ou `node scripts/build-data.mjs` si Node installé)

**Format (comme tes QCM) :**

```js
window.DAR_DATA = {
  decks: [{ id: "02-deck-1", title: "Salutations", niv: "A1", count: 12 }],
  cards: [{ id: "DZ-001", deck: "02-deck-1", fr: "…", arab: "…", latn: "…", ex_arab: "…", ex_fr: "…", niv: "A1", tags: [] }],
  quizzes: [/* extrait de 05-revisions */]
};
```

---

## Phase 2 — Moteur TDAH (`engine.js`)

Reprendre **`biochimie las 2/app/engine.js`** quasi tel quel :

- [ ] Renommer `BIO` → `DAR`
- [ ] localStorage clé `darija_rpg_v1`
- [ ] XP · level · combo · badges · sfx (ok/bad/level)
- [ ] `addXp()` · `grantBadge()` · `burst()` confettis
- [ ] Toggle mute son
- [ ] Badges darija : « 8 cartes », « 7 jours », « Deck A1 fini », « 0 raté »

---

## Phase 3 — Accueil (`index.html`) — style PASS

- [ ] Carte **« Aujourd’hui »** : deck en cours + boutons Flash / QCM / Fiche
- [ ] **`today-target.js`** : reprendre où tu t’es arrêté (deck + index carte)
- [ ] Stats légères : jours · à revoir · % deck actuel
- [ ] **Hub decks** : grille cartes (comme biochimie fc1–fc6) par niveau A1→B2
- [ ] Pill « 5 min · 8 cartes · TDA-friendly »
- [ ] Lien **Guide** (`00-guide` en HTML ou md rendu)

---

## Phase 4 — Flashcards (`flashcards.html`) — cœur langue

Optimisations **spécifiques darija** (pas dans biochimie) :

- [x] **Face** : `fr` (gros, lisible)
- [x] **Dos** : `arab` en **RTL** + police **Amiri / Noto Naskh Arabic**
- [x] Sous l'arabe : `latn` (toggle ON par défaut)
- [x] Puis `ex_arab` (RTL) + `ex_fr`
- [x] Flip au tap
- [x] Boutons **✓ Je savais** / **✗ Raté** → alimente SRS + liste ratés
- [x] **Timer 5 min**
- [x] **Max 8 cartes** / session
- [x] **Mode flemme** : 5 ratés seulement, 2 min
- [x] **Sens inverse** : alternance auto + checkbox
- [x] Fin session : XP + résumé court

### SRS (`flash-srs.js`)

- [x] Copier logique **PASS** `flash-srs.js`
- [x] Cartes ratées → revue prioritaire (50 % session)
- [x] Intervalles simples : J1 · J3 · J7

---

## Phase 5 — Deck / fiche (`deck.html`)

Comme une **fiche biochimie** mais pour un deck langue :

- [ ] Titre deck + niveau + progression bar
- [ ] Liste cartes repliable (lecture seule, arabe voyellisé)
- [ ] **Mini-exos** du markdown (FR → darija, compléter)
- [ ] Bouton **« Lancer flash (8) »** → flashcards.html?deck=…
- [x] Section **paires** (rak/raki, kayen/makach) si présentes dans le md

---

## Phase 6 — QCM (`qcm-player.html` + `qcm.js`)

- [ ] Reprendre **`qcm.js`** biochimie (vies, combo, explications)
- [ ] Banques depuis `05-revisions.md` + exos decks
- [ ] Types : choix multiple · traduction FR→darija (4 latn)
- [ ] Explication = `ex_fr` / bonne réponse en `arab`
- [ ] XP en fin de QCM (hook `DAR.addXp`)

---

## Phase 7 — Phrases & verbes (pages dédiées)

- [ ] **`phrases.html`** : cartes phrase entière (`03`, `08`) — pas mot isolé
- [ ] **`verbes.html`** : tableaux conjugaison `04-verbes` (rani, nro7, kla…)
- [ ] Dialogues : lecture + bouton « jouer le dialogue » (A/B alterné)

---

## Phase 8 — Suivi (`suivi.html`) — style PASS

- [ ] Streak jours validés
- [ ] Liste **ratés** (comme points faibles PASS)
- [ ] % par deck / par niveau
- [ ] Badges débloqués
- [ ] Reset propre (nouvelle clé store v2)

---

## Phase 9 — CSS & mobile

- [ ] **`styles.css`** : reprendre structure biochimie (variables, hub-card, flash-card)
- [ ] Thème darija : teintes **ambre / sable / vert** (Algérie) — pas copier teal biochimie
- [ ] **Responsive** + safe-area (comme PASS viewport-fit)
- [ ] Tabbar bas si validé phase 0
- [x] PWA minimal (manifest + icône) — option

---

## Phase 10 — Deploy

- [ ] `.gitignore` (node_modules si script build)
- [ ] README section « Lien mobile » (comme biochimie)
- [ ] Push `gh-pages` depuis `/app`
- [ ] Tester sur téléphone

---

## Roadmap v2 — optimisation (ordre strict)

| # | Livrable | Statut |
| --- | --- | --- |
| 1 | TTS + bouton unique « Aujourd’hui » | **fait** |
| 2 | **Mode écoute** (arabe → répète → flip FR) | **fait** |
| 3 | PWA offline (service worker) | **fait** |
| 4 | Export Anki CSV (ratés) | **fait** |
| 5 | Encore + phrases orales (lots) | continu |
| 6 | Mode dictée latn + **clavier arabe** | **fait** |
| 7 | Paires/contrasts forcés | **fait** |
| 8 | Dialogues rôle A/B + pause | à faire |
| **FIN** | **Culture DZ + cours complets** | **en dernier** |

### Phase FINALE — Culture & cours (après toute la todo)

À faire **seulement quand** 1→8 sont done :

- [ ] Page **`culture.html`** (hub)
- [ ] **Villes** : Alger, Oran, Constantine, Sétif, Annaba, Tlemcen, Bejaia… (repères + vocab)
- [ ] **Figures** : personnages / artistes / sportifs / figures historiques (niveau approprié)
- [ ] **Fun facts** : 40–60 cartes courtes (food, foot, expressions, quotidien)
- [ ] **Cours complets** : modules structurés A1→B2 (grammaire + situations + checklists)
  - fichiers md type `20-cours-a1.md` … + pages app `cours.html` / `cours-module.html`
- [ ] Lien Culture depuis l’accueil + Suivi

---

## Ordre des sessions ensemble

| Session | On fait quoi | Livrable |
| --- | --- | --- |
| **1** | Phase 0 + 1 | `cards.js` + structure `app/` |
| **2** | Phase 2 + 3 | `engine.js` + `index.html` hub |
| **3** | Phase 4 | `flashcards.html` qui marche (8 cartes, RTL) |
| **4** | Phase 5 + 8 | deck + suivi + today-target |
| **5** | Phase 6 | QCM |
| **6** | Phase 7 + 9 + 10 | phrases, verbes, style, deploy |
| **7+** | Roadmap v2 #2→8 | écoute, PWA, Anki, phrases… |
| **DERNIÈRE** | Culture + cours complets | villes, figures, fun facts, modules |

---

## Spécifique langue (checklist à ne pas oublier)

- [x] Police arabe web (Google Fonts)
- [x] `dir="rtl"` / blocs arab
- [x] `latn` LTR
- [x] Taille police arabe ≥ 1.4rem
- [ ] Pas de « purifier » le franglais
- [x] Deck **Sétif** badge bonus Est
- [x] Export ratés → Anki

---

## Plus tard (après culture)

- [x] Audio TTS arabe (Web Speech API)
- [ ] Liens écoute (séries DZ) dans suivi
- [ ] Dark mode

---

## Prochaine étape

**Dialogues A/B + pause** → **Culture en tout dernier**.

