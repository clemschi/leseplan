/* ============================================================
   g’sund – die vierte App
   Guzi · Puzzle · Bald · Mehr
   ============================================================ */

let GDB = leereGs();

function leereGs() {
  return {
    format: 'mylife-gsund',
    version: 1,
    erstellt: Date.now(),
    geaendert: Date.now(),
    einstellungen: { autosaveSek: 60 },
    /* Die Karte: vorn ein Titel mit Datum, hinten freier Text. */
    karte: { titel: '', datum: '', zeit: '', rueckseite: '' },
    /* Abgelegte Karten, die neueste zuerst. */
    vergangen: [],
    /* Für Puzzle, sobald klar ist, was dort hingehört. */
    puzzle: {}
  };
}

function gsNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const g = leereGs();
  g.erstellt = +d.erstellt || Date.now();
  g.einstellungen = Object.assign(g.einstellungen, d.einstellungen || {});
  const k = d.karte || {};
  g.karte = {
    titel: String(k.titel || '').slice(0, 200),
    datum: /^\d{4}-\d{2}-\d{2}$/.test(k.datum) ? k.datum : '',
    zeit: /^\d{2}:\d{2}$/.test(k.zeit) ? k.zeit : '',
    rueckseite: String(k.rueckseite || '').slice(0, 4000)
  };
  g.vergangen = Array.isArray(d.vergangen) ? d.vergangen.map(k => ({
    id: String(k.id || uid()),
    titel: String(k.titel || '').slice(0, 200),
    datum: /^\d{4}-\d{2}-\d{2}$/.test(k.datum) ? k.datum : '',
    zeit: /^\d{2}:\d{2}$/.test(k.zeit) ? k.zeit : '',
    rueckseite: String(k.rueckseite || '').slice(0, 4000),
    abgelegt: +k.abgelegt || Date.now()
  })).slice(0, 400) : [];
  g.puzzle = (d.puzzle && typeof d.puzzle === 'object') ? d.puzzle : {};
  return g;
}

const GStore = macheSpeicher({
  id: 'gsund', metaKey: 'meta-gsund', datenKey: 'daten-gsund', dateiname: 'gsund.json',
  daten: () => GDB, setzen: d => { GDB = d; }
});

function gAendern(fn) { if (fn) fn(); GStore.aendern(); }

const GICON = {
  karte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M12 5v14"/><path d="M6.5 9.5h2M15.5 9.5h2"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5h4a1 1 0 0 1 1 1v1.2a1.8 1.8 0 1 0 3.6 0V4.5h.9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1.2a1.8 1.8 0 1 0 0 3.6h1.2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1.2a1.8 1.8 0 1 0-3.6 0V19.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4"/><path d="M4.5 15.5V4.5a1 1 0 0 1 1-1H10"/></svg>',
  bald: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7M12 8.5v7"/></svg>',
  drehen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5"/><path d="M4 4.5v4h4"/><path d="M4 12.5A8 8 0 0 0 17.7 17.7L20 15.5"/><path d="M20 19.5v-4h-4"/></svg>'
};

/* ---------- Öffnen und Speicherort ---------- */
/* Den Weg dorthin geht appSpeicherort in speicher.js für alle Nebenapps
   gleich; hier stehen nur die Angaben von g'sund. */
const GORT = {
  store: GStore, name: 'g&rsquo;sund', datei: 'gsund.json',
  lead: 'Wo soll g&rsquo;sund seine Sachen ablegen? Auch diese App führt eine eigene Datei – die anderen bleiben davon unberührt.',
  normalisiere: gsNormalisiere, leer: leereGs, starten: () => gsStarten()
};
function gsundOeffnen() { return appSpeicherOeffnen(GORT); }
function gsSpeicherort(erneut) { appSpeicherort(GORT, erneut); }

/* ---------- Gerüst ---------- */
const GTABS = [
  { id: 'guzi', label: 'Guzi', icon: GICON.karte },
  { id: 'puzzle', label: 'Puzzle', icon: GICON.puzzle },
  { id: 'bald', label: 'Bald', icon: GICON.bald },
  { id: 'gmehr', label: 'Mehr', icon: ICON.more }
];
let gTab = 'guzi';
let gTakt = null;          // die Uhr des Countdowns
let gGedreht = false;      // liegt die Rückseite oben?
let gDrehung = 0;          // aufsummierter Winkel, damit beide Richtungen gehen

