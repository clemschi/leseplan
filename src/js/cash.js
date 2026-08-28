/* ============================================================
   cashflow – die sechste App in dieser Datei
   Ein Stand, ein paar Regelmässigkeiten und die Posten dazwischen.
   Daraus lässt sich für jeden Tag sagen, was dann übrig ist: den Zeiger
   über den Zeitstrahl ziehen, und die Zahl darüber rechnet mit.

   Gerechnet wird in Cent, ganzzahlig. Kommazahlen verlieren beim
   Addieren Stellen, und bei Geld fällt das auf.
   ============================================================ */

function leereCash() {
  return {
    format: 'mylife-cash',
    version: 1,
    erstellt: Date.now(),
    geaendert: Date.now(),
    einstellungen: { autosaveSek: 60, waehrung: '€', horizont: 12 },
    /* Der bekannte Stand und der Tag, an dem er galt. */
    stand: { cent: 0, tag: heute() },
    routinen: [],
    posten: []
  };
}

const CTAKTE = [
  { id: 'monat', name: 'monatlich' },
  { id: 'woche', name: 'wöchentlich' },
  { id: 'jahr', name: 'jährlich' }
];
const CWOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function cashNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const c = leereCash();
  c.erstellt = +d.erstellt || Date.now();
  c.einstellungen = Object.assign(c.einstellungen, d.einstellungen || {});
  c.einstellungen.waehrung = String(c.einstellungen.waehrung || '€').slice(0, 3);
  c.einstellungen.horizont = clamp(Math.round(+c.einstellungen.horizont || 12), 1, 60);
  const tag = x => /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : '';
  const st = d.stand || {};
  c.stand = { cent: Math.round(+st.cent || 0), tag: tag(st.tag) || heute() };
  c.routinen = Array.isArray(d.routinen) ? d.routinen.map(r => ({
    id: String(r.id || uid()),
    name: String(r.name || '').trim().slice(0, 120),
    cent: Math.round(+r.cent || 0),
    takt: CTAKTE.some(t => t.id === r.takt) ? r.takt : 'monat',
    tag: clamp(Math.round(+r.tag || 1), 0, 31),
    monat: clamp(Math.round(+r.monat || 1), 1, 12),
    ab: tag(r.ab),
    bis: tag(r.bis),
    aktiv: r.aktiv !== false
  })).filter(r => r.name && r.cent) : [];
  c.posten = Array.isArray(d.posten) ? d.posten.map(p => ({
    id: String(p.id || uid()),
    name: String(p.name || '').trim().slice(0, 120),
    cent: Math.round(+p.cent || 0),
    datum: tag(p.datum) || heute(),
    art: p.art === 'geplant' ? 'geplant' : 'spontan',
    notiz: String(p.notiz || '').slice(0, 400)
  })).filter(p => p.name && p.cent) : [];
  return c;
}

let CDB = leereCash();
const CStore = macheSpeicher({
  id: 'cash', metaKey: 'meta-cash', datenKey: 'daten-cash', dateiname: 'cashflow.json',
  daten: () => CDB, setzen: d => { CDB = d; }
});
function cAendern(fn) { if (fn) fn(); CStore.aendern(); }

const CORT = appOrtAnmelden({
  store: CStore, name: 'cashflow', datei: 'cashflow.json', format: 'mylife-cash',
  lead: 'Wo sollen Stand, Routinen und Posten liegen? cashflow führt eine eigene Datei – die anderen Apps bleiben davon unberührt.',
  normalisiere: cashNormalisiere, leer: leereCash, starten: () => caStarten(),
  ortWechseln: () => caSpeicherort(false)
});
function cashOeffnen() { return appSpeicherOeffnen(CORT); }
function caSpeicherort(erneut) { appSpeicherort(CORT, erneut); }

const CICON = {
  stand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 17.5l5.5-6 4 3.5 7.5-8"/><path d="M20.5 12V7h-5"/></svg>',
  routine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5"/><path d="M4 4.5v4h4"/><path d="M4 12.5A8 8 0 0 0 17.7 17.7L20 15.5"/><path d="M20 19.5v-4h-4"/></svg>',
  posten: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h14v15l-3.5-2-3.5 2-3.5-2-3.5 2z"/><path d="M9 9.5h6M9 13.5h4"/></svg>'
};

