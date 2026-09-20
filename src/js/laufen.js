/* ============================================================
   laufen – die siebte App in dieser Datei
   Ein Trainingsplan über beliebig viele Wochen. Die App bringt keinen
   Plan mit: Wochen, Rennen, Tests und Strecken stehen in der eigenen
   Datei (laufen.json), zusammen mit dem, was der Läufer einträgt –
   je Einheit eine Ist-Zeit und ein Gefühl. Ohne Datei ist sie leer.

   So bleibt nichts Persönliches im Code: der veröffentlichte Bau kennt
   weder Renntermine noch Strecken.

   An der Kopfzeile herunterziehen holt die Leistungs-Aufstellung –
   derselbe Vorhang wie die Übersicht der leseliste.
   ============================================================ */

function leereLauf() {
  return {
    format: 'mylife-laufen',
    version: 1,
    erstellt: Date.now(),
    geaendert: Date.now(),
    einstellungen: { autosaveSek: 60 },
    /* Der Plan selbst – leer, bis eine Datei ihn mitbringt. */
    plan: { start: '', rennen: [], tests: [], wochen: [] },
    /* Oder verschlossen: dann steht hier der Geheimtext und plan bleibt leer. */
    tresor: null,
    /* Je Einheit ein Eintrag, der Schlüssel ist ihr Datum. */
    eintraege: {},
    strecken: []
  };
}

/* Was aus einer Datei kommt, wird hier zurechtgerückt: nur bekannte Felder,
   Längen gedeckelt, alles andere fällt weg. */
function lfPlanPruefen(roh) {
  const p = (roh && typeof roh === 'object') ? roh : {};
  const txt = (x, n) => String(x == null ? '' : x).trim().slice(0, n || 120);
  const liste = (a, fn) => Array.isArray(a) ? a.map(fn).filter(Boolean).slice(0, 400) : [];
  const zeilen = (a) => Array.isArray(a) ? a.map(x => txt(x, 140)).filter(Boolean).slice(0, 30) : [];
  return {
    start: /^\d{4}-\d{2}-\d{2}$/.test(p.start) ? p.start : '',
    prognose: {
      exponent: clamp(+(p.prognose && p.prognose.exponent) || 1.06, 1.0, 1.2),
      marathonFaktor: clamp(+(p.prognose && p.prognose.marathonFaktor) || 2.25, 1.8, 2.8)
    },
    rennen: liste(p.rennen, r => r && r.name ? {
      name: txt(r.name, 60), datum: txt(r.datum, 12), ort: txt(r.ort, 60),
      woche: txt(r.woche, 20), traum: txt(r.traum, 40), traumPace: txt(r.traumPace, 20),
      ziel: txt(r.ziel, 40), zielPace: txt(r.zielPace, 20),
      km: clamp(+r.km || 0, 0, 200)
    } : null),
    tests: liste(p.tests, t => t && t.datum ? {
      woche: txt(t.woche, 20), n: clamp(Math.round(+t.n || 0), 0, 520),
      datum: txt(t.datum, 12), teil1: txt(t.teil1, 80),
      teil2: txt(t.teil2, 80), gesamt: txt(t.gesamt, 20), ziel: txt(t.ziel, 60),
      mess: clamp(+t.mess || 0, 0, 200), art: txt(t.art, 12)
    } : null),
    wochen: liste(p.wochen, w => w && +w.n ? {
      n: clamp(Math.round(+w.n), 1, 520), p: txt(w.p, 60),
      e: w.e ? 1 : 0, b: clamp(Math.round(+w.b || 0), 0, 1),
      hinweis: txt(w.hinweis, 400),
      t: (Array.isArray(w.t) ? w.t : []).slice(0, 7).map(tg => tg && tg.E ? {
        d: txt(tg.d, 30), o: clamp(Math.round(+tg.o || 0), 0, 6), E: txt(tg.E, 30),
        k: txt(tg.k, 8), min: clamp(Math.round(+tg.min || 0), 0, 1000),
        mess: clamp(+tg.mess || 0, 0, 200), art: txt(tg.art, 12),
        A: (Array.isArray(tg.A) ? tg.A : []).slice(0, 60).map(a => ({
          v: clamp(+a.v || 0, 0, 200), b: clamp(+a.b || 0, 0, 200),
          w: txt(a.w, 90), p: txt(a.p, 8), z: clamp(Math.round(+a.z || 2), 1, 5)
        })),
        V: zeilen(tg.V), W: zeilen(tg.W), N: zeilen(tg.N), S: zeilen(tg.S)
      } : null)
    } : null)
  };
}

/* Die fünf Zonen, einmal beschrieben – Kurzform für den Chip, Langform
   für den Griff daneben. */
const LFZONE = {
  1: { kurz: 'Z1', text: 'RPE 2–3 · 50–60 % HFmax · sehr langsam, du könntest singen' },
  2: { kurz: 'Z2', text: 'RPE 4–5 · 60–70 % HFmax · fühlt sich zu langsam an, Nasenatmung' },
  3: { kurz: 'Z3', text: 'RPE 6 · 70–80 % HFmax · leicht ausser Atem, Wohlfühlzone' },
  4: { kurz: 'Z4', text: 'RPE 7–8 · 80–90 % HFmax · keine ganzen Sätze mehr, 30–60 min haltbar' },
  5: { kurz: 'Z5', text: 'RPE 9–10 · 90–100 % HFmax · Grenze, nur Sekunden bis 10 min' }
};

