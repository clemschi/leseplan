'use strict';
/* ============================================================
   Leseplan – eine Datei, keine Daten darin.
   Alle Inhalte liegen im gewählten Speicher (Datei oder Gerät).
   ============================================================ */

/* ---------- kleine Helfer ---------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- Ruhe über der Tastatur ----------
   Über jedem Eingabefeld blendet Chrome seine Ausfüllhilfe ein – Schlüssel,
   Karte, Ortsnadel. Sie kommt nicht vom einzelnen Feld: Felder ohne Formular
   fasst Chrome zu einem einzigen gedachten Formular zusammen, und weil in
   dieser einen Datei alle Apps zugleich im Dokument stehen, sind das Dutzende
   Felder auf einmal – genug, damit Chrome darin ein Adressformular erkennt.
   `autocomplete=off` allein hilft dagegen nicht, das überspringt Chrome bei
   allem, was es für eine Anschrift hält.

   Darum bekommt jedes Feld sein eigenes Formular. Eines mit einem einzigen
   Feld bleibt unter der Schwelle, ab der Chrome überhaupt zu raten anfängt,
   und die Ausfüllhilfe bleibt weg. `display:contents` sorgt dafür, dass der
   Rahmen im Layout nicht vorkommt; Absenden gibt es nicht.

   Die Rechtschreibprüfung bleibt an – die Vorschlagsleiste der Tastatur
   gehört ihr selbst und lässt sich nur dort abstellen. */
/* Einzeilige Textfelder sind gar keine <input> mehr: über einem <input>
   bietet Chrome seine Ausfüllhilfe an – über einem Textfeld ohne <input> nie.
   Genau daran liegt es, dass die Leiste im Titel erscheint und in der
   Rückseite (einem <textarea>) nicht. Datum, Uhrzeit und Zahlen bleiben echte
   Felder, die brauchen ihre eigene Tastatur. */
const ZEILE_FELD = 'input[type=text],input[type=url],input:not([type])';
function feldZuZeile(inp) {
  const z = document.createElement('div');
  z.className = 'zeile' + (inp.className ? ' ' + inp.className : '');
  /* „plaintext-only" hält Formatierung und Umbrüche heraus; wo es das nicht
     gibt, tut es „true" mit eigener Einfüge-Regel. */
  z.setAttribute('contenteditable', 'plaintext-only');
  if (z.contentEditable !== 'plaintext-only') z.setAttribute('contenteditable', 'true');
  z.setAttribute('role', 'textbox');
  z.setAttribute('enterkeyhint', 'done');
  z.dataset.ruhig = '1';
  for (const a of Array.from(inp.attributes)) {
    if (a.name.startsWith('data-') || a.name === 'id' || a.name === 'style'
      || a.name === 'inputmode' || a.name === 'aria-label') z.setAttribute(a.name, a.value);
  }
  z.dataset.ph = inp.getAttribute('placeholder') || '';
  /* Nach aussen verhält sie sich wie ein Feld: .value lesen und setzen. */
  Object.defineProperty(z, 'value', {
    get() { return this.textContent; },
    set(v) { this.textContent = v == null ? '' : String(v); leerPflegen(this); }
  });
  z.value = inp.value || inp.getAttribute('value') || '';
  z.addEventListener('input', () => leerPflegen(z));
  z.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  z.addEventListener('paste', e => {
    if (z.getAttribute('contenteditable') === 'plaintext-only') return;
    e.preventDefault();
    const t = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, t);
  });
  inp.replaceWith(z);
  return z;
}
function leerPflegen(z) { z.classList.toggle('leer', !z.textContent); }
function zeilenMachen(wurzel) { $$(ZEILE_FELD, wurzel || document).forEach(feldZuZeile); }

/* Frisch gesetztes Markup wird sofort umgebaut – nicht erst, wenn der
   Beobachter drankommt. Sonst hängen die Handler, die gleich nach dem
   Zeichnen gesetzt werden, am alten Feld. */
(() => {
  const b = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: true,
    get() { return b.get.call(this); },
    set(v) { b.set.call(this, v); if (this.querySelector) zeilenMachen(this); }
  });
})();

const RUHIG_FELD = 'input:not([type=file]):not([type=radio]):not([type=checkbox]):not([type=range]),textarea';
function feldRuhig(el) {
  if (!el || el.dataset.ruhig) return;
  el.dataset.ruhig = '1';
  el.setAttribute('autocomplete', 'off');
  /* Passwortverwalter halten sich ebenfalls heraus. */
  el.setAttribute('data-lpignore', 'true');
  el.setAttribute('data-form-type', 'other');
  if (!el.form && el.parentNode) {
    const f = document.createElement('form');
    f.className = 'feldrahmen';
    f.setAttribute('autocomplete', 'off');
    f.addEventListener('submit', e => e.preventDefault());
    el.parentNode.insertBefore(f, el);
    f.appendChild(el);
  }
}
function felderRuhigStellen(wurzel) {
  zeilenMachen(wurzel);
  $$(RUHIG_FELD, wurzel || document).forEach(feldRuhig);
}
/* Auch alles, was erst später entsteht – Blätter, Ebenen, neu gezeichnete
   Ansichten. */
