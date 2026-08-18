// Empile — un bloc glisse, tu le lâches, ce qui dépasse tombe.
// Une seule touche, une seule décision : quand appuyer.

const CLE_RECORD = 'empile.record';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const elScore = document.getElementById('score');
const elBest = document.getElementById('best');

const HAUTEUR_BLOC = 30;      // épaisseur d'un étage, en px CSS
const TOLERANCE = 6;          // écart en px encore considéré comme un « pile poil »
const BALAYAGE_LENT = 2.0;    // secondes pour traverser l'écran au 1er étage
const BALAYAGE_RAPIDE = 0.75; // plancher, atteint vers 35 étages
const GAIN_LARGEUR = 14;      // largeur récupérée quand on enchaîne les « pile poil »
const COMBO_GAIN = 3;         // nombre de « pile poil » d'affilée avant de récupérer

let L = 0, H = 0;
let etat = 'accueil';          // accueil | jeu | fin
let score = 0;
let record = Number(localStorage.getItem(CLE_RECORD) || 0);

let tour = [];                 // étages posés, du bas vers le haut : { x, w, teinte }
let mobile = null;             // le bloc en mouvement
let chutes = [];               // morceaux coupés en train de tomber
let largeurInitiale = 0;
let combo = 0;
let flash = 0;                 // éclat blanc au moment d'un « pile poil »
let camera = 0;                // décalage vertical lissé
let cameraCible = 0;
let teinteBase = Math.random() * 360;
let verrouJusqua = 0;          // ignore les appuis trop rapprochés (voir action)

// Le monde a son origine au sol : l'étage i occupe les y de -(i+1)*H_BLOC à -i*H_BLOC.
// La caméra ramène l'étage courant à une hauteur fixe de l'écran, ce qui donne
// l'impression que la tour descend au lieu que la vue monte.
const ancre = () => H * 0.68;
const cibleCamera = (n) => ancre() + n * HAUTEUR_BLOC;
const mondeVersEcran = (y) => y + camera;

function redimensionner() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  L = window.innerWidth;
  H = window.innerHeight;
  canvas.style.width = L + 'px';
  canvas.style.height = H + 'px';
  canvas.width = Math.round(L * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cameraCible = cibleCamera(tour.length);
}
window.addEventListener('resize', redimensionner);
redimensionner();

// --- Entrées ---------------------------------------------------------------
function action() {
  // Sans ce verrou, le second appui d'un double-tap impatient sur l'écran de
  // départ pose le bloc alors qu'il n'est pas encore entré : game over à 0.
  // Il protège aussi l'écran de fin, qu'on n'a pas le temps de lire sinon.
  if (performance.now() < verrouJusqua) return;
  if (etat === 'jeu') poser();
  else demarrer();
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
    e.preventDefault();
    action();
  }
});
window.addEventListener('pointerdown', (e) => { e.preventDefault(); action(); });

// --- Cycle de vie ----------------------------------------------------------
function demarrer() {
  score = 0;
  combo = 0;
  flash = 0;
  chutes = [];
  teinteBase = Math.random() * 360;
  largeurInitiale = Math.min(L * 0.52, 260);

  tour = [{ x: (L - largeurInitiale) / 2, w: largeurInitiale, teinte: teinteBase }];
  camera = cameraCible = cibleCamera(tour.length);
  nouveauMobile();

  etat = 'jeu';
  verrouJusqua = performance.now() + 260;
  overlay.classList.remove('visible');
  majHud();
}

function perdre() {
  etat = 'fin';
  verrouJusqua = performance.now() + 450;
  mobile = null;
  const bat = score > record;
  if (bat) {
    record = score;
    localStorage.setItem(CLE_RECORD, String(record));
  }
  overlay.querySelector('h1').textContent = `${score} étage${score > 1 ? 's' : ''}`;
  overlay.querySelector('#consigne').textContent = bat
    ? 'Nouveau record ! Tu peux faire mieux ?'
    : `Ton record : ${record} étages`;
  overlay.querySelector('.cta').innerHTML = 'Appuie sur <kbd>Espace</kbd> pour rejouer';
  overlay.classList.add('visible');
  majHud();
}