/* ---------- Geld ---------- */
const cGeld = (cent, mitZeichen) => {
  const v = Math.abs(cent) / 100;
  const s = v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const w = CDB.einstellungen.waehrung;
  return (cent < 0 ? '−' : (mitZeichen && cent > 0 ? '+' : '')) + s + ' ' + w;
};
/* „12,50", „-3.000,10" oder „1200" – alles landet als Cent. */
const cCent = (text) => {
  const t = String(text || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const z = parseFloat(t);
  return isFinite(z) ? Math.round(z * 100) : 0;
};
const cFeldText = cent => (cent / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------- Rechnen ---------- */
/* Alle Termine einer Routine zwischen zwei Tagen (beide einschliesslich). */
function caTermine(r, vonISO, bisISO) {
  const aus = [];
  if (!r.aktiv) return aus;
  const von = kDatum(vonISO), bis = kDatum(bisISO);
  if (!von || !bis || bis < von) return aus;
  const ab = r.ab ? kDatum(r.ab) : null, endeR = r.bis ? kDatum(r.bis) : null;
  const d = new Date(von);
  while (d <= bis) {
    let trifft = false;
    if (r.takt === 'woche') trifft = d.getDay() === (r.tag % 7);
    else if (r.takt === 'monat') {
      const letzter = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      trifft = d.getDate() === Math.min(r.tag || 1, letzter);
    } else if (r.takt === 'jahr') {
      const letzter = new Date(d.getFullYear(), r.monat, 0).getDate();
      trifft = (d.getMonth() + 1) === r.monat && d.getDate() === Math.min(r.tag || 1, letzter);
    }
    if (trifft && (!ab || d >= ab) && (!endeR || d <= endeR)) aus.push(kIso(d));
    d.setDate(d.getDate() + 1);
  }
  return aus;
}

/* Was sich zwischen dem Stichtag und einem Tag tut – ohne den Stichtag
   selbst, denn dessen Stand ist ja schon bekannt. */
function caBis(zielISO) {
  const von = new Date(kDatum(CDB.stand.tag));
  von.setDate(von.getDate() + 1);
  const vonISO = kIso(von);
  let ein = 0, aus = 0;
  const liste = [];
  CDB.routinen.forEach(r => {
    caTermine(r, vonISO, zielISO).forEach(t => {
      liste.push({ datum: t, name: r.name, cent: r.cent, art: 'routine' });
      if (r.cent > 0) ein += r.cent; else aus += r.cent;
    });
  });
  CDB.posten.forEach(p => {
    if (p.datum >= vonISO && p.datum <= zielISO) {
      liste.push({ datum: p.datum, name: p.name, cent: p.cent, art: p.art });
      if (p.cent > 0) ein += p.cent; else aus += p.cent;
    }
  });
  liste.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  return { stand: CDB.stand.cent + ein + aus, ein, aus, liste };
}
const caStandAm = zielISO => caBis(zielISO).stand;

/* ---------- Gerüst ---------- */
const CTABS = [
  { id: 'stand', label: 'Stand', icon: CICON.stand },
  { id: 'routinen', label: 'Routine', icon: CICON.routine },
  { id: 'posten', label: 'Posten', icon: CICON.posten },
  { id: 'camehr', label: 'Mehr', icon: ICON.more }
];
let caTab = 'stand';
let caZiel = '';   /* der Tag, auf den der Zeiger zeigt */

function caStarten() {
  appFlaeche('ca');
  aktiverSpeicher = CStore;
  caTab = 'stand';
  caZiel = heute();
  themeAnwenden();
  caKnoepfeMalen();
  $('#caBtnTheme').onclick = () => { themeUmschalten(); caKnoepfeMalen(); caViewMalen(); };
  $('#caBtnVoll').onclick = vollbildUmschalten;
  $('#caBtnRaus').innerHTML = ICON.x;
  $('#caBtnRaus').onclick = () => zumStartbildschirm();
  $('#caBrand').onclick = () => { if (caTab !== 'stand') caTabWechseln('stand'); else window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#caSaveChip').onclick = () => CStore.alsDateiSichern(false);
  $('#caBanner').onclick = () => caTabWechseln('stand');
  caTabbarMalen();
  caViewMalen();
  CStore.autosaveStarten();
  saveChipMalen();
}
function caKnoepfeMalen() {
  const t = $('#caBtnTheme'), v = $('#caBtnVoll');
  if (t) t.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  if (!v) return;
  v.hidden = !vollbildGeht();
  v.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
}
function caTabbarMalen() {
  $('#catabbar').innerHTML = CTABS.map(t =>
    `<button data-catab="${t.id}" aria-selected="${t.id === caTab}">${t.icon}<span>${t.label}</span></button>`).join('');
  $('#catabbar').onclick = e => {
    const b = e.target.closest('[data-catab]');
    if (b) caTabWechseln(b.dataset.catab);
  };
}
function caTabWechseln(id) {
  caTab = id;
  caTabbarMalen();
  caViewMalen();
  window.scrollTo(0, 0);
}
function caViewMalen() {
  leistenHoeheMessen();
  const v = $('#caview');
  caBannerMalen();
  if (caTab === 'stand') caStandMalen(v);
  else if (caTab === 'routinen') caRoutinenMalen(v);
  else if (caTab === 'posten') caPostenMalen(v);
  else caMehrMalen(v);
  caKnoepfeMalen();
  saveChipMalen();
}
function caBannerMalen() {
  const jetzt = caStandAm(heute());
  $('#caBanner').innerHTML = `
    <span class="kb-tag">heute ${esc(cGeld(jetzt))}</span>
    <span class="kb-zahlen">${CDB.routinen.length ? `<span>${pl(CDB.routinen.filter(r => r.aktiv).length, 'Routine', 'Routinen')}</span>` : '<span>keine Routine</span>'}</span>`;
}

/* ---------- Stand mit Zeitstrahl ---------- */
const caHorizontBis = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + CDB.einstellungen.horizont);
  return kIso(d);
};

/* Der Zeitstrahl steht still, der Zeiger wandert.
   Darum malt caStandMalen einmal das Feste – Kurve, Monatsmarken, Knöpfe –
   und caZielMalen nur noch das, was am gewählten Tag hängt. Wer im Zug die
   ganze Fläche neu malte, risse die Bahn unter dem Finger weg. */
let caVon = '', caEnde = '', caTage = 1;

function caStandMalen(v) {
  caVon = heute();
  caEnde = caHorizontBis();
  caTage = Math.max(1, Math.round((kDatum(caEnde) - kDatum(caVon)) / 86400000));
  if (!caZiel) caZiel = caVon;
  caZiel = clampISO(caZiel, caVon, caEnde);

  /* Die Kurve: für jeden Tag ein Punkt, aber höchstens 180 – mehr sieht man
     ohnehin nicht. */
  const jetzt = caStandAm(caVon);
  const schritt = Math.max(1, Math.ceil(caTage / 180));
  const punkte = [];
  for (let i = 0; i <= caTage; i += schritt) {
    const d = new Date(kDatum(caVon)); d.setDate(d.getDate() + i);
    punkte.push({ i, cent: caStandAm(kIso(d)) });
  }
  if (punkte[punkte.length - 1].i !== caTage) punkte.push({ i: caTage, cent: caStandAm(caEnde) });
  const hoch = Math.max(...punkte.map(p => p.cent), jetzt, 0);
  const tief = Math.min(...punkte.map(p => p.cent), jetzt, 0);
  const spanne = Math.max(1, hoch - tief);
  const x = i => (i / caTage) * 100;
  const y = cent => 100 - ((cent - tief) / spanne) * 100;
  const linie = punkte.map(p => `${x(p.i).toFixed(2)},${y(p.cent).toFixed(2)}`).join(' ');
  const flaeche = `0,100 ${linie} 100,100`;
  const nulllinie = tief < 0 && hoch > 0 ? y(0) : null;

  v.innerHTML = `
    <div data-cazahl></div>

    <div class="cabahn" data-cabahn>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="${flaeche}" class="cafl"/>
        <polyline points="${linie}" class="cali" vector-effect="non-scaling-stroke"/>
        ${nulllinie != null ? `<line x1="0" y1="${nulllinie.toFixed(2)}" x2="100" y2="${nulllinie.toFixed(2)}"
          class="canull" vector-effect="non-scaling-stroke"/>` : ''}
      </svg>
      <span class="camarke"></span>
      <span class="cagriff"></span>
      <div class="camonate">${caMonatsMarken(caVon, caTage).map(m =>
    `<span style="left:${x(m.i).toFixed(2)}%">${esc(m.text)}</span>`).join('')}</div>
    </div>
    <div class="cazeile">
      <button class="btn btn-sm" data-caheute>Heute</button>
      <input type="date" data-cadatum value="${esc(caZiel)}" min="${esc(caVon)}" max="${esc(caEnde)}">
      <button class="btn btn-sm" data-caende>${CDB.einstellungen.horizont} Monate</button>
    </div>

    <div data-cateil></div>

    <div class="btn-row" style="margin-top:18px">
      <button class="btn btn-primary" data-caspontan style="flex:1">Spontan ausgegeben</button>
      <button class="btn" data-cageplant style="flex:1">Geplant</button>
    </div>
    <button class="btn btn-block btn-ghost btn-sm" style="margin-top:8px" data-castand>Stand berichtigen</button>
    <div style="height:30px"></div>`;

  caZielMalen();
  caBahnBinden($('[data-cabahn]', v));
  $('[data-caheute]', v).onclick = () => { caZiel = caVon; caZielMalen(); };
  $('[data-caende]', v).onclick = () => { caZiel = caEnde; caZielMalen(); };
  $('[data-cadatum]', v).onchange = e => {
    const t = e.target.value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) { caZiel = clampISO(t, caVon, caEnde); caZielMalen(); }
  };
  $('[data-caspontan]', v).onclick = () => caPostenBlatt(null, 'spontan');
  $('[data-cageplant]', v).onclick = () => caPostenBlatt(null, 'geplant');
  $('[data-castand]', v).onclick = () => caStandBlatt();
}

