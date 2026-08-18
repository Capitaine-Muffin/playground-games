# Consignes pour Claude

Ce dépôt est un **atelier de jeux à la chaîne**. On y produit des prototypes vite,
on les note, on extrait les bons dans des dépôts séparés. Lis `README.md` pour le
principe et `SELECTION.md` pour la grille de notation.

## Ce qui compte ici

Le débit prime sur la perfection. Un prototype jouable aujourd'hui vaut mieux
qu'un jeu propre la semaine prochaine — c'est le jeu qui est évalué, pas le code.
En revanche les 3 règles structurelles ne se négocient pas, parce que ce sont
elles qui rendent l'extraction possible.

## Les 3 règles

1. **Un jeu = un dossier autonome** dans `games/<NNN-slug>/`. Aucun chemin relatif
   ne sort du dossier du jeu. Test mental : « si je déplace ce dossier ailleurs,
   est-ce que ça marche encore ? » Si non, c'est cassé.
2. **Pas de code partagé.** Pas de `shared/`, pas de `lib/` à la racine, pas de
   `package.json` racine. Un helper qui servirait à deux jeux se **copie-colle**
   dans les deux. Ne propose pas de factoriser : c'est un choix assumé, pas un
   oubli.
3. **Zéro build.** HTML/CSS/JS natif servi en statique. Pas de npm, pas de
   bundler, pas de TypeScript, pas de CDN externe (le jeu doit marcher hors ligne).

## Branches et PR

`main` est le site en ligne : **ne jamais y pousser directement**. Tout part
d'une branche courte et arrive par une PR.

- un jeu → `jeu/<NNN-slug>` (ex. `jeu/002-mon-jeu`)
- la structure, l'outillage, les docs → `atelier/<sujet>`

Chaque PR publie automatiquement un aperçu jouable à
`https://capitaine-muffin.github.io/playground-games/previews/pr-<N>/`, et un
commentaire pose le lien. C'est là que le jeu se teste au téléphone — donc
**ouvrir la PR tôt**, dès que le jeu est jouable, sans attendre qu'il soit fini.

`games.json` est le seul fichier que deux branches peuvent se disputer. Il est
généré : un conflit dessus ne se résout jamais à la main, on relance
`node tools/build-index.mjs`.

## Créer un nouveau jeu

```bash
git switch main && git pull
git switch -c jeu/002-mon-jeu
cp -r games/_template games/002-mon-jeu
```

Puis : remplir `meta.json`, coder dans `game.js`, et **toujours** finir par

```bash
node tools/build-index.mjs
```

qui régénère `games.json`. Un jeu absent de `games.json` n'apparaît pas dans le
hub. Ne jamais éditer `games.json` à la main.

Numérotation : le numéro suivant se lit avec `ls games/`. On ne renumérote jamais
un jeu existant, même si un jeu intermédiaire est supprimé.

## Contraintes techniques de chaque jeu

- **Jouable au clavier ET au tactile.** Les jeux sont évalués depuis un téléphone
  autant que depuis un desktop. Un jeu qui exige un clavier est un jeu à moitié
  testé.
- **Responsive**, sans scroll horizontal, et qui remplit l'écran disponible.
- **Aucune ressource externe** : pas de CDN, pas de police Google, pas d'image
  distante. Tout est local ou généré en code (canvas, CSS, SVG inline).
- **Un score et un meilleur score** en `localStorage` quand le genre s'y prête —
  c'est ce qui fait revenir, donc ce qui fait monter la note `rejouabilite`.
- **Pas de dépendance à un serveur.** `file://` doit marcher.

## Vérifier son travail

Le jeu doit avoir été **réellement lancé** avant d'être annoncé comme terminé —
pas seulement écrit. Servir en local et vérifier dans un navigateur :

```bash
python3 -m http.server 8000
```

Avant de pousser, faire tourner les deux vérifications que la CI fera de toute
façon — c'est plus rapide que d'attendre une PR rouge :

```bash
node tools/build-index.mjs      # regénère games.json
node tools/verifier-jeux.mjs    # autonomie, pas de ressource externe, syntaxe
```

## Notation et extraction

Ne jamais renseigner les `scores` d'un `meta.json` soi-même : les notes viennent
des humains qui ont joué. Le rôle de Claude s'arrête à `"status": "prototype"`
avec des scores à `null`.

L'extraction se fait par `tools/extract-game.sh <slug>` — ne jamais recopier un
jeu à la main dans un nouveau dépôt, ça perdrait son historique git.

## Style

Le dépôt est **en français** : docs, commentaires, noms de commits, textes des
jeux. Les identifiants de code restent en anglais quand c'est l'usage
(`draw`, `update`, `score`).
