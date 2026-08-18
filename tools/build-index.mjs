#!/usr/bin/env node
// Régénère games.json à partir des meta.json de chaque jeu.
// Usage : node tools/build-index.mjs [--check]
//   --check : ne réécrit rien, sort en erreur si games.json est périmé (CI)

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossierJeux = join(racine, 'games');
const sortie = join(racine, 'games.json');

const CRITERES = ['fun30s', 'rejouabilite', 'originalite', 'montrable'];
const STATUTS = ['prototype', 'retenu', 'extrait', 'abandonné'];
const SEUIL_TOTAL = 14;
const SEUIL_CRITERE = 3;

const erreurs = [];

// Un jeu est retenu s'il atteint le total ET qu'aucun critère ne s'effondre.
// Voir SELECTION.md — les deux conditions comptent, une moyenne ne suffit pas.
function evaluer(scores) {
  const notes = CRITERES.map((c) => scores?.[c]);
  if (notes.some((n) => typeof n !== 'number')) return { total: null, atteintSeuil: false, note: false };
  const total = notes.reduce((a, b) => a + b, 0);
  return { total, atteintSeuil: total >= SEUIL_TOTAL && notes.every((n) => n >= SEUIL_CRITERE), note: true };
}

const slugs = readdirSync(dossierJeux, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
  .map((e) => e.name)
  .sort();

const jeux = [];

for (const slug of slugs) {
  const cheminMeta = join(dossierJeux, slug, 'meta.json');
  if (!existsSync(cheminMeta)) {
    erreurs.push(`${slug} : meta.json manquant`);
    continue;
  }
  if (!existsSync(join(dossierJeux, slug, 'index.html'))) {
    erreurs.push(`${slug} : index.html manquant — le jeu ne serait pas jouable`);
  }

  let meta;
  try {
    meta = JSON.parse(readFileSync(cheminMeta, 'utf8'));
  } catch (e) {
    erreurs.push(`${slug} : meta.json illisible (${e.message})`);
    continue;
  }

  for (const champ of ['title', 'pitch', 'status']) {
    if (!meta[champ]) erreurs.push(`${slug} : champ "${champ}" manquant dans meta.json`);
  }
  if (meta.status && !STATUTS.includes(meta.status)) {
    erreurs.push(`${slug} : statut "${meta.status}" inconnu (attendu : ${STATUTS.join(', ')})`);
  }
  for (const c of CRITERES) {
    const n = meta.scores?.[c];
    if (n !== null && n !== undefined && (typeof n !== 'number' || n < 0 || n > 5)) {
      erreurs.push(`${slug} : score "${c}" invalide (${n}) — attendu 0 à 5 ou null`);
    }
  }

  const { total, atteintSeuil, note } = evaluer(meta.scores);
  if (meta.status === 'retenu' && !atteintSeuil) {
    erreurs.push(`${slug} : statut "retenu" mais la grille de SELECTION.md n'est pas atteinte`);
  }

  jeux.push({
    slug,
    title: meta.title ?? slug,
    pitch: meta.pitch ?? '',
    genre: meta.genre ?? [],
    controls: meta.controls ?? '',
    created: meta.created ?? null,
    status: meta.status ?? 'prototype',
    repo: meta.repo ?? null,
    scores: meta.scores ?? null,
    total,
    note,
    atteintSeuil,
  });
}

if (erreurs.length) {
  console.error('✗ Problèmes détectés :');
  for (const e of erreurs) console.error(`  - ${e}`);
  process.exit(1);
}

const contenu = JSON.stringify({ games: jeux }, null, 2) + '\n';

if (process.argv.includes('--check')) {
  // Git peut convertir les fins de ligne en CRLF sous Windows. Le manifeste
  // est identique dans ce cas : on contrôle son contenu, pas son encodage de
  // fin de ligne, pour que la vérification soit la même partout.
  const actuel = existsSync(sortie)
    ? readFileSync(sortie, 'utf8').replace(/\r\n/g, '\n')
    : '';
  if (actuel !== contenu) {
    console.error('✗ games.json est périmé — lance : node tools/build-index.mjs');
    process.exit(1);
  }
  console.log(`✓ games.json à jour (${jeux.length} jeu·x)`);
} else {
  writeFileSync(sortie, contenu);
  console.log(`✓ games.json régénéré — ${jeux.length} jeu·x`);
  const retenus = jeux.filter((j) => j.atteintSeuil && j.status !== 'extrait');
  if (retenus.length) {
    console.log(`  ${retenus.length} jeu·x passe·nt le seuil et attende·nt extraction :`);
    for (const j of retenus) console.log(`    → ${j.slug} (${j.total}/20)`);
  }
}