/* Alles, was am gewählten Tag hängt – und nur das. Die Bahn selbst bleibt
   unangetastet, damit der Finger sie im Zug nicht verliert. */
function caZielMalen() {
  const v = $('#caview');
  const kopf = $('[data-cazahl]', v);
  if (!kopf) return;
  const bis = caBis(caZiel);
  const jetzt = caStandAm(caVon);
  const weg = Math.round((kDatum(caZiel) - kDatum(caVon)) / 86400000);
  const links = ((weg / caTage) * 100).toFixed(2) + '%';

  kopf.className = 'cazahl' + (bis.stand < 0 ? ' minus' : '');
  kopf.innerHTML = `
    <b class="num">${esc(cGeld(bis.stand))}</b>
    <span>${caZiel === caVon ? 'heute' : 'am ' + esc(kTagText(caZiel, true))}</span>
    ${caZiel !== caVon ? `<i>${weg === 1 ? 'in einem Tag' : 'in ' + weg + ' Tagen'} ·
      heute ${esc(cGeld(jetzt))}</i>` : `<i>Stand vom ${esc(kTagText(CDB.stand.tag))}${
    CDB.stand.tag !== caVon ? ' · fortgeschrieben' : ''}</i>`}`;

  const marke = $('.camarke', v), griff = $('.cagriff', v), feld = $('[data-cadatum]', v);
  if (marke) marke.style.left = links;
  if (griff) griff.style.left = links;
  if (feld && feld.value !== caZiel) feld.value = caZiel;

  $('[data-cateil]', v).innerHTML = `
    <div class="casumme">
      <div><b class="num ein">${esc(cGeld(bis.ein, true))}</b><span>kommt herein</span></div>
      <div><b class="num aus">${esc(cGeld(bis.aus, true))}</b><span>geht hinaus</span></div>
    </div>

    <div class="section-head" style="margin-top:20px"><h2>Bis dahin</h2></div>
    ${bis.liste.length ? `<div class="list-card">
      ${bis.liste.slice(0, 40).map(e => `
        <div class="rowline">
          <span class="capunkt ${e.cent > 0 ? 'ein' : 'aus'}"></span>
          <span class="grow"><span class="rn">${esc(e.name)}</span>
            <span class="rm">${esc(kTagText(e.datum))} · ${e.art === 'routine' ? 'Routine'
      : e.art === 'geplant' ? 'geplant' : 'spontan'}</span></span>
          <span class="num ${e.cent > 0 ? 'ein' : 'aus'}">${esc(cGeld(e.cent, true))}</span>
        </div>`).join('')}
      ${bis.liste.length > 40 ? `<div class="rowline"><span class="rm">… und ${bis.liste.length - 40} weitere</span></div>` : ''}
    </div>` : `<div class="empty"><strong>Nichts dazwischen</strong>
      Bis dahin ändert sich nichts – trag eine Routine oder einen Posten ein.</div>`}`;
}