function gsStarten() {
  appFlaeche('gs');
  aktiverSpeicher = GStore;
  gTab = 'guzi';
  gGedreht = false; gDrehung = 0;
  themeAnwenden();
  gKnoepfeMalen();
  $('#gBtnTheme').onclick = () => { themeUmschalten(); gKnoepfeMalen(); gViewMalen(); };
  $('#gBtnVoll').onclick = vollbildUmschalten;
  $('#gBtnRaus').innerHTML = ICON.x;
  $('#gBtnRaus').onclick = () => { clearInterval(gTakt); zumStartbildschirm(); };
  $('#gBrand').onclick = () => { if (gTab !== 'guzi') gTabWechseln('guzi'); else window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#gSaveChip').onclick = () => GStore.alsDateiSichern(false);
  $('#gBanner').onclick = () => gVergangenOeffnen();
  gVorhangBinden();
  gTabbarMalen();
  gViewMalen();
  GStore.autosaveStarten();
  saveChipMalen();
}

function gKnoepfeMalen() {
  const t = $('#gBtnTheme'), v = $('#gBtnVoll');
  if (t) t.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  if (!v) return;
  v.hidden = !vollbildGeht();
  v.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
}
function gTabbarMalen() {
  $('#gtabbar').innerHTML = GTABS.map(t =>
    `<button data-gtab="${t.id}" aria-selected="${t.id === gTab}">${t.icon}<span>${t.label}</span></button>`).join('');
  $('#gtabbar').onclick = e => {
    const b = e.target.closest('[data-gtab]');
    if (b) gTabWechseln(b.dataset.gtab);
  };
}
function gTabWechseln(id) {
  gTab = id;
  gTabbarMalen();
  gViewMalen();
  window.scrollTo(0, 0);
}
function gViewMalen() {
  leistenHoeheMessen();
  clearInterval(gTakt);
  const v = $('#gview');
  gBannerMalen();
  if (gTab === 'guzi') gGuziMalen(v);
  else if (gTab === 'puzzle') gPuzzleMalen(v);
  else if (gTab === 'bald') gBaldMalen(v);
  else gMehrMalen(v);
  gKnoepfeMalen();
  saveChipMalen();
}

function gBannerMalen() {
  const b = $('#gBanner');
  const k = GDB.karte;
  const r = gRest(k);
  const n = GDB.vergangen.length;
  b.innerHTML = `
    <span class="kb-tag">${k.titel ? esc(k.titel) : 'Noch keine Karte'}</span>
    <span class="kb-zahlen">${r ? `<span class="num">${esc(r.kurz)}</span>` : '<span>ohne Datum</span>'}</span>
    <span class="gb-griff">${n ? '<i>' + n + '</i>' : ''}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>`;
  b.title = 'Vergangene ansehen';
}

/* ---------- Der Countdown ---------- */
/* Gibt Rest­zeit und Text zurück – auch, wenn der Tag schon vorbei ist. */
function gZiel(k) {
  if (!k.datum) return null;
  const t = k.zeit && /^\d{2}:\d{2}$/.test(k.zeit) ? k.zeit : '00:00';
  const d = kDatum(k.datum);
  const [st, mi] = t.split(':').map(Number);
  d.setHours(st, mi, 0, 0);
  return d.getTime();
}
function gRest(k) {
  const ziel = gZiel(k);
  if (!ziel) return null;
  const ms = ziel - Date.now();
  const weg = Math.abs(ms);
  const sek = Math.floor(weg / 1000);
  const teile = {
    tage: Math.floor(sek / 86400),
    std: Math.floor(sek / 3600) % 24,
    min: Math.floor(sek / 60) % 60,
    sek: sek % 60
  };
  const kurz = teile.tage
    ? teile.tage + ' T ' + String(teile.std).padStart(2, '0') + ':' + String(teile.min).padStart(2, '0')
    : String(teile.std).padStart(2, '0') + ':' + String(teile.min).padStart(2, '0') + ':' + String(teile.sek).padStart(2, '0');
  return Object.assign(teile, { ms, vorbei: ms < 0, kurz: (ms < 0 ? '+' : '') + kurz });
}

/* ---------- Guzi: die Karte ---------- */
/* Nur die Karte, sonst nichts: antippen ändert sie, gewischt wird sie
   gedreht, und ein schneller Zug nach oben legt sie zu den Vergangenen. */
function gGuziMalen(v) {
  const k = GDB.karte;
  const leer = gKarteLeer(k);
  v.innerHTML = `
    <div class="gbuehne">
      <div class="gkarte" data-karte style="transform:rotateY(${gDrehung}deg)">
        <div class="gseite vorn">
          ${leer ? `<div class="g-leer"><strong>Noch nichts auf der Karte</strong>
              Antippen: ein Titel, ein Datum – und der Countdown läuft.</div>`
      : `<div class="g-titel serif">${esc(k.titel) || 'Ohne Titel'}</div>
             ${k.datum ? `<div class="g-datum num">${esc(kTagText(k.datum, true))}${k.zeit ? ' · ' + esc(k.zeit) + ' Uhr' : ''}</div>` : ''}
             ${k.datum ? `<div class="g-uhr" data-uhr></div>
                <div class="g-uhrsub" data-uhrsub></div>` : '<div class="g-ohne">ohne Datum</div>'}`}
          <span class="g-marke">Vorderseite</span>
        </div>
        <div class="gseite hinten">
          ${k.rueckseite ? `<div class="g-rueck">${esc(k.rueckseite).replace(/\n/g, '<br>')}</div>`
      : `<div class="g-leer"><strong>Rückseite ist leer</strong>Platz für alles, was nicht auf die Vorderseite passt.</div>`}
          <span class="g-marke">Rückseite</span>
        </div>
      </div>
    </div>`;

  const karte = $('[data-karte]', v);
  const drehen = (richtung) => {
    gDrehung += richtung * 180;
    gGedreht = !gGedreht;
    karte.style.transform = 'rotateY(' + gDrehung + 'deg)';
  };
  /* Ein Tipp öffnet die Karte zum Ändern – gedreht wird nur mit dem Finger. */
  karte.onclick = () => {
    if (karte._gezogen) { karte._gezogen = false; return; }
    gKarteBearbeiten();
  };
  gKarteZiehen(karte, drehen, () => gKarteAblegen(karte));
  if (k.datum) gUhrLaufen(v);
}

function gKarteLeer(k) { return !k || (!k.titel && !k.datum && !k.rueckseite); }

/* Weglegen: die Karte fliegt nach oben weg und liegt danach bei den
   Vergangenen. Angeschaut wird sie dort erst, wenn man den Kopf herunterzieht –
   von selbst landet man nicht dort. */
function gKarteAblegen(karte) {
  const k = GDB.karte;
  if (gKarteLeer(k)) return false;
  karte.style.transition = 'transform .3s cubic-bezier(.3,.7,.3,1),opacity .28s ease';
  karte.style.transform = 'translateY(-130%) scale(.86) rotateX(26deg) rotateY(' + gDrehung + 'deg)';
  karte.style.opacity = '0';
  gAendern(() => {
    GDB.vergangen.unshift(Object.assign({ id: uid(), abgelegt: Date.now() }, k));
    GDB.vergangen = GDB.vergangen.slice(0, 400);
    GDB.karte = { titel: '', datum: '', zeit: '', rueckseite: '' };
  });
  GStore.sichern(true);
  setTimeout(() => {
    gDrehung = 0; gGedreht = false;
    gViewMalen();
    toast('Bei den Vergangenen.');
  }, 300);
  return true;
}

/* Wischen dreht und kippt: die Karte folgt der Hand in beide Richtungen –
   quer eine halbe Umdrehung je halber Kartenbreite, längs als Neigung. Beim
   Loslassen entscheiden Weg und Schwung, welche der drei Wege es wird. */
function gKarteZiehen(karte, drehen, ablegen) {
  let x0 = null, y0 = 0, zieht = false, abX = 0, abY = 0;
  let wegX = 0, wegY = 0, breite = 1, hoehe = 1, ganzX = 0;
  let letztX = 0, letztY = 0, letztT = 0, tempoX = 0, tempoY = 0;
  /* Eine halbe Umdrehung auf einmal, nicht mehr: solange der Ausklang läuft,
     nimmt die Karte keinen neuen Zug an. Sonst setzt ein zweiter Wisch auf der
     noch laufenden Drehung auf – die Karte springt auf den schon erreichten
     Endstand und dreht sich ein zweites Mal weiter. */
  let sperre = false, wache = 0;
  const loesen = () => {
    if (!sperre) return;
    clearTimeout(wache);
    sperre = false; window.__zieht = false; karte._gezogen = false;
  };
  const sperren = (ms) => {
    sperre = true; window.__zieht = true;
    clearTimeout(wache);
    wache = setTimeout(loesen, ms);
  };
  /* Die Sperre fällt, sobald die Drehung wirklich steht – die Zeit darunter
     ist nur die Reissleine, falls kein transitionend kommt. */
  karte.addEventListener('transitionend', e => {
    if (e.target === karte && e.propertyName === 'transform') loesen();
  });
  const grund = () => gDrehung;
  const malen = () => {
    /* Eine Achse, nicht zwei nacheinander: gekippt und gedreht wird um eine
       einzige Achse quer zur Zugrichtung – wie wenn man eine Platte am Rand
       anhebt. Zwei Drehungen hintereinander (erst kippen, dann drehen) legen
       eine Rollbewegung obendrauf, die sich beim Zug nach rechts und nach
       links gleich herum dreht – schräg gezogen fühlt sich dann eine der
       beiden Richtungen verkehrt an. Um eine Achse gibt es kein Rollen, und
       die Spiegelung stimmt in jede Richtung. */
    const y = winkel();                              /* um die Senkrechte */
    const x = clamp(-wegY / hoehe * 90, -26, 26);    /* um die Waagerechte */
    const stark = Math.hypot(x, y);
    karte.style.transform = (stark < 0.01 ? ''
      : 'rotate3d(' + x.toFixed(3) + ',' + y.toFixed(3) + ',0,' + stark.toFixed(2) + 'deg) ')
      + 'rotateY(' + grund() + 'deg)';
  };
  /* Eine halbe Kartenbreite ist eine halbe Umdrehung – und dort ist Schluss.
     Ein weiter Zug dreht die Karte sonst über die Rückseite hinaus, und beim
     Loslassen schnappt sie sichtbar zurück. */
  const winkel = () => clamp(wegX / breite * 180, -180, 180);

  karte.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || window.__zieht || sperre) { x0 = null; return; }
    const t = e.touches[0];
    /* Die ersten 30 px am linken Rand bleiben dem Zug nach Hause – sonst
       fängt die Karte ihn ab, weil sie fast die ganze Fläche einnimmt. */
    if (t.clientX < 30) { x0 = null; return; }
    x0 = t.clientX; y0 = t.clientY;
    zieht = false; wegX = 0; wegY = 0; ganzX = 0;
    const r = karte.getBoundingClientRect();
    breite = r.width || 300; hoehe = r.height || 400;
    letztX = x0; letztY = y0; letztT = Date.now(); tempoX = 0; tempoY = 0;
  }, { passive: true });

  karte.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const t = e.touches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    if (!zieht) {
      /* Kein Richtungsentscheid: quer wie längs gehört beides der Karte. */
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      zieht = true; abX = dx; abY = dy; window.__zieht = true;
      karte.style.transition = 'none';
      karte._gezogen = true;
    }
    e.preventDefault();
    const jetzt = Date.now();
    if (jetzt > letztT) {
      tempoX = (t.clientX - letztX) / (jetzt - letztT);
      tempoY = (t.clientY - letztY) / (jetzt - letztT);
      letztX = t.clientX; letztY = t.clientY; letztT = jetzt;
    }
    wegX = dx - abX; wegY = dy - abY; ganzX = dx;
    malen();
  }, { passive: false });

  const los = () => {
    if (x0 == null) return;
    x0 = null;
    if (!zieht) return;
    zieht = false;
    karte.style.transition = '';
    const hoch = -wegY;
    /* Nach oben weg: nur, wenn es wirklich ein Zug nach oben war – schnell
       oder weit. */
    const weg = hoch > Math.abs(wegX)
      && (tempoY < -0.55 || hoch > Math.max(120, hoehe * 0.4));
    if (weg && ablegen && ablegen()) { setTimeout(() => { window.__zieht = false; }, 300); return; }
    /* Umgeblättert wird höchstens einmal je Zug: über die Hälfte gedreht,
       ein kurzer Weg oder ein Schwung genügen – dann liegt die andere Seite
       oben, nicht mehr und nicht weniger. */
    /* Gemessen wird am Weg des Fingers, nicht am gedrehten Rest – die
       Strecke bis zur Übernahme ist mitgelaufen und soll nicht gegen den
       Zug zählen. */
    const dreht = Math.abs(wegX) > Math.abs(wegY)
      && (Math.abs(winkel()) >= 88
        || Math.abs(ganzX) > Math.max(52, breite * 0.16)
        || Math.abs(tempoX) > 0.3);
    if (dreht) {
      drehen(wegX > 0 ? 1 : -1);
      /* Erst wenn diese halbe Umdrehung steht, ist die Karte wieder frei. */
      sperren(760);
    } else {
      karte.style.transform = 'rotateY(' + grund() + 'deg)';
      setTimeout(() => { window.__zieht = false; karte._gezogen = false; }, 300);
    }
  };
  karte.addEventListener('touchend', los, { passive: true });
  karte.addEventListener('touchcancel', los, { passive: true });
}

