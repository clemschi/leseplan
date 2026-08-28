/* ============================================================
   Ebenen: Vollbild-Ansichten und Blätter von unten
   ============================================================ */
const Layers = [];
function layerOeffnen(node, onClose) {
  Layers.push({ node, onClose });
  $('#layers').appendChild(node);
  globalKnoepfeEinsetzen(node);
  /* Vollflächige Ebenen lassen sich vom linken Rand aus wegziehen. */
  if (node.classList && (node.classList.contains('overlay') || node.classList.contains('sto'))) ebeneZiehen(node);
  try { history.pushState({ layer: Layers.length }, ''); } catch (e) { }
  return node;
}
/* Wie viele Verlaufssprünge angestoßen, aber noch nicht angekommen sind.
   Jeder Aufruf von back() oder go() meldet genau ein popstate; solange eines
   aussteht, stammt es von uns und nicht von der Zurück-Taste. */
let zurueckOffen = 0;
/* Wie viele eigene Marken über der App im Verlauf liegen. Jede Ebene legt beim
   Öffnen ihre Nummer in den Zustand; ohne Zustand steht nichts von uns darüber.
   Weiter zurück als bis hierher darf niemand springen – ein Sprung darüber
   hinaus verlässt die Seite, und die App ist weg. */
const verlaufTiefe = () => (history.state && +history.state.layer) || 0;
function layerSchliessen() {
  if (!Layers.length) return;
  /* Sofort aus dem DOM: sonst schließt das später eintreffende popstate eine
     Ebene, die inzwischen darüber geöffnet wurde – etwa wenn aus der
     Buchauswahl heraus gleich die Timer-Frage aufgeht. */
  layerPop();
  if (!verlaufTiefe()) return;    /* keine eigene Marke: nichts zurückzuspulen */
  zurueckOffen++;
  try { history.back(); } catch (e) { zurueckOffen--; }
}
/* Alle offenen Ebenen auf einmal zu; der Verlauf wird danach zurückgespult –
   höchstens aber bis zur App selbst. */
function alleLayerSchliessen() {
  const n = Layers.length;
  if (!n) return;
  Layers.slice().reverse().forEach(l => { l.node.remove(); if (l.onClose) l.onClose(); });
  Layers.length = 0;
  const zurueck = Math.min(n, verlaufTiefe());
  if (!zurueck) return;
  zurueckOffen++;
  try { history.go(-zurueck); } catch (e) { zurueckOffen--; }
}
/* Die oberste Ebene gegen eine andere tauschen, ohne den Verlauf anzufassen.
   Schliessen und gleich wieder Öffnen ginge schief: das nachlaufende popstate
   des back() räumt sonst die eben erst geöffnete Ebene wieder weg. */
/* ---------- Hell/Dunkel und Vollbild, überall erreichbar ----------
   Jede Ebene und jedes Blatt bekommt das Paar automatisch eingesetzt; die
   Kopfzeile der App liegt darunter verdeckt. */
function globalKnoepfeHtml(mitSpeicher) {
  return '<span class="gknoepfe">'
    + (mitSpeicher ? '<button class="savechip" data-gsave data-state="clean" title="Jetzt sichern">'
      + '<span class="dot"></span><span class="st">gesichert</span></button>' : '')
    + '<button class="icon-btn" data-gtheme title="Hell oder dunkel" aria-label="Hell oder dunkel"></button>'
    + (vollbildGeht() ? '<button class="icon-btn" data-gvoll title="Vollbild" aria-label="Vollbild"></button>' : '')
    + '</span>';
}
function globalKnoepfeMalen(wurzel) {
  $$('[data-gtheme]', wurzel || document).forEach(b => {
    b.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  });
  $$('[data-gvoll]', wurzel || document).forEach(b => {
    b.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
  });
}
function globalKnoepfeEinsetzen(node) {
  const kopf = $('.ovl-head', node);
  if (kopf && !$('[data-gtheme]', kopf)) kopf.insertAdjacentHTML('beforeend', globalKnoepfeHtml(true));
  const blatt = $('.sheet', node);
  if (blatt && !$('[data-gtheme]', blatt)) blatt.insertAdjacentHTML('afterbegin', globalKnoepfeHtml(false));
  globalKnoepfeMalen(node);
  saveChipMalen();
}
$('#layers').addEventListener('click', e => {
  if (e.target.closest('[data-gtheme]')) {
    themeUmschalten();
    globalKnoepfeMalen();
    viewMalen();
  } else if (e.target.closest('[data-gvoll]')) {
    vollbildUmschalten();
  } else if (e.target.closest('[data-gsave]')) {
    (aktiverSpeicher || Store).alsDateiSichern(false);
  }
});