const clampISO = (t, min, max) => (t < min ? min : t > max ? max : t);

function caMonatsMarken(vonISO, tage) {
  const aus = [];
  const d = new Date(kDatum(vonISO));
  d.setDate(1);
  const namen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  for (let k = 0; k < 60; k++) {
    d.setMonth(d.getMonth() + 1);
    const i = Math.round((d - kDatum(vonISO)) / 86400000);
    if (i > tage) break;
    if (i >= 0) aus.push({ i, text: namen[d.getMonth()] });
  }
  /* Bei einem langen Fenster reicht jeder zweite oder dritte Monat. */
  const jeder = aus.length > 8 ? Math.ceil(aus.length / 8) : 1;
  return aus.filter((m, k) => k % jeder === 0);
}

/* Der Zeiger folgt dem Finger, ohne Schwelle: es ist ein Regler, kein Wisch.
   Gemessen wird einmal beim Aufsetzen – clientWidth im Zug erzwingt Layout. */
function caBahnBinden(bahn) {
  if (!bahn) return;
  let zieht = false, breite = 1, kante = 0;
  const setzen = (clientX) => {
    const f = clamp((clientX - kante) / breite, 0, 1);
    const d = new Date(kDatum(caVon));
    d.setDate(d.getDate() + Math.round(f * caTage));
    const neu = kIso(d);
    if (neu === caZiel) return;
    caZiel = neu;
    caZielMalen();
  };
  bahn.addEventListener('pointerdown', e => {
    const r = bahn.getBoundingClientRect();
    breite = r.width || 1; kante = r.left;
    zieht = true;
    try { bahn.setPointerCapture(e.pointerId); } catch (err) { }
    window.__zieht = true;
    setzen(e.clientX);
    e.preventDefault();
  });
  bahn.addEventListener('pointermove', e => { if (zieht) setzen(e.clientX); });
  const los = () => {
    if (!zieht) return;
    zieht = false;
    window.__zieht = false;
  };
  bahn.addEventListener('pointerup', los);
  bahn.addEventListener('pointercancel', los);
}

