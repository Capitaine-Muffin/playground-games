// Squelette de jeu : boucle, entrées clavier + tactile, score, meilleur score.
// À copier tel quel et remplacer la partie « GAMEPLAY » par le vrai jeu.

const CLE_RECORD = 'template.record'; // à renommer par jeu, sinon les records se mélangent

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const elScore = document.getElementById('score');
const elBest = document.getElementById('best');

let L = 0, H = 0;              // dimensions logiques (px CSS)
let etat = 'accueil';          // accueil | jeu | fin
let score = 0;
let record = Number(localStorage.getItem(CLE_RECORD) || 0);

// --- Mise à l'échelle ------------------------------------------------------
// On dessine en pixels CSS et on laisse le contexte gérer la densité d'écran,
// sinon tout est flou sur mobile.
function redimensionner() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  L = window.innerWidth;
  H = window.innerHeight;
  canvas.style.width = L + 'px';
  canvas.style.height = H + 'px';
  canvas.width = Math.round(L * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', redimensionner);
redimensionner();

// --- Entrées ---------------------------------------------------------------
// Une seule action pour tout le jeu : c'est ce qui rend le jeu jouable au doigt
// comme au clavier sans écrire deux fois le code.
function action() {
  if (etat === 'accueil' || etat === 'fin') demarrer();
  else appui();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
    e.preventDefault();
    action();
  }
});
window.addEventListener('pointerdown', (e) => { e.preventDefault(); action(); });

// --- Cycle de vie ----------------------------------------------------------
function demarrer() {
  score = 0;
  etat = 'jeu';
  overlay.classList.remove('visible');
  initialiser();
  majHud();
}

function perdre() {
  etat = 'fin';
  const bat = score > record;
  if (bat) {
    record = score;
    localStorage.setItem(CLE_RECORD, String(record));
  }
  overlay.querySelector('h1').textContent = `${score} point${score > 1 ? 's' : ''}`;
  overlay.querySelector('#consigne').textContent = bat ? 'Nouveau record !' : `Ton record : ${record}`;
  overlay.querySelector('.cta').innerHTML = 'Appuie sur <kbd>Espace</kbd> pour rejouer';
  overlay.classList.add('visible');
  majHud();
}

function majHud() {
  elScore.textContent = String(score);
  elBest.textContent = `record ${record}`;
}

// --- GAMEPLAY (à remplacer) ------------------------------------------------
let joueur, cible;

function initialiser() {
  joueur = { x: L / 2, y: H / 2, r: 18, vx: 160, vy: 120 };
  placerCible();
}

function placerCible() {
  const m = 60;
  cible = { x: m + Math.random() * (L - 2 * m), y: m + Math.random() * (H - 2 * m), r: 12 };
}

function appui() {
  // L'action pendant la partie : ici, inverser la direction.
  joueur.vx *= -1;
  joueur.vy *= -1;
}

function update(dt) {
  joueur.x += joueur.vx * dt;
  joueur.y += joueur.vy * dt;

  if (joueur.x < joueur.r || joueur.x > L - joueur.r) joueur.vx *= -1;
  if (joueur.y < joueur.r || joueur.y > H - joueur.r) joueur.vy *= -1;

  if (Math.hypot(joueur.x - cible.x, joueur.y - cible.y) < joueur.r + cible.r) {
    score++;
    majHud();
    placerCible();
  }
}

function draw() {
  ctx.fillStyle = '#12141a';
  ctx.fillRect(0, 0, L, H);

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(cible.x, cible.y, cible.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(joueur.x, joueur.y, joueur.r, 0, Math.PI * 2);
  ctx.fill();
}

// --- Boucle ----------------------------------------------------------------
let precedent = performance.now();

function boucle(maintenant) {
  // dt plafonné : au retour d'un onglet resté en arrière-plan, un dt énorme
  // téléporterait tout à travers l'écran et traverserait les collisions.
  const dt = Math.min((maintenant - precedent) / 1000, 0.05);
  precedent = maintenant;

  if (etat === 'jeu') update(dt);
  draw();
  requestAnimationFrame(boucle);
}

initialiser();
majHud();
requestAnimationFrame(boucle);
