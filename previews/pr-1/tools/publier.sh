#!/usr/bin/env bash
# Publie le contenu du dépôt sur la branche gh-pages, celle que GitHub Pages sert.
#
#   tools/publier.sh .                       → le site principal, à la racine
#   tools/publier.sh previews/pr-12          → un aperçu de branche, dans un sous-dossier
#   tools/publier.sh --supprimer previews/pr-12   → retire un aperçu devenu inutile
#
# Le site principal et les aperçus cohabitent sur la même branche : publier la
# racine ne touche pas aux aperçus, et publier un aperçu ne touche pas au site.
# C'est ce qui permet à chacun de voir son jeu en ligne avant le merge.
#
# Prévu pour tourner dans GitHub Actions (GITHUB_TOKEN et GITHUB_REPOSITORY
# fournis par le runner). La branche gh-pages est créée au premier passage.

set -euo pipefail

supprimer=false
if [[ "${1:-}" == "--supprimer" ]]; then
  supprimer=true
  shift
fi
destination="${1:?Usage : tools/publier.sh [--supprimer] <. | previews/pr-N>}"

# DEPOT_PUBLICATION permet de viser un autre dépôt que celui d'Actions, ce qui
# rend le script testable en local sur un dépôt bare.
if [[ -z "${DEPOT_PUBLICATION:-}" ]]; then
  : "${GITHUB_TOKEN:?GITHUB_TOKEN manquant — ce script est fait pour tourner dans Actions}"
  : "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY manquant}"
  DEPOT_PUBLICATION="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
fi

racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
publication="$(mktemp -d)"
depot="$DEPOT_PUBLICATION"

if git clone --quiet --depth 1 --branch gh-pages "$depot" "$publication" 2>/dev/null; then
  echo "→ branche gh-pages récupérée"
else
  echo "→ première publication : création de la branche gh-pages"
  rm -rf "$publication"
  mkdir -p "$publication"
  git -C "$publication" init -q -b gh-pages
  git -C "$publication" remote add origin "$depot"
fi

git -C "$publication" config user.name "github-actions[bot]"
git -C "$publication" config user.email "41898282+github-actions[bot]@users.noreply.github.com"

if $supprimer; then
  rm -rf "${publication:?}/${destination:?}"
  message="Retrait de l'aperçu ${destination}"
else
  cible="${publication}/${destination}"
  mkdir -p "$cible"

  # On vide la cible avant de recopier, pour que les fichiers retirés d'un jeu
  # disparaissent aussi du site. Deux choses sont protégées : le .git de la
  # branche, et previews/ quand on publie la racine — sans quoi mettre le site
  # à jour effacerait les aperçus de toutes les PR ouvertes.
  protege=(! -name '.git')
  if [[ "$destination" == "." ]]; then
    protege+=(! -name 'previews')
  fi
  find "$cible" -mindepth 1 -maxdepth 1 "${protege[@]}" -exec rm -rf {} +

  # cp plutôt que rsync : coreutils est présent partout, y compris hors runner.
  (cd "$racine" && find . -mindepth 1 -maxdepth 1 \
      ! -name '.git' ! -name '.github' ! -name 'node_modules' \
      -exec cp -a {} "$cible/" \;)

  # Sans ce fichier, Pages passe le site à Jekyll, qui ignore les dossiers
  # commençant par « _ » — games/_template disparaîtrait du site.
  touch "${publication}/.nojekyll"
  version="${GITHUB_SHA:-local}"
  message="Publication de ${destination} (${version:0:7})"
fi

cd "$publication"
git add -A
if git diff --cached --quiet; then
  echo "✓ rien à publier, le site est déjà à jour"
  exit 0
fi
git commit -q -m "$message"

# Les publications de branches différentes peuvent se croiser malgré le
# verrou de concurrence (annulations, relances) : on rebase et on retente.
for tentative in 1 2 3; do
  if git push -q origin gh-pages 2>/dev/null; then
    echo "✓ $message"
    exit 0
  fi
  echo "  publication concurrente détectée, tentative $tentative…"
  git pull -q --rebase origin gh-pages || true
  sleep $((tentative * 3))
done

echo "✗ échec de la publication après 3 tentatives" >&2
exit 1
