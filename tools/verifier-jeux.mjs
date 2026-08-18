#!/usr/bin/env node
// Vérifie que chaque jeu respecte les règles qui rendent l'extraction possible.
// Ce sont les seules règles non négociables du dépôt (voir README.md) : autant
// qu'une machine les tienne, plutôt qu'une relecture humaine à chaque PR.
//
// Usage : node tools/verifier-jeux.mjs

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossierJeux = join(racine, 'games');

// Une ressource chargée depuis un autre domaine casse le jeu hors ligne et
// après extraction. On ne cible que les formes qui déclenchent vraiment un
// téléchargement : une URL dans un commentaire ou un espace de noms SVG
// (xmlns="http://www.w3.org/2000/svg") ne pose aucun problème.
const RESSOURCES_EXTERNES = [
  [/<link\b[^>]*\bhref\s*=\s*["']https?:/i, 'feuille de style ou icône distante'],
  [/<script\b[^>]*\bsrc\s*=\s*["']https?:/i, 'script distant'],
  [/<(?:img|audio|video|source|iframe)\b[^>]*\bsrc\s*=\s*["']https?:/i, 'média distant'],
  [/url\(\s*["']?https?:/i, 'url() distante en CSS'],
  [/@import\s+(?:url\(\s*)?["']https?:/i, '@import distant'],
  [/\bfetch\s*\(\s*["'`]https?:/i, 'fetch() vers un domaine externe'],
  [/\.src\s*=\s*["'`]https?:/i, 'ressource distante assignée en JS'],
];

const problemes = [];
const signaler = (jeu, fichier, message) =>
  problemes.push(`${jeu}${fichier ? `/${fichier}` : ''} : ${message}`);

function fichiersDe(dossier) {
  const trouves = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDe(chemin));
    else trouves.push(chemin);
  }
  return trouves;
}

const jeux = readdirSync(dossierJeux, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
  .map((e) => e.name)
  .sort();

if (!jeux.length) {
  console.error('✗ Aucun jeu dans games/');
  process.exit(1);
}

for (const jeu of jeux) {
  const dossier = join(dossierJeux, jeu);

  if (!existsSync(join(dossier, 'index.html'))) {
    signaler(jeu, '', 'index.html manquant — le jeu ne serait pas jouable');
  }

  for (const chemin of fichiersDe(dossier)) {
    const nom = relative(dossier, chemin);
    const ext = extname(chemin);

    if (statSync(chemin).size > 512 * 1024) {
      signaler(jeu, nom, 'fichier de plus de 512 Ko — les jeux restent légers');
    }
    if (!['.html', '.css', '.js', '.json', '.svg', '.md'].includes(ext)) continue;

    const contenu = readFileSync(chemin, 'utf8');

    // Règle 1 : un jeu ne sort jamais de son dossier, sinon l'extraction le casse.
    if (/["'(]\.\.\//.test(contenu)) {
      signaler(jeu, nom, 'référence « ../ » — le jeu doit rester autonome');
    }

    // Règle : aucune ressource externe, le jeu doit marcher hors ligne.
    for (const [motif, quoi] of RESSOURCES_EXTERNES) {
      if (motif.test(contenu)) signaler(jeu, nom, `${quoi} — aucune ressource externe`);
    }

    if (ext === '.js') {
      try {
        execFileSync(process.execPath, ['--check', chemin], { stdio: 'pipe' });
      } catch (e) {
        const detail = String(e.stderr ?? '').split('\n').find((l) => l.includes('Error')) ?? 'erreur de syntaxe';
        signaler(jeu, nom, `JavaScript invalide — ${detail.trim()}`);
      }
    }
    if (ext === '.json') {
      try {
        JSON.parse(contenu);
      } catch (e) {
        signaler(jeu, nom, `JSON invalide — ${e.message}`);
      }
    }
  }
}

if (problemes.length) {
  console.error('✗ Règles non respectées :');
  for (const p of problemes) console.error(`  - ${p}`);
  console.error('\nVoir les 3 règles dans README.md.');
  process.exit(1);
}

console.log(`✓ ${jeux.length} dossier·s de jeu conforme·s aux règles`);