function caStandBlatt() {
  const s = blatt('Stand berichtigen', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">Was liegt gerade
      wirklich da? Von diesem Tag an rechnet die App wieder vorwärts.</p>
    <div class="grid2">
      <div class="field"><label>Stand</label>
        <input type="text" inputmode="decimal" data-betrag value="${esc(cFeldText(CDB.stand.cent))}"></div>
      <div class="field"><label>Am</label>
        <input type="date" data-tag value="${esc(CDB.stand.tag)}"></div>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`, { fokus: false });
  $('[data-ok]', s).onclick = () => {
    const t = $('[data-tag]', s).value;
    cAendern(() => {
      CDB.stand.cent = cCent($('[data-betrag]', s).value);
      CDB.stand.tag = /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : heute();
    });
    CStore.sichern(true);
    layerSchliessen();
    caViewMalen();
  };
}

/* ---------- Routinen ---------- */
function caRoutinenMalen(v) {
  const ein = CDB.routinen.filter(r => r.cent > 0);
  const aus = CDB.routinen.filter(r => r.cent < 0);
  const proMonat = CDB.routinen.filter(r => r.aktiv).reduce((n, r) => n + caMonatlich(r), 0);

  const zeile = r => `
    <button class="rowline caroutine${r.aktiv ? '' : ' ruht'}" data-caroutine="${r.id}">
      <span class="grow"><span class="rn">${esc(r.name)}</span>
        <span class="rm">${esc(caTaktText(r))}${r.aktiv ? '' : ' · ruht'}</span></span>
      <span class="num ${r.cent > 0 ? 'ein' : 'aus'}">${esc(cGeld(r.cent, true))}</span>
    </button>`;

  v.innerHTML = `
    <div class="cazahl klein${proMonat < 0 ? ' minus' : ''}">
      <b class="num">${esc(cGeld(proMonat, true))}</b>
      <span>bleibt im Monat, wenn nichts dazwischenkommt</span>
    </div>

    <div class="section-head" style="margin-top:20px"><h2>Kommt herein</h2>
      <span class="eyebrow">${ein.length}</span></div>
    ${ein.length ? `<div class="list-card">${ein.map(zeile).join('')}</div>`
      : '<div class="empty">Noch nichts Regelmässiges.</div>'}

    <div class="section-head" style="margin-top:20px"><h2>Geht hinaus</h2>
      <span class="eyebrow">${aus.length}</span></div>
    ${aus.length ? `<div class="list-card">${aus.map(zeile).join('')}</div>`
      : '<div class="empty">Noch nichts Regelmässiges.</div>'}

    <button class="btn btn-primary btn-block" style="margin-top:20px" data-caneu>${ICON.plus} Routine eintragen</button>
    <div style="height:30px"></div>`;

  $$('[data-caroutine]', v).forEach(b => b.onclick = () => caRoutineBlatt(CDB.routinen.find(r => r.id === b.dataset.caroutine)));
  $('[data-caneu]', v).onclick = () => caRoutineBlatt(null);
}

/* Was eine Routine im Schnitt je Monat ausmacht – fürs Gefühl, nicht für die
   Rechnung; die geht Tag für Tag. */
const caMonatlich = r => r.takt === 'monat' ? r.cent
  : r.takt === 'woche' ? Math.round(r.cent * 52 / 12)
    : Math.round(r.cent / 12);

const caTaktText = r => r.takt === 'monat' ? 'monatlich am ' + r.tag + '.'
  : r.takt === 'woche' ? 'jeden ' + CWOCHENTAGE[r.tag % 7]
    : 'jährlich am ' + r.tag + '. ' + ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
      'August', 'September', 'Oktober', 'November', 'Dezember'][r.monat - 1];

function caRoutineBlatt(routine) {
  const neu = !routine;
  const r = routine || { id: uid(), name: '', cent: 0, takt: 'monat', tag: 1, monat: 1, ab: '', bis: '', aktiv: true };
  const s = blatt(neu ? 'Routine' : 'Routine ändern', `
    <div class="field"><label>Wofür</label>
      <input type="text" data-name value="${esc(r.name)}" placeholder="z.B. Miete"></div>
    <div class="grid2">
      <div class="field"><label>Betrag</label>
        <input type="text" inputmode="decimal" data-betrag value="${r.cent ? esc(cFeldText(r.cent)) : ''}" placeholder="−850,00"></div>
      <div class="field"><label>Takt</label>
        <select data-takt>${CTAKTE.map(t => `<option value="${t.id}"${t.id === r.takt ? ' selected' : ''}>${t.name}</option>`).join('')}</select></div>
    </div>
    <span class="hint" style="display:block;margin:-6px 0 12px">Minus für alles, was hinausgeht.</span>

    <div class="grid2">
      <div class="field" data-wanntag><label>Tag im Monat</label>
        <input type="number" data-tag min="1" max="31" value="${r.takt === 'woche' ? 1 : (r.tag || 1)}"></div>
      <div class="field" data-wannwoche hidden><label>Wochentag</label>
        <select data-wtag>${CWOCHENTAGE.map((w, i) => `<option value="${i}"${(r.takt === 'woche' && r.tag % 7 === i) ? ' selected' : ''}>${w}</option>`).join('')}</select></div>
      <div class="field" data-wannmonat hidden><label>Monat</label>
        <select data-monat>${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August',
      'September', 'Oktober', 'November', 'Dezember'].map((m, i) => `<option value="${i + 1}"${r.monat === i + 1 ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
    </div>

    <div class="grid2">
      <div class="field"><label>Ab (freilassen: immer)</label><input type="date" data-ab value="${esc(r.ab)}"></div>
      <div class="field"><label>Bis</label><input type="date" data-bis value="${esc(r.bis)}"></div>
    </div>

    ${neu ? '' : `<div class="list-card" style="margin-bottom:14px">
      <div class="rowline"><span class="grow"><span class="rn">${r.aktiv ? 'Läuft' : 'Ruht'}</span>
        <span class="rm">Eine ruhende Routine zählt nicht mit</span></span>
        <button class="btn btn-sm" data-caruht>${r.aktiv ? 'Ruhen lassen' : 'Wieder starten'}</button></div>
    </div>`}

    <div class="btn-row">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Eintragen' : 'Sichern'}</button>
      ${neu ? '' : '<button class="btn btn-danger" data-loeschen>' + ICON.trash + '</button>'}
    </div>`, { fokus: neu });

  const felderZeigen = () => {
    const takt = $('[data-takt]', s).value;
    $('[data-wanntag]', s).hidden = takt === 'woche';
    $('[data-wannwoche]', s).hidden = takt !== 'woche';
    $('[data-wannmonat]', s).hidden = takt !== 'jahr';
    $('[data-wanntag] label', s).textContent = takt === 'jahr' ? 'Tag im Monat' : 'Tag im Monat';
  };
  $('[data-takt]', s).onchange = felderZeigen;
  felderZeigen();

  $('[data-ok]', s).onclick = () => {
    const name = $('[data-name]', s).value.trim();
    const cent = cCent($('[data-betrag]', s).value);
    if (!name) { toast('Ohne Namen geht es nicht.'); return; }
    if (!cent) { toast('Ohne Betrag auch nicht.'); return; }
    const takt = $('[data-takt]', s).value;
    const ab = $('[data-ab]', s).value, bis = $('[data-bis]', s).value;
    cAendern(() => {
      r.name = name.slice(0, 120);
      r.cent = cent;
      r.takt = takt;
      r.tag = takt === 'woche' ? +$('[data-wtag]', s).value : clamp(Math.round(+$('[data-tag]', s).value || 1), 1, 31);
      r.monat = clamp(Math.round(+$('[data-monat]', s).value || 1), 1, 12);
      r.ab = /^\d{4}-\d{2}-\d{2}$/.test(ab) ? ab : '';
      r.bis = /^\d{4}-\d{2}-\d{2}$/.test(bis) ? bis : '';
      if (neu) CDB.routinen.push(r);
    });
    CStore.sichern(true);
    layerSchliessen();
    caViewMalen();
  };
  const ruht = $('[data-caruht]', s);
  if (ruht) ruht.onclick = () => {
    cAendern(() => { r.aktiv = !r.aktiv; });
    CStore.sichern(true);
    layerSchliessen();
    caViewMalen();
  };
  const del = $('[data-loeschen]', s);
  if (del) del.onclick = async () => {
    if (!await bestaetigen('Routine löschen?', esc(r.name) + ' wird entfernt.', 'Löschen', true)) return;
    cAendern(() => { CDB.routinen = CDB.routinen.filter(x => x.id !== r.id); });
    CStore.sichern(true);
    layerSchliessen();
    caViewMalen();
  };
}

/* ---------- Posten ---------- */
function caPostenMalen(v) {
  const heuteISO = heute();
  const kommend = CDB.posten.filter(p => p.datum > heuteISO).sort((a, b) => (a.datum < b.datum ? -1 : 1));
  const gewesen = CDB.posten.filter(p => p.datum <= heuteISO).sort((a, b) => (a.datum < b.datum ? 1 : -1));

  const zeile = p => `
    <button class="rowline caposten" data-caposten="${p.id}">
      <span class="capunkt ${p.cent > 0 ? 'ein' : 'aus'}"></span>
      <span class="grow"><span class="rn">${esc(p.name)}</span>
        <span class="rm">${esc(kTagText(p.datum))} · ${p.art === 'geplant' ? 'geplant' : 'spontan'}</span></span>
      <span class="num ${p.cent > 0 ? 'ein' : 'aus'}">${esc(cGeld(p.cent, true))}</span>
    </button>`;

  v.innerHTML = `
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" data-caspontan style="flex:1">Spontan ausgegeben</button>
      <button class="btn" data-cageplant style="flex:1">Geplant</button>
    </div>

    <div class="section-head" style="margin-top:20px"><h2>Kommt noch</h2>
      <span class="eyebrow">${kommend.length}</span></div>
    ${kommend.length ? `<div class="list-card">${kommend.map(zeile).join('')}</div>`
      : '<div class="empty">Nichts geplant.</div>'}

    <div class="section-head" style="margin-top:20px"><h2>War</h2>
      <span class="eyebrow">${gewesen.length}</span></div>
    ${gewesen.length ? `<div class="list-card">${gewesen.slice(0, 60).map(zeile).join('')}</div>`
      : '<div class="empty">Noch nichts eingetragen.</div>'}
    <div style="height:30px"></div>`;

  $$('[data-caposten]', v).forEach(b => b.onclick = () => caPostenBlatt(CDB.posten.find(p => p.id === b.dataset.caposten)));
  $('[data-caspontan]', v).onclick = () => caPostenBlatt(null, 'spontan');
  $('[data-cageplant]', v).onclick = () => caPostenBlatt(null, 'geplant');
}

function caPostenBlatt(posten, art) {
  const neu = !posten;
  const p = posten || {
    id: uid(), name: '', cent: 0,
    datum: art === 'geplant' ? '' : heute(),
    art: art === 'geplant' ? 'geplant' : 'spontan', notiz: ''
  };
  const s = blatt(neu ? (p.art === 'geplant' ? 'Geplante Ausgabe' : 'Spontane Ausgabe') : 'Posten', `
    <div class="field"><label>Wofür</label>
      <input type="text" data-name value="${esc(p.name)}" placeholder="${p.art === 'geplant' ? 'z.B. Winterreifen' : 'z.B. Kaffee unterwegs'}"></div>
    <div class="grid2">
      <div class="field"><label>Betrag</label>
        <input type="text" inputmode="decimal" data-betrag value="${p.cent ? esc(cFeldText(p.cent)) : ''}" placeholder="−25,00"></div>
      <div class="field"><label>Wann</label>
        <input type="date" data-datum value="${esc(p.datum)}"></div>
    </div>
    <span class="hint" style="display:block;margin:-6px 0 12px">Minus für alles, was hinausgeht.
      ${p.art === 'geplant' ? 'Ein geplanter Posten liegt in der Zukunft und zieht den Stand ab dem Tag mit.' : ''}</span>
    <div class="field"><label>Notiz</label>
      <textarea data-notiz style="min-height:64px" placeholder="Muss nicht">${esc(p.notiz)}</textarea></div>
    <div class="btn-row">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Eintragen' : 'Sichern'}</button>
      ${neu ? '' : '<button class="btn btn-danger" data-loeschen>' + ICON.trash + '</button>'}
    </div>`, { fokus: neu });

  $('[data-ok]', s).onclick = () => {
    const name = $('[data-name]', s).value.trim();
    const cent = cCent($('[data-betrag]', s).value);
    const datum = $('[data-datum]', s).value;
    if (!name) { toast('Ohne Namen geht es nicht.'); return; }
    if (!cent) { toast('Ohne Betrag auch nicht.'); return; }
    cAendern(() => {
      p.name = name.slice(0, 120);
      p.cent = cent;
      p.datum = /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : heute();
      p.art = p.datum > heute() ? 'geplant' : (p.art === 'geplant' ? 'geplant' : 'spontan');
      p.notiz = $('[data-notiz]', s).value.trim().slice(0, 400);
      if (neu) CDB.posten.push(p);
    });
    CStore.sichern(true);
    layerSchliessen();
    caViewMalen();
  };
  const del = $('[data-loeschen]', s);
  if (del) del.onclick = async () => {
    if (!await bestaetigen('Posten löschen?', esc(p.name) + ' wird entfernt.', 'Löschen', true)) return;
    cAendern(() => { CDB.posten = CDB.posten.filter(x => x.id !== p.id); });
    CStore.sichern(true);
    layerSchliessen();
    caViewMalen();
  };
}

/* ---------- Mehr ---------- */
function caMehrMalen(v) {
  v.innerHTML = `
    ${appDatenHtml(CORT)}

    <div class="section-head" style="padding-top:14px"><h2>Rechnung</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Stand</span>
        <span class="rm">${esc(cGeld(CDB.stand.cent))} am ${esc(kTagText(CDB.stand.tag))}</span></span>
        <button class="btn btn-sm" data-castand>Ändern</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Zeitstrahl</span>
        <span class="rm">Wie weit er nach vorn reicht</span></span>
        <input type="number" data-cahorizont min="1" max="60" value="${CDB.einstellungen.horizont}" style="width:76px;text-align:right"></div>
      <div class="rowline"><span class="grow"><span class="rn">Währung</span>
        <span class="rm">Steht hinter jeder Zahl</span></span>
        <input type="text" data-cawaehrung value="${esc(CDB.einstellungen.waehrung)}" style="width:60px;text-align:right"></div>
      <div class="rowline"><span class="grow"><span class="rn">Umfang</span>
        <span class="rm">${pl(CDB.routinen.length, 'Routine', 'Routinen')} · ${pl(CDB.posten.length, 'Posten', 'Posten')}</span></span></div>
      <div class="rowline"><span class="grow"><span class="rn">Alles löschen</span>
        <span class="rm">Stand, Routinen und Posten</span></span>
        <button class="btn btn-sm btn-danger" data-careset>Zurücksetzen</button></div>
    </div>

    ${huelleEinstellungenHtml()}
    <p class="hinweis" style="padding:16px 0 30px">Gerechnet wird in Cent und Tag für Tag:
      vom Stand aus vorwärts, über jede Routine und jeden Posten dazwischen.</p>`;

  appDatenBinden(CORT, v, caViewMalen);
  $('[data-castand]', v).onclick = () => caStandBlatt();
  $('[data-cahorizont]', v).onchange = e => {
    const h = clamp(Math.round(+e.target.value || 12), 1, 60);
    cAendern(() => { CDB.einstellungen.horizont = h; });
    caZiel = heute();
    caViewMalen();
  };
  $('[data-cawaehrung]', v).onchange = e => {
    cAendern(() => { CDB.einstellungen.waehrung = (e.target.value || '€').trim().slice(0, 3) || '€'; });
    caViewMalen();
  };
  $('[data-careset]', v).onclick = async () => {
    if (!await bestaetigen('Wirklich alles löschen?',
      'Stand, Routinen und Posten werden entfernt.', 'Alles löschen', true)) return;
    CDB = leereCash();
    await CStore.sichern(true);
    caTabWechseln('stand');
    toast('Zurückgesetzt.');
  };
  huelleEinstellungenBinden(v, caViewMalen);
}
