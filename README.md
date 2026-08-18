# playground-games

Atelier de production de jeux **à la chaîne**. On enchaîne les prototypes ici, on les
note, et les meilleurs partent vivre leur vie dans leur propre dépôt.

▶️ **Jouer : https://capitaine-muffin.github.io/playground-games/**

## Le principe

```
   idée  ──▶  prototype dans games/  ──▶  on joue  ──▶  on note  ──▶  extraction
                                                            │
                                                            └──▶  abandonné
```

Ce dépôt est un **bac à sable jetable**. Rien n'a vocation à y rester éternellement :
un jeu bon en sort, un jeu raté y reste comme archive. Le dépôt ne se dégrade pas
tant que les 3 règles ci-dessous sont respectées.

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
  extract-game.sh     sort un jeu dans son propre dépôt, avec son historique
SELECTION.md          la grille de notation et le seuil d'extraction
```

## Créer un jeu

```bash
cp -r games/_template games/00X-mon-jeu
# éditer meta.json (titre, pitch, genre), puis coder dans game.js
node tools/build-index.mjs      # met à jour games.json
```

Puis servir le dossier en local pour tester :

```bash
python3 -m http.server 8000     # → http://localhost:8000
```

Un push sur `main` redéploie automatiquement le hub et tous les jeux sur
GitHub Pages (voir `.github/workflows/pages.yml`).

## Extraire un jeu retenu

Quand un jeu passe le seuil de `SELECTION.md`, il part dans son propre dépôt
**en conservant son historique git** :

```bash
tools/extract-game.sh 001-empile
```

Le script produit un dépôt local prêt à pousser. Le jeu reste dans
`playground-games` avec le statut `extrait` et un lien vers son nouveau
dépôt — l'atelier garde la trace de tout ce qui en est sorti.

## Convention de nommage

`NNN-slug-en-minuscules` — le numéro donne l'ordre de production, le slug
reste lisible dans une URL. On ne renumérote jamais un jeu existant.