/* Was aus einer Datei kommt, wird hier zurechtgerückt. */
function lfNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const l = leereLauf();
  l.erstellt = +d.erstellt || Date.now();
  l.einstellungen = Object.assign(l.einstellungen, d.einstellungen || {});
  l.plan = lfPlanPruefen(d.plan);
  l.tresor = tresorPruefen(d.tresor);
  const e = (d.eintraege && typeof d.eintraege === 'object') ? d.eintraege : {};
  Object.keys(e).forEach(k => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
    const x = e[k] || {};
    l.eintraege[k] = {
      ok: !!x.ok,
      zeit: String(x.zeit || '').trim().slice(0, 20),
      gefuehl: String(x.gefuehl || '').trim().slice(0, 400)
    };
  });
  if (Array.isArray(d.strecken)) {
    l.strecken = d.strecken.map(x => ({
      name: String(x.name || '').trim().slice(0, 80),
      km: clamp(+x.km || 0, 0, 500),
      art: String(x.art || '').trim().slice(0, 40)
    })).filter(x => x.name);
  }
  return l;
}

let LFTAGE = null;
/* Der aufgesperrte Plan liegt nur hier, nie in LFDB – sonst schriebe ihn die
   Selbstsicherung im Klartext zurück, und der Tresor wäre für nichts. */
let LFKLAR = null;
let LFDB = leereLauf();
const LFStore = macheSpeicher({
  id: 'laufen', metaKey: 'meta-laufen', datenKey: 'daten-laufen', dateiname: 'laufen.json',
  /* Beim Datenwechsel - Datei geladen, Ort gewechselt - muss die gemerkte
     Tagesliste weg, sonst zeigt die App weiter den alten (oft leeren) Plan. */
  daten: () => LFDB, setzen: d => { LFDB = d; LFTAGE = null; LFKLAR = null; }
});
function lfAendern(fn) { if (fn) fn(); LFStore.aendern(); }

const LFORT = appOrtAnmelden({
  store: LFStore, name: 'laufen', datei: 'laufen.json', format: 'mylife-laufen',
  lead: 'Wo sollen deine Laufzeiten liegen? laufen führt eine eigene Datei – die anderen Apps bleiben davon unberührt.',
  normalisiere: lfNormalisiere, leer: leereLauf, starten: () => lfStarten(),
  ortWechseln: () => lfSpeicherort(false)
});
function laufenOeffnen() { return appSpeicherOeffnen(LFORT); }
function lfSpeicherort(erneut) { appSpeicherort(LFORT, erneut); }

const LFICON = {
  heute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5a1.5 1.5 0 1 0 0-.01"/><path d="M8 20.5l2.5-5 3-2 1-4"/><path d="M14.5 9.5l3 2 2.5-.5"/><path d="M11 12.5L7.5 11 5 12.5"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.2"/><path d="M3.5 10h17M8.5 3.5v3M15.5 3.5v3"/></svg>',
  ziel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>'
};

const LFBEDARF = ['385 g KH / 140 g Eiweiß', '460–540 g KH / 155 g Eiweiß'];

/* ---------- Rechnen ---------- */
/* Der Plan steht in der Datenbasis, nicht im Code. Ohne geladene Datei ist er
   leer – jeder Reiter zeigt dann, was zu tun ist. */
const lfPlan = () => LFKLAR || LFDB.plan || { start: '', rennen: [], tests: [], wochen: [] };
const lfHatPlan = () => lfPlan().wochen.length > 0;
const lfZu = () => !!(LFDB.tresor && !LFKLAR);
const lfLeerHtml = (was) => lfZu()
  ? `<div class="empty" style="margin-top:36px"><strong>Plan ist verschlossen</strong>
      ${esc(was)} Tippe auf <b>Aufsperren</b> und gib dein Passwort ein.
      <span class="btn-row" style="margin-top:12px;display:flex">
        <button class="btn btn-primary" data-lfauf style="flex:1">Aufsperren</button></span></div>`
  : `<div class="empty" style="margin-top:36px"><strong>Kein Plan geladen</strong>
      ${esc(was)} Wähle unter <b>Mehr</b> deine <i>laufen.json</i> als Datenbasis –
      Wochen, Rennen, Tests und Strecken stehen dort drin.</div>`;

const lfISO = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
  + '-' + String(d.getDate()).padStart(2, '0');
function lfTagDatum(n, off) {
  const s = (lfPlan().start || '2026-01-05').split('-').map(Number);
  const d = new Date(s[0], s[1] - 1, s[2]);
  d.setDate(d.getDate() + 7 * (n - 1) + off);
  return d;
}
const lfKm = ab => Math.round((ab && ab.length ? ab[ab.length - 1].b : 0) * 10) / 10;
const lfZahl = km => String(Math.round(km * 10) / 10).replace('.', ',');
const lfKmText = km => lfZahl(km) + ' km';
/* Nur die Ziffern stehen in .num - die Einheit bleibt in der Grundschrift,
   sonst laeuft "km" in der Monospace mit und reisst die Luecken auf. */
const lfKmNum = km => '<b class="num">' + lfZahl(km) + '</b> km';
const lfKurz = d => String(d.getDate()).padStart(2, '0') + '.'
  + String(d.getMonth() + 1).padStart(2, '0') + '.';
const lfLang = d => lfKurz(d) + String(d.getFullYear()).slice(2);

/* Alle Einheiten des Plans, flach und nach Datum geordnet. Der Plan ändert
   sich nicht, also wird einmal gerechnet und dann nur noch nachgesehen. */