/* ---------- Die Vergangenen ---------- */
let gVergOffen = null;

function gVergangenOeffnen(gezogen) {
  if (gVergOffen) return null;
  const node = document.createElement('div');
  node.className = 'overlay' + (gezogen ? ' zieht' : '');
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Vergangen</div>
        <div class="ovl-sub" data-sub></div></div>
    </div>
    <div class="ovl-body shell" style="padding:12px 0 40px" data-body></div>`;
  const body = $('[data-body]', node);
  const malen = () => {
    $('[data-sub]', node).textContent = GDB.vergangen.length
      ? pl(GDB.vergangen.length, 'Karte', 'Karten') + ' abgelegt'
      : 'noch nichts abgelegt';
    gVergangenMalen(body, malen);
  };
  $('[data-back]', node).onclick = () => layerSchliessen();
  vorhangHochBinden(node, body);
  layerOeffnen(node, () => { gVergOffen = null; });
  gVergOffen = malen;
  malen();
  return node;
}

function gVergangenMalen(root, neuMalen) {
  if (!GDB.vergangen.length) {
    root.innerHTML = `<div class="empty" style="margin-top:36px"><strong>Noch nichts vergangen</strong>
      Wisch die Karte schnell nach oben – dann liegt sie hier.</div>`;
    return;
  }
  root.innerHTML = `<div class="list-card">${GDB.vergangen.map(k => `
    <div class="rowline" data-alt="${esc(k.id)}">
      <span class="grow"><span class="rn">${esc(k.titel) || 'Ohne Titel'}</span>
        <span class="rm">${esc(gAltText(k))}</span></span>
      <button class="btn btn-sm" data-zurueck="${esc(k.id)}">Zurück</button>
      <button class="icon-btn" data-weg="${esc(k.id)}" aria-label="Löschen">${ICON.trash}</button>
    </div>`).join('')}</div>`;

  $$('[data-alt]', root).forEach(r => r.onclick = e => {
    if (e.target.closest('button')) return;
    gAlteKarteZeigen(r.dataset.alt);
  });
  $$('[data-zurueck]', root).forEach(b => b.onclick = () => {
    gZurueckholen(b.dataset.zurueck);
    neuMalen();
  });
  $$('[data-weg]', root).forEach(b => b.onclick = async () => {
    if (!await bestaetigen('Karte löschen?', 'Die abgelegte Karte wird entfernt.', 'Löschen', true)) return;
    gAendern(() => { GDB.vergangen = GDB.vergangen.filter(x => x.id !== b.dataset.weg); });
    GStore.sichern(true);
    neuMalen();
  });
}

function gAltText(k) {
  const teile = [];
  if (k.datum) teile.push(kTagText(k.datum) + (k.zeit ? ' · ' + k.zeit : ''));
  if (k.abgelegt) {
    const tage = Math.floor((Date.now() - k.abgelegt) / 86400000);
    teile.push(tage <= 0 ? 'heute abgelegt' : 'vor ' + pl(tage, 'Tag', 'Tagen') + ' abgelegt');
  }
  return teile.join(' · ');
}

/* Zurückholen: die Karte kommt wieder nach vorn. Liegt vorn schon etwas,
   wandert das im selben Zug zu den Vergangenen – nichts geht verloren. */
function gZurueckholen(id) {
  const alt = GDB.vergangen.find(x => x.id === id);
  if (!alt) return;
  gAendern(() => {
    GDB.vergangen = GDB.vergangen.filter(x => x.id !== id);
    if (!gKarteLeer(GDB.karte)) {
      GDB.vergangen.unshift(Object.assign({ id: uid(), abgelegt: Date.now() }, GDB.karte));
    }
    GDB.karte = { titel: alt.titel, datum: alt.datum, zeit: alt.zeit, rueckseite: alt.rueckseite };
  });
  GStore.sichern(true);
  gDrehung = 0; gGedreht = false;
  if (gTab === 'guzi') gViewMalen(); else gBannerMalen();
  toast('Wieder auf der Karte.');
}

function gAlteKarteZeigen(id) {
  const k = GDB.vergangen.find(x => x.id === id);
  if (!k) return;
  const s = blatt(k.titel || 'Ohne Titel', `
    <p class="muted" style="font-size:12.5px;margin:-6px 0 14px">${esc(gAltText(k))}</p>
    ${k.rueckseite ? `<div class="g-rueck" style="max-height:none;margin-bottom:16px">${esc(k.rueckseite).replace(/\n/g, '<br>')}</div>`
      : '<p class="hinweis" style="margin-bottom:16px">Die Rückseite war leer.</p>'}
    <div class="btn-row">
      <button class="btn btn-primary" data-zurueck style="flex:1">Zurückholen</button>
      <button class="btn btn-ghost btn-danger" data-weg>Löschen</button>
    </div>`);
  $('[data-zurueck]', s).onclick = () => {
    gZurueckholen(id);
    layerSchliessen();
    if (gVergOffen) gVergOffen();
  };
  $('[data-weg]', s).onclick = async () => {
    if (!await bestaetigen('Karte löschen?', 'Die abgelegte Karte wird entfernt.', 'Löschen', true)) return;
    gAendern(() => { GDB.vergangen = GDB.vergangen.filter(x => x.id !== id); });
    GStore.sichern(true);
    layerSchliessen();
    if (gVergOffen) gVergOffen();
  };
}

/* Der Kopf ist zugleich der Griff: herunterziehen holt die Vergangenen
   hervor – derselbe Vorhang wie die Übersicht in der leseliste. */
let gVorhangGebunden = false;
function gVorhangBinden() {
  if (gVorhangGebunden) return;
  gVorhangGebunden = true;
  const kopf = $('#gs .topbar');
  let y0 = null, x0 = 0, node = null, ab = 0, hoehe = 1, offen = false;
  let letztY = 0, letztT = 0, tempo = 0;
  const fertig = () => { window.__zieht = false; y0 = null; node = null; };

  kopf.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || Layers.length || window.__zieht) { y0 = null; return; }
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
    node = null; offen = false; ab = 0;
    hoehe = window.innerHeight || 640;
    letztY = y0; letztT = Date.now(); tempo = 0;
  }, { passive: true });

  kopf.addEventListener('touchmove', e => {
    if (y0 == null) return;
    const t = e.touches[0], dy = t.clientY - y0, dx = Math.abs(t.clientX - x0);
    if (!node) {
      if (dx > 14 && dx > Math.abs(dy)) { y0 = null; return; }
      if (dy < 10) return;
      node = gVergangenOeffnen(true);
      if (!node) { y0 = null; return; }
      window.__zieht = true;
      ab = dy;
      hoehe = vorhangSetzen(node, 0);
    }
    e.preventDefault();
    const jetzt = Date.now();
    if (jetzt > letztT) {
      tempo = (t.clientY - letztY) / (jetzt - letztT);
      letztY = t.clientY; letztT = jetzt;
    }
    const y = dy - ab;
    offen = y > vorhangSchwelle(hoehe) || tempo > 0.45;
    vorhangSetzen(node, y);
  }, { passive: false });

  const los = () => {
    if (y0 == null) return;
    const el = node;
    if (!el) { fertig(); return; }
    vorhangLoesen(el, offen, () => { if (!offen) layerSchliessen(); });
    fertig();
  };
  kopf.addEventListener('touchend', los, { passive: true });
  kopf.addEventListener('touchcancel', los, { passive: true });
}

/* Der Countdown zählt im Sekundentakt. */
function gUhrLaufen(v) {
  const malen = () => {
    const r = gRest(GDB.karte);
    const u = $('[data-uhr]', v), us = $('[data-uhrsub]', v);
    if (!u || !r) return;
    u.textContent = r.tage
      ? r.tage + (r.tage === 1 ? ' Tag' : ' Tage')
      : String(r.std).padStart(2, '0') + ':' + String(r.min).padStart(2, '0') + ':' + String(r.sek).padStart(2, '0');
    us.textContent = r.vorbei
      ? (r.tage ? 'seit ' + r.tage + (r.tage === 1 ? ' Tag' : ' Tagen') + ' vorbei'
        : 'vor ' + String(r.std).padStart(2, '0') + ':' + String(r.min).padStart(2, '0') + ':' + String(r.sek).padStart(2, '0') + ' erreicht')
      : (r.tage
        ? 'und ' + String(r.std).padStart(2, '0') + ':' + String(r.min).padStart(2, '0') + ':' + String(r.sek).padStart(2, '0')
        : 'bis dahin');
    u.classList.toggle('vorbei', r.vorbei);
    gBannerMalen();
  };
  malen();
  clearInterval(gTakt);
  gTakt = setInterval(malen, 1000);
}

function gKarteBearbeiten() {
  const k = GDB.karte;
  const s = blatt('Karte', `
    <div class="field"><label>Titel (Vorderseite)</label>
      <input type="text" data-t value="${esc(k.titel)}" placeholder="z.B. Halbmarathon"></div>
    <div class="grid2">
      <div class="field"><label>Datum</label><input type="date" data-d value="${esc(k.datum)}"></div>
      <div class="field"><label>Uhrzeit</label><input type="time" data-z value="${esc(k.zeit)}"></div>
    </div>
    <span class="hint" style="display:block;margin:-6px 0 12px">Ohne Uhrzeit zählt der Countdown auf Mitternacht.</span>
    <div class="field"><label>Rückseite</label>
      <textarea data-r style="min-height:130px" placeholder="Freier Text">${esc(k.rueckseite)}</textarea></div>
    <div class="btn-row">
      <button class="btn btn-primary" data-ok style="flex:1">Sichern</button>
      <button class="btn btn-ghost" data-leeren>Leeren</button>
    </div>`);
  $('[data-ok]', s).onclick = () => {
    const d = $('[data-d]', s).value, z = $('[data-z]', s).value;
    gAendern(() => {
      GDB.karte = {
        titel: $('[data-t]', s).value.trim().slice(0, 200),
        datum: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '',
        zeit: /^\d{2}:\d{2}$/.test(z) ? z : '',
        rueckseite: $('[data-r]', s).value.trim().slice(0, 4000)
      };
    });
    GStore.sichern(true);
    layerSchliessen();
    gViewMalen();
  };
  $('[data-leeren]', s).onclick = async () => {
    if (!await bestaetigen('Karte leeren?', 'Vorder- und Rückseite werden geleert.', 'Leeren', true)) return;
    gAendern(() => { GDB.karte = { titel: '', datum: '', zeit: '', rueckseite: '' }; });
    GStore.sichern(true);
    layerSchliessen();
    gDrehung = 0; gGedreht = false;
    gViewMalen();
  };
}

/* ---------- Puzzle und Bald ---------- */
function gPuzzleMalen(v) {
  v.innerHTML = `
    <div class="empty" style="margin-top:40px"><strong>Puzzle</strong>
      Hier ist noch nichts eingebaut – die Anweisungen dafür folgen.</div>`;
}
function gBaldMalen(v) {
  v.innerHTML = `
    <div class="empty" style="margin-top:40px"><strong>Platz für später</strong>
      Der dritte Reiter steht bereit, sobald klar ist, was hier hingehört.</div>`;
}

/* ---------- Mehr ---------- */
function gMehrMalen(v) {
  const ort = GStore.modus === 'datei' ? GStore.dateiname : (GStore.modus === 'geraet' ? 'Auf diesem Gerät' : 'Nicht gewählt');
  const k = GDB.karte;
  v.innerHTML = `
    <div class="section-head" style="padding-top:14px"><h2>Datenbasis</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Speicherort</span><span class="rm">${esc(ort)}</span></span>
        <button class="btn btn-sm" data-gwechseln>Ändern</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Jetzt sichern</span><span class="rm">Als Datei ablegen</span></span>
        <button class="btn btn-sm" data-gsave>Sichern</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Daten laden</span><span class="rm">Eine gsund.json einlesen</span></span>
        <button class="btn btn-sm" data-gimport>Laden</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Karte</span>
        <span class="rm">${k.titel ? esc(k.titel) : 'leer'}${k.datum ? ' · ' + esc(kTagText(k.datum)) : ''}</span></span>
        <button class="btn btn-sm" data-gkarte>Bearbeiten</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Vergangene</span>
        <span class="rm">${GDB.vergangen.length ? pl(GDB.vergangen.length, 'Karte', 'Karten') : 'noch keine'}</span></span>
        <button class="btn btn-sm" data-gverg>Ansehen</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Alles löschen</span><span class="rm">Karte, Vergangene und alles Weitere</span></span>
        <button class="btn btn-sm btn-danger" data-greset>Zurücksetzen</button></div>
    </div>
    ${huelleEinstellungenHtml()}
    <p class="hinweis" style="padding:16px 0 30px">g&rsquo;sund führt eine eigene Datei. Die anderen Apps
      dieser Datei bleiben davon unberührt.</p>`;

  $('[data-gwechseln]', v).onclick = () => gsSpeicherort(false);
  $('[data-gsave]', v).onclick = () => GStore.alsDateiSichern(false);
  $('[data-gimport]', v).onclick = () => gImportBlatt();
  $('[data-gkarte]', v).onclick = () => gKarteBearbeiten();
  $('[data-gverg]', v).onclick = () => gVergangenOeffnen();
  $('[data-greset]', v).onclick = async () => {
    if (!await bestaetigen('Wirklich alles löschen?', 'Die Karte und alles Weitere werden entfernt.', 'Alles löschen', true)) return;
    GDB = leereGs();
    gDrehung = 0; gGedreht = false;
    await GStore.sichern(true);
    gTabWechseln('guzi');
    toast('Zurückgesetzt.');
  };
  huelleEinstellungenBinden(v, gViewMalen);
}

function gImportBlatt() {
  const s = blatt('Daten laden', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">Eine <strong>gsund.json</strong> einlesen. Der bisherige Stand wird ersetzt.</p>
    <input type="file" accept="application/json,.json" data-file style="width:100%">
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" data-ok style="flex:1">Laden</button>
      <button class="btn btn-ghost" data-no>Abbrechen</button>
    </div>`, { fokus: false });
  $('[data-no]', s).onclick = () => layerSchliessen();
  $('[data-ok]', s).onclick = async () => {
    const f = $('[data-file]', s).files[0];
    if (!f) { toast('Keine Datei gewählt.'); return; }
    try {
      GDB = gsNormalisiere(JSON.parse(await f.text()));
      await GStore.sichern(true);
      layerSchliessen();
      gDrehung = 0; gGedreht = false;
      gTabWechseln('guzi');
      toast('Geladen.');
    } catch (e) { toast('Die Datei ist kein gültiges JSON.', 4000); }
  };
}