function majHud() {
  elScore.textContent = String(score);
  elBest.textContent = `record ${record}`;
}

// --- Gameplay --------------------------------------------------------------
function nouveauMobile() {
  const dessous = tour[tour.length - 1];
  // La vitesse se déduit de la largeur d'écran : un balayage doit durer le
  // même temps sur téléphone et sur desktop, sinon le jeu n'a pas le même
  // rythme selon l'appareil sur lequel on l'évalue.
  const duree = Math.max(BALAYAGE_RAPIDE, BALAYAGE_LENT - tour.length * 0.035);
  const vitesse = (L + dessous.w) / duree;
  // On alterne le côté de départ pour que le rythme ne devienne pas mécanique.
  const versLaDroite = tour.length % 2 === 0;
  mobile = {
    x: versLaDroite ? -dessous.w : L,
    w: dessous.w,
    vx: versLaDroite ? vitesse : -vitesse,
    teinte: (teinteBase + tour.length * 5) % 360,
  };
}

function poser() {
  const dessous = tour[tour.length - 1];
  const gauche = Math.max(mobile.x, dessous.x);
  const droite = Math.min(mobile.x + mobile.w, dessous.x + dessous.w);
  const largeur = droite - gauche;

  if (largeur <= 0) {
    // Raté complet : le bloc entier tombe, la partie s'arrête.
    ajouterChute(mobile.x, mobile.w, mobile.teinte, Math.sign(mobile.vx));
    perdre();
    return;
  }

  const ecart = Math.abs(mobile.x - dessous.x);

  if (ecart <= TOLERANCE) {
    // Pile poil : on aligne, et enchaîner en récupère un peu de largeur perdue.
    combo++;
    flash = 1;
    let w = dessous.w;
    if (combo >= COMBO_GAIN) w = Math.min(w + GAIN_LARGEUR, largeurInitiale);
    tour.push({ x: dessous.x, w, teinte: mobile.teinte });
  } else {
    combo = 0;
    // La partie qui dépasse est découpée et part en chute libre.
    if (mobile.x < gauche) ajouterChute(mobile.x, gauche - mobile.x, mobile.teinte, -1);
    else ajouterChute(droite, mobile.x + mobile.w - droite, mobile.teinte, 1);
    tour.push({ x: gauche, w: largeur, teinte: mobile.teinte });
  }

  score++;
  majHud();
  cameraCible = cibleCamera(tour.length);
  nouveauMobile();
}

function ajouterChute(x, w, teinte, sens) {
  if (w <= 0.5) return;
  chutes.push({
    x, w, teinte,
    y: -(tour.length + 1) * HAUTEUR_BLOC,
    vy: -30,
    vx: sens * 55,
    rot: 0,
    vrot: sens * 2.4,
  });
}

function update(dt) {
  camera += (cameraCible - camera) * Math.min(dt * 9, 1);
  if (flash > 0) flash = Math.max(0, flash - dt * 3);

  if (mobile) {
    mobile.x += mobile.vx * dt;
    // Le bloc sort franchement de l'écran avant de revenir : ça laisse une
    // respiration au joueur au lieu d'un aller-retour collé aux bords.
    if (mobile.vx > 0 && mobile.x > L) mobile.vx = -Math.abs(mobile.vx);
    else if (mobile.vx < 0 && mobile.x + mobile.w < 0) mobile.vx = Math.abs(mobile.vx);
  }

  for (const c of chutes) {
    c.vy += 1400 * dt;
    c.y += c.vy * dt;
    c.x += c.vx * dt;
    c.rot += c.vrot * dt;
  }
  chutes = chutes.filter((c) => mondeVersEcran(c.y) < H + 200);
}