function lfTage() {
  if (LFTAGE) return LFTAGE;
  LFTAGE = [];
  lfPlan().wochen.forEach(w => w.t.forEach(tg => {
    if (!tg) return;
    const d = lfTagDatum(w.n, tg.o);
    LFTAGE.push({ w: w, tg: tg, d: d, datum: lfISO(d), km: lfKm(tg.A) });
  }));
  LFTAGE.sort((a, b) => a.datum < b.datum ? -1 : 1);
  return LFTAGE;
}
const lfWoche = n => lfPlan().wochen.find(w => w.n === n);
const lfWocheKm = w => w.t.reduce((s, tg) => s + (tg ? lfKm(tg.A) : 0), 0);
const lfEintrag = datum => LFDB.eintraege[datum] || { ok: false, zeit: '', gefuehl: '' };
const lfIstErledigt = datum => {
  const e = LFDB.eintraege[datum];
  return !!(e && (e.ok || e.zeit || e.gefuehl));
};
function lfEintragSetzen(datum, fn) {
  const e = LFDB.eintraege[datum] || { ok: false, zeit: '', gefuehl: '' };
  fn(e);
  LFDB.eintraege[datum] = e;
  LFStore.aendern();
}
const lfHeuteISO = () => lfISO(new Date());
/* Die Einheit, die jetzt dran ist: heute, sonst die nächste noch offene,
   sonst die letzte des Plans. */
function lfAktuelle() {
  const alle = lfTage(), heute = lfHeuteISO();
  return alle.find(t => t.datum === heute)
    || alle.find(t => t.datum >= heute)
    || alle.find(t => !lfIstErledigt(t.datum))
    || alle[alle.length - 1];
}
function lfAktuelleWoche() {
  const a = lfAktuelle();
  return a ? a.w : lfPlan().wochen[0];
}
function lfNaechstesRennen() {
  const heute = lfHeuteISO();
  const r0 = lfPlan().rennen;
  if (!r0.length) return null;
  const mit = r0.map(r => {
    const p = r.datum.split('.');
    return { r: r, iso: p[2] + '-' + p[1] + '-' + p[0] };
  }).sort((a, b) => a.iso < b.iso ? -1 : 1);
  return mit.find(x => x.iso >= heute) || mit[mit.length - 1];
}
const lfTageBis = iso => {
  const a = new Date(lfHeuteISO()), b = new Date(iso);
  return Math.round((b - a) / 86400000);
};

/* ---------- Was die Tests über die Wettkämpfe sagen ----------
   Nach jedem Test wird die Schätzung schärfer: gerechnet wird mit dem
   jüngsten Ergebnis, das eingetragen ist. Steht keines da, bleibt es bei
   der Einschätzung aus dem Plan. */
