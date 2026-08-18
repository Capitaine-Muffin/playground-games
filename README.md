# playground-games

Atelier de production de jeux **à la chaîne**. On enchaîne les prototypes ici, on
les note, et les meilleurs partent vivre leur vie dans leur propre dépôt.

▶️ **Le site : https://capitaine-muffin.github.io/playground-games/**

## Le principe

```
   idée  ──▶  prototype dans games/  ──▶  on joue  ──▶  on note  ──▶  extraction
                                                            │
                                                            └──▶  abandonné
```

Ce dépôt est un **bac à sable jetable**. Rien n'a vocation à y rester
éternellement : un jeu bon en sort, un jeu raté y reste comme archive. Le dépôt
ne se dégrade pas tant que les 3 règles ci-dessous sont respectées.

## Les 3 règles (non négociables)

**1. Un jeu = un dossier autonome.**
`games/<slug>/` contient tout ce dont le jeu a besoin. Aucun chemin ne remonte
au-dessus de son propre dossier. On doit pouvoir déplacer le dossier n'importe où
et il marche toujours.

**2. Pas de code partagé.**
Il n'y a volontairement pas de `shared/`, pas de `lib/`, pas de `package.json`
à la racine. Si un pattern se répète d'un jeu à l'autre : **on le copie-colle**.
Dupliquer coûte quelques kilo-octets ; découpler après coup coûte une journée
et casse l'extraction.

**3. Zéro build.**
HTML + CSS + JS natif. On ouvre `index.html`, ça joue. Pas de `npm install`,
pas de bundler, pas de transpilation. C'est ce qui permet de sortir un jeu par
session au lieu d'un par semaine.

Ces trois règles sont vérifiées automatiquement à chaque PR par
`tools/verifier-jeux.mjs` — pas besoin de se relire mutuellement là-dessus.

## Travailler à deux

```
  main ────●────────────────────────●──────────▶   le site, tous les jeux en ligne
            \                      /
             ●───●───●  jeu/002-…  ─╯               une branche = un jeu
                     ▲
                     └── aperçu en ligne, propre à la branche
```

- **`main`** est le site. On n'y pousse jamais directement : tout passe par une PR.
- **Une branche par jeu**, courte, nommée d'après le jeu : `jeu/002-mon-jeu`.
  Pour un chantier sur la structure ou l'outillage : `atelier/<sujet>`.
- **Chaque PR reçoit son propre lien de test.** Un commentaire automatique donne
  l'URL de l'aperçu, mise à jour à chaque push. Le jeu se teste **au téléphone**,
  depuis la branche, avant tout merge. L'aperçu disparaît à la fermeture de la PR.
- **Le merge met le jeu en ligne** sur le site principal, automatiquement.

Une branche par jeu plutôt qu'une branche par personne : les branches restent
courtes et, comme chacun travaille dans son propre `games/<slug>/`, deux jeux
menés en parallèle ne se marchent jamais dessus.

Le seul fichier que deux branches peuvent se disputer est `games.json`. Il est
**entièrement généré** — ne jamais résoudre un conflit dessus à la main :

```bash
git checkout --ours games.json && node tools/build-index.mjs
```

## Structure

```
index.html            le hub : la liste des jeux, jouable en ligne
games.json            manifeste généré (ne pas éditer à la main)
games/
  _template/          squelette à copier pour démarrer un jeu
  001-empile/         un jeu = un dossier
    index.html
    game.js
    style.css
    meta.json         fiche d'identité + notes de sélection
tools/
  build-index.mjs     régénère games.json depuis les meta.json
  verifier-jeux.mjs   fait respecter les 3 règles
  publier.sh          publie le site et les aperçus sur gh-pages
  extract-game.sh     sort un jeu dans son propre dépôt, avec son historique
SELECTION.md          la grille de notation et le seuil d'extraction
```

## Créer un jeu

```bash
git switch main && git pull
git switch -c jeu/002-mon-jeu

cp -r games/_template games/002-mon-jeu
# éditer meta.json (titre, pitch, genre), puis coder dans game.js

node tools/build-index.mjs      # met à jour games.json — indispensable
```

Tester en local :

```bash
python3 -m http.server 8000     # → http://localhost:8000
```

Puis pousser la branche et ouvrir une PR : le lien d'aperçu arrive en commentaire
dans la minute, et c'est là qu'on teste au téléphone.

Numérotation : le numéro suivant se lit avec `ls games/`. On ne renumérote jamais
un jeu existant, même si un jeu intermédiaire est supprimé.

## Extraire un jeu retenu

Quand un jeu passe le seuil de `SELECTION.md`, il part dans son propre dépôt
**en conservant son historique git** :

```bash
tools/extract-game.sh 001-empile
```

Le script produit un dépôt local prêt à pousser. Le jeu reste dans
`playground-games` avec le statut `extrait` et un lien vers son nouveau dépôt —
l'atelier garde la trace de tout ce qui en est sorti.

## Automatisations

| Workflow | Quand | Ce qu'il fait |
|---|---|---|
| `verification.yml` | chaque PR et push sur `main` | vérifie `games.json` et les 3 règles |
| `apercu.yml` | ouverture / push / fermeture de PR | publie l'aperçu de la branche et commente le lien |
| `publier.yml` | push sur `main` | met le site à jour |

Le site et les aperçus cohabitent sur la branche `gh-pages` : la racine est le
site, `previews/pr-N/` est l'aperçu de la PR n° N.