// --- Rendu -----------------------------------------------------------------
function bloc(x, y, w, teinte, opacite = 1) {
  const h = HAUTEUR_BLOC;
  ctx.globalAlpha = opacite;
  ctx.fillStyle = `hsl(${teinte} 58% 56%)`;
  ctx.fillRect(x, y, w, h);
  // Une arête claire en haut et une ombre en bas suffisent à donner du relief
  // sans passer par un rendu isométrique.
  ctx.fillStyle = `hsl(${teinte} 62% 68%)`;
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = `hsl(${teinte} 45% 42%)`;
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.globalAlpha = 1;
}

function fond() {
  const progression = Math.min(tour.length / 40, 1);
  const d = ctx.createLinearGradient(0, 0, 0, H);
  d.addColorStop(0, `hsl(${(teinteBase + 200) % 360} ${18 + progression * 14}% ${7 + progression * 9}%)`);
  d.addColorStop(1, '#0d1017');
  ctx.fillStyle = d;
  ctx.fillRect(0, 0, L, H);
}

function draw() {
  fond();

  // On ne dessine que les étages visibles : au-delà de quelques centaines
  // d'étages, tout redessiner ferait chuter le framerate pour rien.
  for (let i = tour.length - 1; i >= 0; i--) {
    const y = mondeVersEcran(-(i + 1) * HAUTEUR_BLOC);
    if (y > H) break;
    if (y + HAUTEUR_BLOC < 0) continue;
    bloc(tour[i].x, y, tour[i].w, tour[i].teinte);
  }

  for (const c of chutes) {
    ctx.save();
    ctx.translate(c.x + c.w / 2, mondeVersEcran(c.y) + HAUTEUR_BLOC / 2);
    ctx.rotate(c.rot);
    bloc(-c.w / 2, -HAUTEUR_BLOC / 2, c.w, c.teinte, 0.85);
    ctx.restore();
  }

  if (mobile) {
    const y = mondeVersEcran(-(tour.length + 1) * HAUTEUR_BLOC);
    bloc(mobile.x, y, mobile.w, mobile.teinte);

    // Repère d'alignement : sans lui, viser au pixel près relève de la chance.
    const dessous = tour[tour.length - 1];
    ctx.strokeStyle = 'rgba(255, 255, 255, .16)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(dessous.x + 0.5, 0);
    ctx.lineTo(dessous.x + 0.5, H);
    ctx.moveTo(dessous.x + dessous.w - 0.5, 0);
    ctx.lineTo(dessous.x + dessous.w - 0.5, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.14})`;
    ctx.fillRect(0, 0, L, H);
  }

  if (combo >= COMBO_GAIN && etat === 'jeu') {
    // Au-dessus de la ligne du bloc courant : la zone est vide, alors que
    // sous l'ancre le texte se posait en travers de la tour.
    const y = mondeVersEcran(-(tour.length + 1) * HAUTEUR_BLOC) - 20;
    ctx.fillStyle = 'rgba(255, 255, 255, .78)';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${combo} pile poil d'affilée`, L / 2, y);
    ctx.textAlign = 'left';
  }
}

// --- Boucle ----------------------------------------------------------------
let precedent = performance.now();

function boucle(maintenant) {
  // dt plafonné : au retour d'un onglet resté en arrière-plan, un dt énorme
  // ferait traverser l'écran au bloc en une seule image.
  const dt = Math.min((maintenant - precedent) / 1000, 0.05);
  precedent = maintenant;

  if (etat !== 'accueil') update(dt);
  draw();
  requestAnimationFrame(boucle);
}

// Écran d'accueil : une tour décorative pour montrer de quoi il s'agit.
largeurInitiale = Math.min(L * 0.52, 260);
tour = Array.from({ length: 6 }, (_, i) => ({
  x: (L - largeurInitiale) / 2 + Math.sin(i * 1.1) * 16,
  w: largeurInitiale - i * 6,
  teinte: (teinteBase + i * 5) % 360,
}));
camera = cameraCible = cibleCamera(tour.length);
majHud();
requestAnimationFrame(boucle);