async function boot() {
  felderBeobachten();
  /* Ueber eine Adresse aufgerufen, meldet die Seite ihr Manifest an: dann legt
     Chrome sie als eigene App auf den Startbildschirm – ohne Browserleisten
     und damit ohne den Vollbild-Hinweis. Aus einer Datei heraus gibt es keinen
     Ursprung, dort bliebe die Zeile ein Fehlschlag. */
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    const l = document.createElement('link');
    l.rel = 'manifest'; l.href = 'mylife.webmanifest';
    document.head.appendChild(l);
  }
  vollbildKnopfMalen();
  $('#btnVoll').onclick = vollbildUmschalten;
  $('#btnTheme').onclick = () => { themeUmschalten(); viewMalen(); };
  /* Der Name oben links führt zurück auf die Liste; steht man schon dort,
     geht es nach oben. */
  $('#btnHeim').onclick = () => {
    if (aktiverTab !== 'plan') tabWechseln('plan');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  $('#saveChip').onclick = () => Store.alsDateiSichern(false);
  $('#btnUebersicht').onclick = () => uebersichtOeffnen();
  $('#btnRaus').innerHTML = ICON.x;
  $('#btnRaus').onclick = zumStartbildschirm;
  /* Die Übersicht wird von der Kopfzeile heruntergezogen wie ein Vorhang:
     die Kante, an der sie aufhört, liegt genau unter der Fingerkuppe. Erst
     beim Loslassen entscheidet sich, ob sie liegen bleibt – die Schwelle ist
     kurz, ein Schwung nach unten genügt auch. */
  (() => {
    const kopf = $('.topbar');
    let y0 = null, x0 = 0, node = null, ab = 0, hoehe = 1, offen = false;
    let letztY = 0, letztT = 0, tempo = 0;

    const fertig = () => {
      window.__zieht = false;
      y0 = null; node = null;
    };

    kopf.addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || Layers.length || window.__zieht) { y0 = null; return; }
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
      node = null; offen = false; ab = 0;
      hoehe = window.innerHeight || 640;
      letztY = y0; letztT = Date.now(); tempo = 0;
    }, { passive: true });

    kopf.addEventListener('touchmove', e => {
      if (y0 == null) return;
      const t = e.touches[0], dy = t.clientY - y0, dx = Math.abs(t.clientX - x0);
      if (!node) {
        /* Erst ab einer klaren Abwärtsbewegung übernehmen. */
        if (dx > 14 && dx > Math.abs(dy)) { y0 = null; return; }
        if (dy < 10) return;
        node = uebersichtOeffnen(true);
        if (!node) { y0 = null; return; }
        window.__zieht = true;
        ab = dy;
        hoehe = vorhangSetzen(node, 0);
      }
      e.preventDefault();
      const jetzt = Date.now();
      if (jetzt > letztT) {
        tempo = (t.clientY - letztY) / (jetzt - letztT);
        letztY = t.clientY; letztT = jetzt;
      }
      const y = dy - ab;
      offen = y > vorhangSchwelle(hoehe) || tempo > 0.45;
      vorhangSetzen(node, y);
    }, { passive: false });

    const los = () => {
      if (y0 == null) return;
      const el = node;
      if (!el) { fertig(); return; }
      vorhangLoesen(el, offen, () => { if (!offen) layerSchliessen(); });
      fertig();
    };
    kopf.addEventListener('touchend', los, { passive: true });
    kopf.addEventListener('touchcancel', los, { passive: true });
  })();

  await shellLesen();
  themeAnwenden();
  splashZeigen();
}

