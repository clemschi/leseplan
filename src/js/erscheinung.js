/* ============================================================
   Erscheinungsbild
   ============================================================ */
/* Akzentfarben: je ein Wert für dunkel und hell, im Menü umstellbar. */
const AKZENTE = [
  { id: 'messing', name: 'Messing', dark: '#dba43f', light: '#8a6114' },
  { id: 'kupfer', name: 'Kupfer', dark: '#e08a55', light: '#a04d1c' },
  { id: 'rot', name: 'Rot', dark: '#e5706c', light: '#b02e2a' },
  { id: 'magenta', name: 'Magenta', dark: '#d97ab0', light: '#a02f75' },
  { id: 'violett', name: 'Violett', dark: '#9b8bf0', light: '#5344b5' },
  { id: 'blau', name: 'Blau', dark: '#5b9df0', light: '#1a5eb0' },
  { id: 'tuerkis', name: 'Türkis', dark: '#3fbfb2', light: '#0c766c' },
  { id: 'gruen', name: 'Grün', dark: '#5fbf7a', light: '#177a3c' },
  { id: 'grau', name: 'Grau', dark: '#c3c7cf', light: '#454d57' }
];
/* ===== Die Hülle =====
   In dieser Datei wohnen mehrere Apps. Was allen gemeinsam ist – Farbe, Hell
   oder Dunkel, Vollbild –, gehört der Hülle und liegt in einem eigenen kleinen
   Satz neben den Daten der Apps. Jede App hält ihre Einträge dagegen in einer
   eigenen JSON-Datenbasis. */
let SHELL = { theme: 'dark', akzent: 'messing', vollbildStart: true };
async function shellLesen() {
  try {
    const s = await IDB.get('shell');
    if (s && typeof s === 'object') SHELL = Object.assign(SHELL, s);
  } catch (e) { console.warn(e); }
}
function shellSchreiben() {
  try { IDB.set('shell', { theme: SHELL.theme, akzent: SHELL.akzent, vollbildStart: SHELL.vollbildStart }); }
  catch (e) { console.warn(e); }
}

const akzentAktiv = () => AKZENTE.find(a => a.id === SHELL.akzent) || AKZENTE[0];
/* Nebenfarben für die Vernetzung, je [hell, dunkel]. */
const TEAL = ['#0c766c', '#3fbfb2'], VIOLETT = ['#5344b5', '#9b8bf0'],
  ROSE = ['#a02f75', '#d97ab0'], MESSING = ['#8a6114', '#dba43f'];

function themeAnwenden() {
  const hell = SHELL.theme === 'light';
  document.documentElement.setAttribute('data-app-theme', hell ? 'light' : 'dark');
  const a = akzentAktiv();
  document.documentElement.style.setProperty('--accent', hell ? a.light : a.dark);
  /* Drei Farben müssen sich in der Vernetzung auseinanderhalten lassen:
     der Akzent für „beeinflusst von“, --wirkt für „wirkt auf“ und --beides,
     wenn zwei Autoren aufeinander gewirkt haben. Zu jedem Akzent stehen die
     beiden anderen darum eigens fest. */
  const DREI = {
    messing: [TEAL, ROSE], kupfer: [TEAL, VIOLETT], rot: [TEAL, VIOLETT],
    magenta: [TEAL, MESSING], violett: [TEAL, ROSE], blau: [TEAL, ROSE],
    tuerkis: [VIOLETT, MESSING], gruen: [VIOLETT, MESSING], grau: [TEAL, ROSE]
  };
  const [wirkt, beides] = DREI[a.id] || DREI.messing;
  document.documentElement.style.setProperty('--wirkt', hell ? wirkt[0] : wirkt[1]);
  document.documentElement.style.setProperty('--beides', hell ? beides[0] : beides[1]);
  const b = $('#btnTheme');
  if (b) b.innerHTML = hell ? ICON.moon : ICON.sun;
}
function themeUmschalten() {
  SHELL.theme = SHELL.theme === 'light' ? 'dark' : 'light';
  themeAnwenden();
  shellSchreiben();
}

/* ---------- Vollbild: Browserleisten verschwinden lassen ---------- */
/* Liegt die Seite auf dem Startbildschirm und startet ohne Browserleisten,
   gibt es nichts mehr auszublenden – und Chrome zeigt dann auch seinen
   Vollbild-Hinweis nicht, weil gar kein Vollbild angefordert wird. */
function alsAppGestartet() {
  try {
    if (navigator.standalone === true) return true;
    return ['standalone', 'fullscreen', 'minimal-ui']
      .some(m => matchMedia('(display-mode: ' + m + ')').matches);
  } catch (e) { return false; }
}
const vollbildGeht = () => !alsAppGestartet()
  && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
const vollbildAn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function vollbildUmschalten() {
  const el = document.documentElement;
  /* Beide Wege liefern ein Versprechen, das der Browser ablehnen darf – etwa
     wenn keine Geste dahintersteht. Das ist kein Fehler, nur kein Vollbild. */
  const still = p => { if (p && p.catch) p.catch(() => { }); };
  if (vollbildAn()) {
    still((document.exitFullscreen || document.webkitExitFullscreen).call(document));
  } else {
    const f = el.requestFullscreen || el.webkitRequestFullscreen;
    if (f) still(f.call(el, { navigationUI: 'hide' }));
  }
}
function vollbildKnopfMalen() {
  document.body.classList.toggle('voll', vollbildAn());
  if (typeof globalKnoepfeMalen === 'function') globalKnoepfeMalen();
  const b = $('#btnVoll');
  if (!b) return;
  b.hidden = !vollbildGeht();
  b.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
}
document.addEventListener('fullscreenchange', vollbildKnopfMalen);
document.addEventListener('webkitfullscreenchange', vollbildKnopfMalen);

/* Vollbild verlangt eine Geste des Nutzers – also bei der allerersten Berührung,
   schon auf dem Startbildschirm. Die Einstellung wird erst beim Auslösen gelesen. */
function vollbildAutostart() {
  if (!vollbildGeht()) return;
  const versuch = () => {
    document.removeEventListener('pointerdown', versuch, true);
    document.removeEventListener('keydown', versuch, true);
    try {
      if (SHELL.vollbildStart && vollbildGeht() && !vollbildAn()) vollbildUmschalten();
    } catch (e) { }
  };
  document.addEventListener('pointerdown', versuch, true);
  document.addEventListener('keydown', versuch, true);
}