function felderBeobachten() {
  felderRuhigStellen();
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches && n.matches(RUHIG_FELD)) feldRuhig(n);
      else if (n.querySelectorAll) felderRuhigStellen(n);
    }
  }).observe(document.body, { childList: true, subtree: true });
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const heute = () => new Date().toISOString().slice(0, 10);
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function fmtDauer(min) {
  if (!min) return '0 min';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? (m ? h + ' h ' + m + ' min' : h + ' h') : m + ' min';
}
function fmtDauerKurz(min) {
  if (!min) return '–';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? h + ':' + String(m).padStart(2, '0') + ' h' : m + ' min';
}
const pl = (n, ein, viele) => n + ' ' + (n === 1 ? ein : viele);
/* Antike Jahreszahlen stehen negativ in den Daten. */
function jahrText(j) {
  if (j == null || j === '') return '–';
  return j < 0 ? Math.abs(j) + ' v. Chr.' : String(j);
}
function lebensdaten(geb, gest) {
  if (geb == null && gest == null) return null;
  const g = geb == null ? '?' : (geb < 0 ? Math.abs(geb) : geb);
  const t = gest == null ? '' : (gest < 0 ? Math.abs(gest) : gest);
  const vChr = (geb != null && geb < 0) || (gest != null && gest < 0);
  return g + '–' + t + (vChr ? ' v. Chr.' : '');
}
function fmtGeld(v) {
  if (v == null || !isFinite(v)) return '–';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtZahl(v, d) {
  if (v == null || !isFinite(v)) return '–';
  return v.toLocaleString('de-DE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
}
function fmtDatum(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return +d + '. ' + MONATE[+m - 1] + ' ' + y;
}
function relZeit(ts) {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'gerade eben';
  if (s < 3600) return 'vor ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'vor ' + Math.round(s / 3600) + ' h';
  return 'vor ' + Math.round(s / 86400) + ' Tagen';
}

const ICON = {
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  read: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5v13"/><path d="M12 6.5C10.5 5 8 4.5 4 4.8v12.4c4-.3 6.5.2 8 1.8 1.5-1.6 4-2.1 8-1.8V4.8c-4-.3-6.5.2-8 1.7z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  tags: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5V4h7.5L21 14.5 13.5 22 3 11.5z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
  books: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6a2 2 0 012 2v14a2.5 2.5 0 00-2.5-2H4z"/><path d="M20 4h-6a2 2 0 00-2 2v14a2.5 2.5 0 012.5-2H20z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 015.5 6h1.8l1.2-2h6l1.2 2h1.8A2.5 2.5 0 0120 8.5v9A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l4.5-4.5 4 3.5L16 13l4 4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L20 8l-4-4L4 16z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  herz: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.9-9.6-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.6 12c-2.1 4.1-9.6 9-9.6 9z"/></svg>',
  rueck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h11a5 5 0 0 1 0 10h-3"/><path d="M7 5L3 9l4 4"/></svg>',
  schieben: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h12M13 4l3 3-3 3"/><path d="M20 17H8M11 14l-3 3 3 3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h11L20.5 8v12.5H5z"/><path d="M8.5 3.5v6h7v-6M8.5 20.5V14h7v6.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>',
  voll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  vollAus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>'
};

/* ---------- Toast ---------- */
let toastT;
function toast(msg, ms) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, ms || 2600);
}

/* ---------- Sichtbarer Bereich ----------
   Auf dem Handy schiebt die Tastatur den unteren Teil des Fensters weg.
   Diese beiden Werte folgen dem, was wirklich zu sehen ist. */
(function viewportVerfolgen() {
  /* Der Browser soll das Layout selbst verkleinern, wenn die Tastatur aufgeht.
     Ohne das bleibt die Seitenhöhe stehen und alles rutscht darunter. */
  try {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      (document.head || document.documentElement).appendChild(meta);
    }
    if (!/interactive-widget/.test(meta.content)) {
      meta.content = meta.content.trim().replace(/,$/, '') + ', interactive-widget=resizes-content';
    }
  } catch (e) { }

  const vv = window.visualViewport;
  const setzen = () => {
    const wurzel = document.documentElement.style;
    wurzel.setProperty('--vvh', (vv ? vv.height : window.innerHeight) + 'px');
    wurzel.setProperty('--vvtop', (vv ? vv.offsetTop : 0) + 'px');
  };
  if (vv) {
    vv.addEventListener('resize', setzen);
    vv.addEventListener('scroll', setzen);
  }
  window.addEventListener('resize', setzen);
  window.addEventListener('orientationchange', () => setTimeout(setzen, 250));
  setzen();
})();

/* Das gerade beschriebene Feld in den sichtbaren Bereich holen. */
document.addEventListener('focusin', e => {
  const feld = e.target;
  if (!feld.matches || !feld.matches('input,textarea,select,.zeile')) return;
  if (!feld.closest('.sheet,.overlay')) return;
  setTimeout(() => {
    try { feld.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) { }
  }, 320);
});

