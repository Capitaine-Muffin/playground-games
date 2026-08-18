#!/usr/bin/env bash
# Sort un jeu de l'atelier vers son propre dépôt, en conservant son historique git.
#
#   tools/extract-game.sh <slug> [nom-du-nouveau-dépôt]
#
# Exemple : tools/extract-game.sh 001-empile
#           → crée ../empile, un dépôt git contenant uniquement ce jeu,
#             avec tous les commits qui l'ont touché.

set -euo pipefail

racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$racine"

slug="${1:-}"
if [[ -z "$slug" ]]; then
  echo "Usage : tools/extract-game.sh <slug> [nom-du-nouveau-dépôt]" >&2
  echo "Jeux disponibles :" >&2
  ls games/ | grep -v '^_' | sed 's/^/  /' >&2
  exit 1
fi

if [[ ! -d "games/$slug" ]]; then
  echo "✗ games/$slug n'existe pas." >&2
  exit 1
fi

# Nom par défaut : le slug sans son préfixe numérique (001-empile → empile)
nom="${2:-$(echo "$slug" | sed 's/^[0-9]\{1,\}-//')}"
destination="$racine/../$nom"

if [[ -e "$destination" ]]; then
  echo "✗ $destination existe déjà. Choisis un autre nom ou supprime-le." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ Working tree non propre. Commit ou stash avant d'extraire." >&2
  exit 1
fi

branche="export-$slug"
git branch -D "$branche" >/dev/null 2>&1 || true

echo "→ Découpage de l'historique de games/$slug…"
git subtree split --prefix="games/$slug" -b "$branche" >/dev/null

echo "→ Création du dépôt $destination…"
mkdir -p "$destination"
git -C "$destination" init -q -b main
git -C "$destination" pull -q "$racine" "$branche"

git branch -D "$branche" >/dev/null

commits=$(git -C "$destination" rev-list --count HEAD)
echo
echo "✓ $nom extrait — $commits commit·s d'historique conservé·s dans $destination"
echo
echo "Étapes suivantes :"
echo "  1. Créer le dépôt vide '$nom' sur GitHub"
echo "  2. cd $destination"
echo "     git remote add origin git@github.com:Capitaine-Muffin/$nom.git"
echo "     git push -u origin main"
echo "  3. Dans playground-games, marquer le jeu comme sorti :"
echo "     games/$slug/meta.json → \"status\": \"extrait\","
echo "                             \"repo\": \"https://github.com/Capitaine-Muffin/$nom\""
echo "     node tools/build-index.mjs && git commit -am \"$slug extrait vers $nom\""