function layerErsetzen(node, onClose) {
  const alt = Layers.pop();
  if (alt) { alt.node.remove(); if (alt.onClose) alt.onClose(); }
  Layers.push({ node, onClose });
  $('#layers').appendChild(node);
  globalKnoepfeEinsetzen(node);
  return node;
}
function layerPop() {
  const l = Layers.pop();
  if (!l) return;
  l.node.remove();
  if (l.onClose) l.onClose();
}
window.addEventListener('popstate', () => {
  if (zurueckOffen > 0) zurueckOffen--;
  else layerPop();
  /* Sicherheitsnetz: nie mehr Ebenen offen halten, als Marken im Verlauf
     stehen. Kommt der Zähler einmal aus dem Tritt – zwei Sprünge kurz
     hintereinander –, räumt das hier auf, statt eine Ebene zurückzulassen,
     die die Zurück-Taste nicht mehr erreicht. */
  const tiefe = verlaufTiefe();
  while (Layers.length > tiefe) layerPop();
});

function blatt(titel, inhalt, opts) {
  opts = opts || {};
  const scrim = document.createElement('div');
  scrim.className = 'sheet-scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grip"></div>
      ${titel ? `<h3>${esc(titel)}</h3>` : ''}
      <div data-body></div>
    </div>`;
  const body = $('[data-body]', scrim);
  if (typeof inhalt === 'string') body.innerHTML = inhalt; else body.appendChild(inhalt);
  scrim.addEventListener('click', e => { if (e.target === scrim) layerSchliessen(); });
  (opts.ersetzen ? layerErsetzen : layerOeffnen)(scrim, opts.onClose);
  /* Nicht von selbst ins erste Feld springen – sonst fährt bei jedem Blatt
     die Tastatur hoch. Wer tippen will, tippt hinein. */
  const erstes = $('input,textarea,select,.zeile', body);
  if (erstes && opts.fokus === true) setTimeout(() => erstes.focus(), 80);
  ziehenZumSchliessen($('.sheet', scrim));
  return scrim;
}

/* Blatt mit dem Finger nach unten wegschieben.
   Touch-Ereignisse statt Pointer, weil nur dort das Scrollen der Seite
   rechtzeitig unterbunden werden kann. */
function ziehenZumSchliessen(sheet) {
  /* Nach derselben Regel wie der Kartenstapel: 1:1 am Finger, der bis zur
     Übernahme gelaufene Weg wird abgezogen, damit nichts hüpft; beim
     Loslassen entscheidet eine kurze Schwelle oder der Schwung. */
  let y0 = null, x0 = 0, ab = 0, zieht = false, hoehe = 1;
  let letztY = 0, letztT = 0, tempo = 0, weg = 0;

  const inScroller = el => {
    while (el && el !== sheet) {
      if (el.scrollHeight - el.clientHeight > 4) {
        const st = getComputedStyle(el).overflowY;
        if (st === 'auto' || st === 'scroll') return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const start = ev => {
    if (window.__zieht || sheet.scrollTop > 3) { y0 = null; return; }
    const ziel = ev.target;
    if (ziel.closest && ziel.closest('input,textarea,select,.zeile,button,pre,[data-akzent]')) { y0 = null; return; }
    if (inScroller(ziel)) { y0 = null; return; }
    const t = ev.touches ? ev.touches[0] : ev;
    y0 = t.clientY; x0 = t.clientX;
    zieht = false; weg = 0;
    hoehe = sheet.getBoundingClientRect().height || 400;
    letztY = y0; letztT = Date.now(); tempo = 0;
  };

  const bewegen = ev => {
    if (y0 == null) return;
    const t = ev.touches ? ev.touches[0] : ev;
    const dy = t.clientY - y0, dx = Math.abs(t.clientX - x0);
    if (!zieht) {
      /* Erst nach dem Richtungsentscheid übernehmen. */
      if (dy < -8 || (dx > 14 && dx > Math.abs(dy))) { y0 = null; sheet.style.transform = ''; return; }
      if (dy < 10) return;
      zieht = true; ab = dy; window.__zieht = true;
      sheet.style.transition = 'none';
      sheet.style.willChange = 'transform';
    }
    if (ev.cancelable) ev.preventDefault();
    const jetzt = Date.now();
    if (jetzt > letztT) { tempo = (t.clientY - letztY) / (jetzt - letztT); letztY = t.clientY; letztT = jetzt; }
    weg = Math.max(0, dy - ab);
    sheet.style.transform = 'translateY(' + weg.toFixed(1) + 'px)';
  };

  const ende = () => {
    if (y0 == null) return;
    y0 = null;
    if (!zieht) return;
    zieht = false;
    /* Ein hohes Blatt darf nicht mehr Weg verlangen als ein niedriges –
       darum ist die Schwelle nach oben gedeckelt. */
    const zu = weg > Math.max(90, Math.min(hoehe * 0.16, 160)) || tempo > 0.45;
    sheet.style.transition = 'transform .26s cubic-bezier(.2,.8,.3,1)';
    if (zu) {
      sheet.style.transform = 'translateY(' + Math.ceil(hoehe + 40) + 'px)';
      setTimeout(() => { window.__zieht = false; layerSchliessen(); }, 190);
    } else {
      sheet.style.transform = 'translateY(0)';
      setTimeout(() => {
        window.__zieht = false;
        sheet.style.transition = ''; sheet.style.transform = ''; sheet.style.willChange = '';
      }, 270);
    }
  };

  sheet.addEventListener('touchstart', start, { passive: true });
  sheet.addEventListener('touchmove', bewegen, { passive: false });
  sheet.addEventListener('touchend', ende);
  sheet.addEventListener('touchcancel', ende);
  /* Maus: dasselbe über Pointer */
  sheet.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'mouse') return;
    start(ev);
    const m = e => bewegen(e), u = () => { ende(); window.removeEventListener('pointermove', m); window.removeEventListener('pointerup', u); };
    window.addEventListener('pointermove', m);
    window.addEventListener('pointerup', u);
  });
}

function tabVerschieben(d) {
  const i = ANSICHTEN.indexOf(aktiverTab);
  if (i < 0) return;
  const j = clamp(i + d, 0, ANSICHTEN.length - 1);
  if (j !== i) tabWechseln(ANSICHTEN[j]);
}
/* ===== Zum Startbildschirm ziehen =====
   Von links nach rechts: die Flächen der App wandern am Finger mit und geben
   den Homescreen dahinter frei – 1:1 wie die Karten beim Stöbern, mit kurzer
   Schwelle und Schwung. Erst wenn der Zug durchgeht, wird wirklich
   umgeschaltet. */
(function heimZiehen() {
  /* Flächen, auf denen quer schon etwas anderes passiert – dort bleibt der
     Zug nach Hause aussen vor. */
  const tabu = '.book,.arow,.pager,.chiprow,.gal,.chart-scroll,.pagertabs,.cam,.lightbox,'
    + '.nowbar,.zsRahmen,.netz,.sto,input,textarea,select,.zeile,.sheet,.akk,'
    + '.kbahn,.kgitterrahmen,.frpult,.frbahn,.gkarte,.pztisch';
  /* In welcher App stehen wir gerade? */
  const flaeche = () => {
    if (!$('#app').hidden) return 'app';
    if (!$('#kal').hidden) return 'kal';
    if (!$('#fr').hidden) return 'fr';
    if (!$('#gs').hidden) return 'gs';
    if (!$('#mi').hidden) return 'mi';
    return null;
  };
  let x0 = null, y0 = 0, zieht = false, ab = 0, raus = false, grund = null;
  let letztX = 0, letztT = 0, tempo = 0;

  const breite = () => window.innerWidth || 360;
  const schwelle = () => Math.max(80, breite() * 0.26);

  const grundBauen = () => {
    grund = document.createElement('div');
    grund.className = 'splash heimgrund';
    grund.setAttribute('aria-hidden', 'true');
    grund.innerHTML = '<div class="apps">'
      + '<span class="app ist">leseliste</span>'
      + '<span class="app aus">kalender</span></div>';
    grund.style.opacity = '0';
    document.body.appendChild(grund);
    document.body.classList.add('heimzug');
  };

  const setzen = (dx) => {
    const f = clamp(dx / breite(), 0, 1);
    document.body.style.setProperty('--heimzug', dx.toFixed(1) + 'px');
    if (grund) grund.style.opacity = clamp(0.2 + f * 2, 0, 1).toFixed(3);
  };

  const aufraeumen = () => {
    document.body.classList.remove('heimzug', 'federt');
    document.body.style.removeProperty('--heimzug');
    if (grund && grund.isConnected) grund.remove();
    grund = null;
    window.__zieht = false;
    x0 = null; zieht = false;
  };

  const los = () => {
    if (x0 == null) return;
    if (!zieht) { x0 = null; window.__zieht = false; return; }
    x0 = null;
    document.body.classList.add('federt');
    if (raus) {
      setzen(breite());
      setTimeout(() => { aufraeumen(); if (typeof frAnhalten === 'function') frAnhalten(); zumStartbildschirm(); }, 250);
    } else {
      setzen(0);
      if (grund) grund.style.opacity = '0';
      setTimeout(aufraeumen, 270);
    }
  };

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || window.__zieht || zieht) { x0 = null; return; }
    const fl = flaeche();
    if (Layers.length || !fl) { x0 = null; return; }
    /* In der leseliste führt der Zug erst von der ersten Ansicht aus hinaus –
       davor blättert er durch die Reiter. */
    if (fl === 'app' && aktiverTab !== ANSICHTEN[0]) { x0 = null; return; }
    if (e.target.closest && e.target.closest(tabu)) { x0 = null; return; }
    const t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY; raus = false;
    letztX = x0; letztT = Date.now(); tempo = 0;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const t = e.touches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
    if (!zieht) {
      if (window.__zieht) { x0 = null; return; }
      if (dx < -8 || dy > 18) { x0 = null; return; }
      if (dx < 14) return;
      zieht = true; ab = dx; window.__zieht = true;
      grundBauen();
      setzen(0);
    }
    e.preventDefault();
    const jetzt = Date.now();
    if (jetzt > letztT) {
      tempo = (t.clientX - letztX) / (jetzt - letztT);
      letztX = t.clientX; letztT = jetzt;
    }
    const x = Math.max(0, dx - ab);
    raus = x > schwelle() || tempo > 0.45;
    setzen(x);
  }, { passive: false });

  document.addEventListener('touchend', los, { passive: true });
  document.addEventListener('touchcancel', los, { passive: true });
})();

(function wischNavigation() {
  let x0 = null, y0 = null, zeit = 0, gesperrt = false;
  /* .block steht bewusst nicht hier: dort gibt es nur langes Drücken zum
     Sortieren, kein waagerechtes Ziehen – der Wisch soll durchkommen. */
  const tabu = '.book,.arow,.pager,.chiprow,.gal,.chart-scroll,.pagertabs,.cam,.lightbox,'
    + '.nowbar,.zsRahmen,.netz,.sto,input,textarea,select,.sheet,.akk';
  document.addEventListener('touchstart', e => {
    /* Nur in der leseliste – der Kalender und der fastreader haben eigene
       Flächen, auf denen quer gewischt wird. */
    if (e.touches.length !== 1 || window.__zieht || $('#app').hidden) { x0 = null; return; }
    const t = e.touches[0];
    gesperrt = !!(e.target.closest && e.target.closest(tabu));
    x0 = t.clientX; y0 = t.clientY; zeit = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (x0 == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - zeit;
    x0 = null;
    if (gesperrt || window.__zieht || dt > 700) return;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 60) return;
    /* Offene Ebenen gehen am Finger (ebeneZiehen), nicht auf Zuruf. */
    if (Layers.length) return;
    if (dx > 0) {
      /* Ganz links angekommen führt der nächste Wisch aus der App heraus. */
      if (aktiverTab === ANSICHTEN[0]) zumStartbildschirm();
      else tabVerschieben(-1);
    }
    else tabVerschieben(1);
  }, { passive: true });
})();

function bestaetigen(titel, text, okLabel, gefaehrlich) {
  return new Promise(res => {
    let done = false;
    const s = blatt(titel, `
      <p class="muted" style="font-size:13.5px;line-height:1.6;margin-bottom:16px">${text}</p>
      <div class="btn-row">
        <button class="btn ${gefaehrlich ? 'btn-danger' : 'btn-primary'}" data-ok style="flex:1">${esc(okLabel || 'Ja')}</button>
        <button class="btn btn-ghost" data-no style="flex:1">Abbrechen</button>
      </div>`, {
      fokus: false,
      onClose: () => { if (!done) res(false); }
    });
    $('[data-ok]', s).onclick = () => { done = true; res(true); layerSchliessen(); };
    $('[data-no]', s).onclick = () => { done = true; res(false); layerSchliessen(); };
  });
}

