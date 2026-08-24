# Darija sétifienne — corpus pour fiches & exos

Corpus de **darija algérienne** centré sur **Sétif** (Hauts-Plateaux, Est).  
Fait pour que tu puisses, plus tard, en tirer des **fiches**, des **QCM**, des **cloze** et des **mini-dialogues** sans tout retaper.

Ce n’est pas un dictionnaire académique : c’est un **stock d’apprentissage**, avec une structure stable.

---

## Fichiers

| Fichier | Contenu |
| --- | --- |
| [00-guide.md](00-guide.md) | Transcription, particularités sétifiennes, mini-grammaire |
| [01-lexique-setif.md](01-lexique-setif.md) | ~200 mots **locaux** (lah, denq, berboucha, 3ajouz ta3na…) |
| [02-lexique-quotidien.md](02-lexique-quotidien.md) | ~400 mots **socle** (salutations, verbes, corps, chiffres…) |
| [03-phrases-dialogues.md](03-phrases-dialogues.md) | ~145 phrases + 6 mini-dialogues + paires Alger/Sétif |
| [04-verbes.md](04-verbes.md) | 12 verbes modèles conjugués (dont `nchti`, `denq`, `chayekh`) |

Volume utile : **~600 entrées lexique** + **~145 phrases** + conjugaisons. Suffisant pour un A1→B1 axé Sétif.

---

## Schéma (pour tes scripts plus tard)

Chaque ligne de lexique a les mêmes colonnes, séparées par `|` :

```
id | latn | arab | fr | ex | region | niv | tags
```

- `id` — identifiant unique (`SET-001`, `DZ-001`, `PH-001`)
- `latn` — latin « chat » (`3` ع, `7` ح, `9` ق)
- `arab` — graphie arabe indicative
- `fr` — sens
- `ex` — exemple + traduction (souvent ` — ` au milieu)
- `region` — `setif` · `est` · `dz`
- `niv` — `A1` · `A2` · `B1`
- `tags` — thèmes séparés par des virgules

Les phrases (`PH-xxx`) ont un schéma plus court : `id | latn | fr | tags`.

Un parseur Markdown → CSV / JSON / Anki n’a qu’à lire les lignes qui commencent par `| SET-` / `| DZ-` / `| PH-`.

---

## Par où commencer

1. Lire **10 minutes** le [guide](00-guide.md) (surtout *lah*, *marra*, *el-louta*, *nchti*, la famille *3ajouz/chikh*).
2. Apprendre d’abord les `SET-` en **A1**, puis les `DZ-` en **A1**.
3. Coller les mini-dialogues dans un enregistreur et les répéter.
4. Quand tu voudras des exos interactifs : on pourra générer des decks (recto-verso, cloze, « Sétif ou Alger ? ») à partir de ces tables, sans réécrire le corpus.

---

## Choix linguistiques

- **Accent visé** : ville de Sétif + villages des Hauts-Plateaux (El Eulma, Bougaa, Aïn Arnat…). Pas Alger, pas Oran.
- **Français dans la phrase** : conservé (`karti`, `sbadri`, `normalmu`). C’est le vrai parler.
- **Variation** : `denq` / `deng`, `dok` / `drok`. Les deux se disent.
- **Registre** : `el-3ajouz ta3na` = en famille. En société : `yemma` / `mama`.
- Sources croisées : glossaires sétifiens de forums (Tassili, 4algeria), articles (Wouroud El Djazaïr), gastronomie locale, darija nationale (Est) pour le socle.

La darija n’a pas d’orthographe officielle. Si un natif de Sétif écrit `wesh` ou `wach`, `Sṭif` ou `Stif`, les deux sont bons. Ici on reste **cohérent** pour que tes fiches ne se battent pas entre elles.

---

## Suite possible

Quand tu voudras la couche « interactive » :

- decks Anki / quizlet (latn ↔ fr, latn ↔ arab)
- exos « complète la phrase »
- audio (TTS ou enregistrements)
- un petit site de révisions par tags (`nourriture`, `meteo`, `famille`)