/* Die leseliste holt sich beim Öffnen ihren eigenen Speicherort. Steht keiner
   fest, fragt sie danach – die anderen Apps bleiben davon unberührt. */
async function leselisteOeffnen() {
  aktiverSpeicher = Store;
  let meta = null;
  try { meta = await Store.metaLesen(); } catch (e) { console.warn(e); }

  if (meta && meta.modus === 'datei' && meta.handle) {
    Store.modus = 'datei'; Store.handle = meta.handle; Store.dateiname = meta.dateiname || 'leseplan.json';
    if (await Store.rechtePruefen(meta.handle, false)) {
      try {
        DB = normalisiere(await Store.ladeDaten());
        shellUebernehmen();
        appStarten();
        return;
      } catch (e) { console.error(e); }
    }
    zugriffFreigebenZeigen();
    return;
  }
  if (meta && meta.modus === 'geraet') {
    Store.modus = 'geraet';
    DB = normalisiere(await IDB.get('daten'));
    shellUebernehmen();
    appStarten();
    return;
  }
  setupZeigen();
}

/* Wer die App schon vor der Trennung benutzt hat, hat Farbe und Vollbild in
   den Daten der leseliste stehen. Einmal übernehmen, dann gilt die Hülle. */
let shellSchonDa = false;
function shellUebernehmen() {
  if (shellSchonDa) return;
  shellSchonDa = true;
  const e = DB.einstellungen || {};
  IDB.get('shell').then(vorhanden => {
    if (vorhanden) return;
    if (e.theme) SHELL.theme = e.theme;
    if (e.akzent) SHELL.akzent = e.akzent;
    if (typeof e.vollbildStart === 'boolean') SHELL.vollbildStart = e.vollbildStart;
    themeAnwenden();
    shellSchreiben();
  }).catch(() => { });
}

function zugriffFreigebenZeigen() {
  const s = $('#setup');
  s.innerHTML = `
    <div class="setup-inner">
      <div class="mark serif">Zugriff bestätigen</div>
      <p class="lead">Der Browser hat den Zugriff auf <strong>${esc(Store.dateiname)}</strong> nach dem Schließen zurückgesetzt. Ein Klick, und es geht weiter wie zuvor.</p>
      <button class="btn btn-primary btn-block" data-act="frei">Datei freigeben</button>
      <div style="margin-top:10px"><button class="btn btn-block btn-ghost" data-act="anders">Anderen Speicherort wählen</button></div>
    </div>`;
  s.hidden = false; $('#app').hidden = true;
  s.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'anders') { setupZeigen(false); return; }
    if (await Store.rechtePruefen(Store.handle, true)) {
      DB = normalisiere(await Store.ladeDaten());
      appStarten();
    } else toast('Freigabe verweigert.');
  };
}