const lfIsoVon = (d) => { const p = String(d || '').split('.'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : ''; };

function lfLetzterTest() {
  const heute = lfHeuteISO();
  const mit = lfPlan().tests
    .filter(t => t.mess > 0 && t.art === 'maximal')
    .map(t => ({ t: t, iso: lfIsoVon(t.datum), sek: zeitLesen(lfEintrag(lfIsoVon(t.datum)).zeit) }))
    .filter(x => x.sek && x.iso && x.iso <= heute)
    .sort((a, b) => a.iso < b.iso ? -1 : 1);
  return mit.length ? mit[mit.length - 1] : null;
}

/* Je Rennen: was das jüngste Testergebnis dafür bedeutet. */
function lfPrognoseFuer(rennen) {
  const letzt = lfLetzterTest();
  if (!letzt || !(rennen.km > 0)) return null;
  const sek = hochrechnen(letzt.sek, letzt.t.mess, rennen.km, lfPlan().prognose);
  if (!sek) return null;
  return {
    zeit: zeitText(sek), pace: paceText(sek / rennen.km),
    quelle: letzt.t.woche + ' · ' + letzt.t.datum, ist: zeitText(letzt.sek),
    distanz: letzt.t.mess
  };
}

/* ---------- Gerüst ---------- */
const LFTABS = [
  { id: 'lfheute', label: 'Heute', icon: LFICON.heute },
  { id: 'lfplan', label: 'Plan', icon: LFICON.plan },
  { id: 'lfziele', label: 'Ziele', icon: LFICON.ziel },
  { id: 'lfmehr', label: 'Mehr', icon: ICON.more }
];
let lfTab = 'lfheute';
let lfLeistungOffen = null;

function lfStarten() {
  appFlaeche('lf');
  aktiverSpeicher = LFStore;
  lfTab = 'lfheute';
  themeAnwenden();
  lfKnoepfeMalen();
  $('#lfBtnTheme').onclick = () => { themeUmschalten(); lfKnoepfeMalen(); lfViewMalen(); };
  $('#lfBtnVoll').onclick = vollbildUmschalten;
  $('#lfBtnRaus').innerHTML = ICON.x;
  $('#lfBtnRaus').onclick = () => zumStartbildschirm();
  $('#lfBrand').onclick = () => {
    if (lfTab !== 'lfheute') lfTabWechseln('lfheute');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  $('#lfSaveChip').onclick = () => LFStore.alsDateiSichern(false);
  $('#lfBanner').onclick = () => lfLeistungOeffnen(false);
  lfTabbarMalen();
  lfViewMalen();
  LFStore.autosaveStarten();
  saveChipMalen();
  /* Liegt der Plan im Tresor, gleich danach fragen – sonst steht der
     Nutzer vor einer leeren App und weiss nicht, warum. */
  if (lfZu()) setTimeout(() => lfAufsperren(), 250);
}

function lfKnoepfeMalen() {
  const t = $('#lfBtnTheme'), v = $('#lfBtnVoll');
  if (t) t.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  if (!v) return;
  v.hidden = !vollbildGeht();
  v.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
}
function lfTabbarMalen() {
  $('#lftabbar').innerHTML = LFTABS.map(t =>
    `<button data-lftab="${t.id}" aria-selected="${t.id === lfTab}">${t.icon}<span>${t.label}</span></button>`).join('');
  $('#lftabbar').onclick = e => {
    const b = e.target.closest('[data-lftab]');
    if (b) lfTabWechseln(b.dataset.lftab);
  };
}
function lfTabWechseln(id) {
  lfTab = id;
  lfTabbarMalen();
  lfViewMalen();
  window.scrollTo(0, 0);
}
function lfViewMalen() {
  leistenHoeheMessen();
  const v = $('#lfview');
  lfBannerMalen();
  if (lfTab === 'lfheute') lfHeuteMalen(v);
  else if (lfTab === 'lfplan') lfPlanMalen(v);
  else if (lfTab === 'lfziele') lfZieleMalen(v);
  else lfMehrMalen(v);
  lfAufsperrKnopfBinden(v);
  lfKnoepfeMalen();
  saveChipMalen();
  if (lfLeistungOffen) lfLeistungOffen();
}
function lfBannerMalen() {
  const w = lfAktuelleWoche(), r = lfNaechstesRennen();
  if (!w) {
    $('#lfBanner').innerHTML = '<span class="kb-tag">'
      + (lfZu() ? 'Plan ist verschlossen' : 'Kein Plan geladen') + '</span>';
    return;
  }
  const tage = r ? lfTageBis(r.iso) : null;
  $('#lfBanner').innerHTML = `
    <span class="kb-tag">Woche ${w.n} · ${esc(w.p)}</span>
    <span class="kb-zahlen"><span>${lfKmNum(lfWocheKm(w))} diese Woche</span>
      ${r ? `<span class="kb-punkt">·</span>
      <span class="kb-next">${tage > 0 ? pl(tage, 'Tag', 'Tage') + ' bis ' + esc(r.r.name)
        : esc(r.r.name) + ' war am ' + esc(r.r.datum)}</span>` : ''}</span>`;
}

/* ---------- Bausteine, die überall gleich aussehen ---------- */
/* Ein Abschnitt als Zeile: von Kilometer bis Kilometer, was, Pace, Zone.
   Nichts zum Ausrechnen – beim Laufen wird nur abgearbeitet. */
const lfAbschnittText = (a) => a
  ? 'km ' + lfZahl(a.v) + '–' + lfZahl(a.b) + ' · ' + a.w + ' · ' + a.p + '/km'
  : '—';

function lfAbschnitteHtml(tg) {
  return `<ol class="lfteile">${(tg.A || []).map(a => `
    <li><span class="lfkm num">${lfZahl(a.v)}–${lfZahl(a.b)}</span>
      <span class="lfwas">${esc(a.w)}</span>
      <span class="lfpace num">${esc(a.p)}</span>
      <span class="lfzone z${a.z}" title="${esc(LFZONE[a.z] ? LFZONE[a.z].text : '')}">Z${a.z}</span>
    </li>`).join('')}</ol>`;
}

function lfEssenHtml(tg) {
  const block = (titel, zeilen) => `
    <div class="lfblock"><span class="lfblock-t">${titel}</span>
      <div class="lfblock-l">${(zeilen && zeilen.length ? zeilen : ['—'])
        .map(z => `<span>${esc(z)}</span>`).join('')}</div></div>`;
  return `<div class="lfessen">
    ${block('Vorher', tg.V)}
    ${block('Während', tg.W)}
    ${block('Danach', tg.N)}
    ${block('Supplements', tg.S)}
  </div>`;
}

function lfEinheitKarteHtml(eintrag) {
  const { w, tg, d, datum, km } = eintrag;
  const e = lfEintrag(datum);
  const fertig = lfIstErledigt(datum);
  return `
    <div class="lfkarte${fertig ? ' fertig' : ''}" data-lfkarte="${datum}">
      <div class="lfkarte-kopf">
        <span class="lfkarte-tag">${esc(tg.d)} ${lfLang(d)}</span>
        <span class="chip${tg.E === 'Wettkampf' || tg.E === 'Test' ? ' ist' : ''}">${esc(tg.E)}</span>
        <span class="lfkarte-km">${lfKmNum(km)}${tg.min ? ' · ' + tg.min + ' min' : ''}</span>
      </div>
      ${lfAbschnitteHtml(tg)}
      ${lfEssenHtml(tg)}
      <div class="lfkarte-fuss">
        <button class="btn btn-sm${fertig ? ' btn-primary' : ''}" data-lfok="${datum}">${fertig ? 'erledigt' : 'als erledigt merken'}</button>
        <span class="lfist">${e.zeit ? 'Ist ' + esc(e.zeit) : 'keine Zeit'}</span>
        <button class="btn btn-sm btn-ghost" data-lfeintrag="${datum}">Eintragen</button>
      </div>
    </div>`;
}
function lfKartenBinden(wurzel) {
  $$('[data-lfok]', wurzel).forEach(b => {
    b.onclick = () => {
      const datum = b.dataset.lfok;
      const jetzt = lfIstErledigt(datum);
      lfEintragSetzen(datum, e => {
        e.ok = !jetzt;
        if (jetzt) { e.zeit = ''; e.gefuehl = ''; }
      });
      lfViewMalen();
    };
  });
  $$('[data-lfeintrag]', wurzel).forEach(b => {
    b.onclick = () => lfEintragBlatt(b.dataset.lfeintrag);
  });
}

/* Ist-Zeit und Gefühl – ein Blatt, zwei Felder. */
function lfEintragBlatt(datum) {
  const eintrag = lfTage().find(t => t.datum === datum);
  if (!eintrag) return;
  const e = lfEintrag(datum);
  const node = blatt('Eintragen', `
    <p class="hinweis" style="margin:0 0 10px">${esc(eintrag.tg.d)} ${lfLang(eintrag.d)} ·
      ${esc(eintrag.tg.E)} · ${lfKmText(eintrag.km)}</p>
    <div class="grid2">
      <label class="field"><span>Ist-Zeit</span>
        <input type="text" data-lfzeit value="${esc(e.zeit)}" placeholder="z. B. 28:32"></label>
      <label class="field"><span>Gefühl</span>
        <input type="text" data-lfgef value="${esc(e.gefuehl)}" placeholder="z. B. locker"></label>
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary btn-block" data-lfspeichern>Sichern</button>
    </div>`);
  $('[data-lfspeichern]', node).onclick = () => {
    const z = $('[data-lfzeit]', node).value.trim();
    const g = $('[data-lfgef]', node).value.trim();
    lfEintragSetzen(datum, x => { x.zeit = z; x.gefuehl = g; if (z || g) x.ok = true; });
    LFStore.sichern(true);
    layerSchliessen();
    lfViewMalen();
    toast('Eingetragen');
  };
}

/* ---------- Tresor: Plan verschliessen und aufsperren ----------
   Verschlossen steht in der Datenbasis nur der Geheimtext. Aufgesperrt
   liegt der Plan in LFKLAR und wird nirgends zurückgeschrieben – beim
   nächsten Start fragt die App wieder. */
async function lfAufsperren() {
  if (!LFDB.tresor) return false;
  const pw = await tresorPasswortFragen('Plan aufsperren',
    'Der Plan liegt verschlossen in dieser App. Ohne das Passwort kommt niemand daran – auch ich nicht.', false);
  if (pw == null) return false;
  try {
    LFKLAR = lfPlanPruefen(await tresorOeffnen(LFDB.tresor, pw));
    LFTAGE = null;
    lfViewMalen();
    toast('Aufgesperrt');
    return true;
  } catch (e) {
    toast(e.message || 'Passwort stimmt nicht');
    return false;
  }
}

async function lfVerschliessen() {
  if (!tresorGeht()) { toast('Verschlüsseln geht hier nicht'); return; }
  if (!lfHatPlan()) { toast('Kein Plan zum Verschliessen'); return; }
  const pw = await tresorPasswortFragen('Plan verschliessen',
    'Danach steht nur noch Geheimtext in der App. Vergisst du das Passwort, ist der Plan weg – es gibt keinen zweiten Weg hinein.', true);
  if (pw == null) return;
  const plan = lfPlan();
  const t = await tresorSchliessen(plan, pw);
  lfAendern(() => {
    LFDB.tresor = t;
    LFDB.plan = { start: '', rennen: [], tests: [], wochen: [] };
  });
  LFKLAR = plan;
  await LFStore.sichern(true);
  lfViewMalen();
  toast('Verschlossen');
}

async function lfEntschliessen() {
  if (!LFDB.tresor) return;
  if (!LFKLAR) { if (!await lfAufsperren()) return; }
  const ja = await bestaetigen('Tresor auflösen?',
    'Der Plan steht danach wieder im Klartext in der App – wer das Gerät hat, kann ihn lesen.',
    'Auflösen', true);
  if (!ja) return;
  lfAendern(() => { LFDB.plan = LFKLAR; LFDB.tresor = null; });
  await LFStore.sichern(true);
  lfViewMalen();
  toast('Tresor aufgelöst');
}

/* Der Knopf in der Leermeldung – er taucht in jedem Reiter auf. */
function lfAufsperrKnopfBinden(wurzel) {
  const b = $('[data-lfauf]', wurzel);
  if (b) b.onclick = () => lfAufsperren();
}

/* ---------- Heute ---------- */
function lfHeuteMalen(v) {
  const jetzt = lfAktuelle();
  if (!jetzt) { v.innerHTML = lfLeerHtml('Hier stünde die Einheit, die heute dran ist.'); return; }
  const w = jetzt.w;
  const rest = w.t.filter(Boolean)
    .map(tg => {
      const d = lfTagDatum(w.n, tg.o);
      return { w: w, tg: tg, d: d, datum: lfISO(d), km: lfKm(tg.A) };
    })
    .filter(x => x.datum !== jetzt.datum);
  const heute = lfHeuteISO();

  v.innerHTML = `
    <div class="section-head"><h2>${jetzt.datum === heute ? 'Heute' : 'Als Nächstes'}</h2>
      <span class="muted">${esc(w.p)}${w.e ? ' · Entlastungswoche' : ''}</span></div>
    ${lfEinheitKarteHtml(jetzt)}
    ${w.hinweis ? `<p class="hinweis" style="padding:8px 0">${esc(w.hinweis)}</p>` : ''}
    <p class="hinweis" style="padding:2px 0 12px">Tagesbedarf: ${esc(LFBEDARF[w.b])}</p>

    <div class="section-head" style="padding-top:8px"><h2>Rest der Woche ${w.n}</h2></div>
    <div class="list-card">
      ${rest.length ? rest.map(x => `
        <div class="rowline" data-lfzeile="${x.datum}">
          <span class="grow"><span class="rn">${esc(x.tg.d)} ${lfKurz(x.d)} · ${esc(x.tg.E)}</span>
            <span class="rm">${esc(lfAbschnittText(x.tg.A[0]))}</span></span>
          <span class="lfkarte-km">${lfKmNum(x.km)}</span>
          ${lfIstErledigt(x.datum) ? '<span class="lfhaken">✓</span>' : ''}
        </div>`).join('')
      : '<div class="rowline"><span class="grow"><span class="rm">Keine weitere Einheit diese Woche.</span></span></div>'}
    </div>
    <p class="hinweis" style="padding:14px 0 30px">An der Kopfzeile herunterziehen holt die
      Leistungs-Aufstellung.</p>`;

  lfKartenBinden(v);
  $$('[data-lfzeile]', v).forEach(z => { z.onclick = () => lfEintragBlatt(z.dataset.lfzeile); });
}

/* ---------- Plan ---------- */
function lfPlanMalen(v) {
  if (!lfHatPlan()) { v.innerHTML = lfLeerHtml('Hier stünden deine Trainingswochen.'); return; }
  const jetzt = lfAktuelle();
  v.innerHTML = `
    <div class="section-head"><h2>${pl(lfPlan().wochen.length, 'Woche', 'Wochen')}</h2>
      <span class="muted">Montag kurz · Mittwoch kurz · Freitag lang</span></div>
    <div class="list-card">
      ${lfPlan().wochen.map(w => {
        const mo = lfTagDatum(w.n, 0), so = lfTagDatum(w.n, 6);
        const tage = w.t.filter(Boolean);
        const fertig = tage.filter(tg => lfIstErledigt(lfISO(lfTagDatum(w.n, tg.o)))).length;
        const dran = jetzt && jetzt.w.n === w.n;
        return `<div class="rowline${dran ? ' lfdran' : ''}" data-lfwoche="${w.n}">
          <span class="grow"><span class="rn">Woche ${w.n} · ${lfKurz(mo)}–${lfLang(so)}</span>
            <span class="rm">${esc(w.p)}${w.e ? ' · Entlastung' : ''} · ${lfKmText(lfWocheKm(w))}</span></span>
          <span class="lfzaehler${fertig === tage.length ? ' voll' : ''}">${fertig}/${tage.length}</span>
          ${ICON.chev || ''}
        </div>`;
      }).join('')}
    </div>
    <p class="hinweis" style="padding:14px 0 30px">Eine Woche antippen zeigt ihre Einheiten mit
      Aufbau, Verpflegung und Supplements.</p>`;
  $$('[data-lfwoche]', v).forEach(z => { z.onclick = () => lfWocheOeffnen(+z.dataset.lfwoche); });
}

function lfWocheOeffnen(n) {
  const w = lfWoche(n);
  if (!w) return;
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Woche ${n}</div>
        <div class="ovl-sub" data-sub></div></div>
    </div>
    <div class="ovl-body shell" style="padding:12px 0 40px" data-body></div>`;
  const body = $('[data-body]', node);
  const malen = () => {
    const mo = lfTagDatum(n, 0), so = lfTagDatum(n, 6);
    $('[data-sub]', node).textContent = lfKurz(mo) + '–' + lfLang(so) + ' · ' + w.p
      + (w.e ? ' · Entlastungswoche' : '') + ' · ' + lfKmText(lfWocheKm(w));
    body.innerHTML = `
      ${w.hinweis ? `<p class="hinweis" style="padding:0 0 10px">${esc(w.hinweis)}</p>` : ''}
      <p class="hinweis" style="padding:0 0 12px">Tagesbedarf: ${esc(LFBEDARF[w.b])}</p>
      ${w.t.filter(Boolean).map(tg => {
        const d = lfTagDatum(n, tg.o);
        return lfEinheitKarteHtml({ w: w, tg: tg, d: d, datum: lfISO(d), km: lfKm(tg.T) });
      }).join('')}`;
    lfKartenBinden(body);
  };
  $('[data-back]', node).onclick = () => layerSchliessen();
  layerOeffnen(node);
  malen();
  return node;
}

/* ---------- Ziele ---------- */
function lfZieleMalen(v) {
  if (!lfPlan().rennen.length && !lfPlan().tests.length) {
    v.innerHTML = lfLeerHtml('Hier stünden deine Rennen und Tests.');
    return;
  }
  const isoVon = s => { const p = s.split('.'); return p[2] + '-' + p[1] + '-' + p[0]; };
  v.innerHTML = `
    <div class="section-head"><h2>Rennen</h2><span class="muted">Persönliches Ziel und KI Einschätzung</span></div>
    ${lfPlan().rennen.map(r => {
      const iso = isoVon(r.datum), e = lfEintrag(iso), tage = lfTageBis(iso);
      const pg = lfPrognoseFuer(r);
      return `<div class="lfkarte" data-lfrennen="${iso}">
        <div class="lfkarte-kopf">
          <span class="lfkarte-tag">${esc(r.name)} · ${esc(r.ort)}</span>
          <span class="chip">${esc(r.datum)}</span>
          <span class="lfkarte-km">${tage > 0 ? '<b class="num">' + tage + '</b> Tage' : 'vorbei'}</span>
        </div>
        <div class="lfwerte vier">
          <div><span>Persönliches Ziel</span><b>${esc(r.traum)}</b><i>${esc(r.traumPace)}</i></div>
          <div><span>KI Einschätzung</span><b>${esc(r.ziel)}</b><i>${esc(r.zielPace)}</i></div>
          <div class="lfjetzt"><span>Stand heute</span>
            <b>${pg ? esc(pg.zeit) : '—'}</b>
            <i>${pg ? esc(pg.pace) + '/km' : 'noch kein Maximaltest'}</i></div>
          <div><span>Ist-Zeit</span><b>${e.zeit ? esc(e.zeit) : '—'}</b><i>${esc(r.woche)}</i></div>
        </div>
        ${pg ? `<p class="lfquelle">hochgerechnet aus ${esc(pg.quelle)}: ${esc(pg.ist)}
          über ${lfZahl(pg.distanz)} km</p>` : ''}
        <div class="lfkarte-fuss">
          <span class="lfist">${e.gefuehl ? esc(e.gefuehl) : 'noch nichts eingetragen'}</span>
          <button class="btn btn-sm btn-ghost" data-lfeintrag="${iso}">Eintragen</button>
        </div>
      </div>`;
    }).join('')}

    <div class="section-head" style="padding-top:14px"><h2>Tests</h2>
      <span class="muted">${pl(lfPlan().tests.length, 'Termin', 'Termine')}</span></div>
    <div class="list-card">
      ${lfPlan().tests.map(t => {
        const iso = isoVon(t.datum), e = lfEintrag(iso);
        return `<div class="rowline" data-lfzeile="${iso}">
          <span class="grow"><span class="rn">${esc(t.woche)} · ${esc(t.datum)}</span>
            <span class="rm">${esc(t.teil1)}${t.teil2 && t.teil2 !== '—' ? ' + ' + esc(t.teil2) : ''}</span></span>
          <span class="lfziel"><b>${esc(t.ziel)}</b><i>${e.zeit ? esc(e.zeit) : 'Ist offen'}${
            t.art === 'maximal' ? ' · zählt' : ''}</i></span>
        </div>`;
      }).join('')}
    </div>
    <p class="hinweis" style="padding:14px 0 30px">Das persönliche Ziel bleibt stehen;
      trainiert wird auf die KI Einschätzung. <b>Stand heute</b> rechnet das jüngste
      Ergebnis eines <b>Maximaltests</b> hoch – mit jedem davon wird die Zahl schärfer.
      Tests mit fester Pace oder am Ende eines langen Laufs zählen dafür nicht:
      sie messen, ob die Vorgabe sitzt, nicht was frisch drin wäre.</p>`;
  lfKartenBinden(v);
  $$('[data-lfzeile]', v).forEach(z => { z.onclick = () => lfEintragBlatt(z.dataset.lfzeile); });
}

/* ---------- Mehr ---------- */
function lfMehrMalen(v) {
  const getan = Object.keys(LFDB.eintraege).filter(k => lfIstErledigt(k)).length;
  v.innerHTML = `
    ${appDatenHtml(LFORT)}

    <div class="section-head" style="padding-top:14px"><h2>Stammstrecken</h2></div>
    <div class="list-card">
      ${!LFDB.strecken.length ? `<div class="rowline"><span class="grow">
        <span class="rm">Noch keine – sie stehen in deiner laufen.json.</span></span></div>` : ''}
      ${LFDB.strecken.map(s => `<div class="rowline">
        <span class="grow"><span class="rn">${esc(s.name)}</span>
          <span class="rm">${esc(s.art)}</span></span>
        <span class="lfkarte-km">${lfKmNum(s.km)}</span></div>`).join('')}
    </div>

    <div class="section-head" style="padding-top:14px"><h2>Tresor</h2>
      <span class="muted">${LFDB.tresor ? (LFKLAR ? 'offen' : 'verschlossen') : 'aus'}</span></div>
    <div class="list-card">
      ${!tresorGeht() ? `<div class="rowline"><span class="grow"><span class="rn">Nicht möglich</span>
        <span class="rm">Dieser Browser gibt die Verschlüsselung hier nicht her.</span></span></div>` : ''}
      ${LFDB.tresor ? `
        <div class="rowline"><span class="grow"><span class="rn">${LFKLAR ? 'Aufgesperrt' : 'Verschlossen'}</span>
          <span class="rm">${LFKLAR ? 'Beim nächsten Start fragt die App wieder nach dem Passwort.'
            : 'In der App steht nur Geheimtext.'}</span></span>
          ${LFKLAR ? '' : '<button class="btn btn-sm btn-primary" data-lfauf>Aufsperren</button>'}</div>
        <div class="rowline"><span class="grow"><span class="rn">Tresor auflösen</span>
          <span class="rm">Plan wieder im Klartext ablegen</span></span>
          <button class="btn btn-sm btn-danger" data-lfentschliessen>Auflösen</button></div>`
      : `<div class="rowline"><span class="grow"><span class="rn">Plan verschliessen</span>
          <span class="rm">Mit einem Passwort. Danach steht nur Geheimtext in der App.</span></span>
          <button class="btn btn-sm" data-lfverschliessen ${lfHatPlan() && tresorGeht() ? '' : 'disabled'}>Verschliessen</button></div>`}
    </div>

    <div class="section-head" style="padding-top:14px"><h2>Der Plan</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Zeitraum</span>
        <span class="rm">${lfHatPlan() ? esc(lfPlan().start) + ' · ' + pl(lfPlan().wochen.length, 'Woche', 'Wochen') : 'noch keiner geladen'}</span></span></div>
      <div class="rowline"><span class="grow"><span class="rn">Lauftage</span>
        <span class="rm">Montag kurz · Mittwoch kurz mit Qualität · Freitag lang</span></span></div>
      <div class="rowline"><span class="grow"><span class="rn">Eingetragen</span>
        <span class="rm">${pl(getan, 'Einheit', 'Einheiten')} von ${lfTage().length}</span></span>
        <span class="num">${getan}</span></div>
      <div class="rowline"><span class="grow"><span class="rn">Einträge löschen</span>
        <span class="rm">Der Plan bleibt, nur deine Zeiten gehen weg</span></span>
        <button class="btn btn-sm btn-danger" data-lfreset>Zurücksetzen</button></div>
    </div>

    ${huelleEinstellungenHtml()}
    <p class="hinweis" style="padding:16px 0 30px">Blutwerte (Ferritin, B12, Vitamin D) vor
      Trainingsbeginn ärztlich checken lassen. Dieser Plan ist kein Ersatz für ärztlichen Rat.
      laufen führt eine eigene Datei – die anderen Apps dieser Datei bleiben davon unberührt.</p>`;

  appDatenBinden(LFORT, v, lfViewMalen);
  huelleEinstellungenBinden(v, lfViewMalen);
  const vs = $('[data-lfverschliessen]', v);
  if (vs) vs.onclick = () => lfVerschliessen();
  const es = $('[data-lfentschliessen]', v);
  if (es) es.onclick = () => lfEntschliessen();
  $('[data-lfreset]', v).onclick = async () => {
    const ja = await bestaetigen('Alle Einträge löschen?',
      'Ist-Zeiten und Gefühle gehen weg. Der Plan selbst bleibt unverändert.',
      'Löschen', true);
    if (!ja) return;
    lfAendern(() => { LFDB.eintraege = {}; });
    LFStore.sichern(true);
    lfViewMalen();
    toast('Einträge gelöscht');
  };
}

/* ---------- Leistungs-Aufstellung ----------
   Hängt am Vorhang: an der Kopfzeile herunterziehen deckt sie auf, am Finger
   wieder hoch schiebt sie weg. */
function lfLeistungOeffnen(gezogen) {
  if (lfLeistungOffen || !lfHatPlan()) return null;
  const node = document.createElement('div');
  node.className = 'overlay' + (gezogen ? ' zieht' : '');
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Leistung</div>
        <div class="ovl-sub" data-sub></div></div>
    </div>
    <div class="ovl-body shell" style="padding:12px 0 40px" data-body></div>`;
  const body = $('[data-body]', node);
  const malen = () => {
    const alle = lfTage();
    const getan = alle.filter(t => lfIstErledigt(t.datum));
    const kmGetan = getan.reduce((s, t) => s + t.km, 0);
    const kmGesamt = alle.reduce((s, t) => s + t.km, 0);
    $('[data-sub]', node).textContent = getan.length + ' von ' + alle.length + ' Einheiten';
    lfLeistungMalen(body, { alle, getan, kmGetan, kmGesamt });
  };
  $('[data-back]', node).onclick = () => layerSchliessen();
  vorhangHochBinden(node, body);
  layerOeffnen(node, () => { lfLeistungOffen = null; });
  lfLeistungOffen = malen;
  malen();
  return node;
}

function lfLeistungMalen(root, z) {
  const w = lfAktuelleWoche() || { n: 0, p: '–' };
  const r = lfNaechstesRennen();
  const isoVon = s => { const p = s.split('.'); return p[2] + '-' + p[1] + '-' + p[0]; };
  const maxKm = Math.max.apply(null, lfPlan().wochen.map(lfWocheKm).concat([1]));
  const tests = lfPlan().tests.map(t => {
    const iso = isoVon(t.datum);
    return { t: t, iso: iso, e: lfEintrag(iso) };
  });
  const mitZeit = tests.filter(x => x.e.zeit);

  root.innerHTML = `
    <div class="lffakten">
      <div><b><span class="num">${z.getan.length}</span></b><span>Einheiten gelaufen</span>
        <i>von ${z.alle.length}</i></div>
      <div><b>${lfKmNum(z.kmGetan)}</b><span>zurückgelegt</span>
        <i>von ${lfKmText(z.kmGesamt)}</i></div>
      <div><b><span class="num">${Math.round(z.kmGesamt ? z.kmGetan / z.kmGesamt * 100 : 0)}</span> %</b>
        <span>des Plans</span><i>Woche ${w.n} · ${esc(w.p)}</i></div>
      <div><b><span class="num">${r ? Math.max(0, lfTageBis(r.iso)) : 0}</span></b>
        <span>Tage bis ${r ? esc(r.r.name) : 'Rennen'}</span>
        <i>${r ? 'KI ' + esc(r.r.ziel) : 'keins eingetragen'}</i></div>
    </div>

    <div class="section-head" style="padding-top:16px"><h2>Wochenumfang</h2>
      <span class="muted">Soll und erledigt</span></div>
    <div class="lfbahn">
      ${lfPlan().wochen.map(x => {
        const soll = lfWocheKm(x);
        const tage = x.t.filter(Boolean);
        const fertig = tage.filter(tg => lfIstErledigt(lfISO(lfTagDatum(x.n, tg.o))));
        const kmF = fertig.reduce((s, tg) => s + lfKm(tg.A), 0);
        const h = Math.max(2, Math.round(soll / maxKm * 100));
        const hf = soll ? Math.round(kmF / soll * h) : 0;
        return `<span class="lfsaeule${x.n === w.n ? ' dran' : ''}" style="height:${h}%"
          title="Woche ${x.n}: ${lfKmText(kmF)} von ${lfKmText(soll)}">
          <i style="height:${hf}%"></i></span>`;
      }).join('')}
    </div>
    <p class="hinweis" style="padding:6px 0 4px">Woche 1 links bis Woche 52 rechts.
      Höchster Balken: ${lfKmText(maxKm)}.</p>

    <div class="section-head" style="padding-top:16px"><h2>Tests</h2>
      <span class="muted">${mitZeit.length} von ${tests.length} gelaufen</span></div>
    <div class="list-card">
      ${tests.map(x => `<div class="rowline">
        <span class="grow"><span class="rn">${esc(x.t.woche)} · ${esc(x.t.gesamt)}</span>
          <span class="rm">${esc(x.t.datum)} · Ziel ${esc(x.t.ziel)}</span></span>
        <span class="lfziel"><b>${x.e.zeit ? esc(x.e.zeit) : '—'}</b>
          <i>${x.e.gefuehl ? esc(x.e.gefuehl.slice(0, 22)) : 'offen'}</i></span>
      </div>`).join('')}
    </div>

    <div class="section-head" style="padding-top:16px"><h2>Rennen</h2></div>
    <div class="list-card">
      ${lfPlan().rennen.map(x => {
        const e = lfEintrag(isoVon(x.datum));
        const pg = lfPrognoseFuer(x);
        return `<div class="rowline">
          <span class="grow"><span class="rn">${esc(x.name)} · ${esc(x.datum)}</span>
            <span class="rm">Persönlich ${esc(x.traum)} · KI ${esc(x.ziel)}${
            pg ? ' · Stand heute ' + esc(pg.zeit) : ''}</span></span>
          <span class="lfziel"><b>${e.zeit ? esc(e.zeit) : '—'}</b><i>${esc(x.ort)}</i></span>
        </div>`;
      }).join('')}
    </div>`;
}

/* Der Kopf ist zugleich der Griff: herunterziehen holt die Aufstellung.
   Gleiche Mechanik wie überall – 1:1 am Finger, kurze Schwelle plus Schwung. */
(function lfKopfZiehen() {
  const kopf = document.querySelector('#lf .topbar');
  if (!kopf) return;
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
      node = lfLeistungOeffnen(true);
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
