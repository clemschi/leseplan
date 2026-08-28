/* ============================================================
   minimal – die fünfte App in dieser Datei
   Zwei Fragen, sonst nichts: Wie viele Dinge sind es? Und wann kam
   zuletzt etwas Neues dazu?

   Jedes Ding steht einmal in der Liste, mit dem Tag, an dem es kam.
   Geht es wieder, bekommt es den Tag, an dem es ging – gelöscht wird
   nichts, sonst liesse sich später nicht mehr sagen, wie es war.
   ============================================================ */

function leereMin() {
  return {
    format: 'mylife-minimal',
    version: 1,
    erstellt: Date.now(),
    geaendert: Date.now(),
    einstellungen: { autosaveSek: 60, ziel: 0 },
    dinge: [],
    /* Eigene Ordnung, damit nicht jede Kleinigkeit ein eigener Bereich wird. */
    bereiche: ['Wohnen', 'Küche', 'Kleidung', 'Arbeit', 'Draussen', 'Sonstiges']
  };
}

const MIWEGE = [
  { id: 'gekauft', name: 'gekauft' },
  { id: 'geschenkt', name: 'geschenkt' },
  { id: 'geerbt', name: 'übernommen' },
  { id: 'gefunden', name: 'schon da' }
];
const MIRAUS = [
  { id: 'verschenkt', name: 'verschenkt' },
  { id: 'verkauft', name: 'verkauft' },
  { id: 'entsorgt', name: 'entsorgt' },
  { id: 'verloren', name: 'verloren' }
];

function minNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const m = leereMin();
  m.erstellt = +d.erstellt || Date.now();
  m.einstellungen = Object.assign(m.einstellungen, d.einstellungen || {});
  m.einstellungen.ziel = Math.max(0, Math.round(+m.einstellungen.ziel || 0));
  if (Array.isArray(d.bereiche) && d.bereiche.length) {
    m.bereiche = d.bereiche.map(x => String(x).trim()).filter(Boolean).slice(0, 40);
  }
  const tag = x => /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : '';
  m.dinge = Array.isArray(d.dinge) ? d.dinge.map(x => ({
    id: String(x.id || uid()),
    name: String(x.name || '').trim().slice(0, 120),
    bereich: String(x.bereich || 'Sonstiges').trim() || 'Sonstiges',
    anzahl: clamp(Math.round(+x.anzahl || 1), 1, 9999),
    rein: tag(x.rein) || heute(),
    weg: String(x.weg || 'gekauft'),
    raus: tag(x.raus),
    wohin: String(x.wohin || ''),
    notiz: String(x.notiz || '').slice(0, 600)
  })).filter(x => x.name) : [];
  return m;
}

let MDB = leereMin();
const MStore = macheSpeicher({
  id: 'minimal', metaKey: 'meta-minimal', datenKey: 'daten-minimal', dateiname: 'minimal.json',
  daten: () => MDB, setzen: d => { MDB = d; }
});
function mAendern(fn) { if (fn) fn(); MStore.aendern(); }

const MORT = appOrtAnmelden({
  store: MStore, name: 'minimal', datei: 'minimal.json', format: 'mylife-minimal',
  lead: 'Wo soll die Liste deiner Dinge liegen? minimal führt eine eigene Datei – die anderen Apps bleiben davon unberührt.',
  normalisiere: minNormalisiere, leer: leereMin, starten: () => minStarten(),
  ortWechseln: () => minSpeicherort(false)
});
function minimalOeffnen() { return appSpeicherOeffnen(MORT); }
function minSpeicherort(erneut) { appSpeicherort(MORT, erneut); }

const MICON = {
  stand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5h16"/><path d="M7 19.5V11M12 19.5V6M17 19.5v-5.5"/></svg>',
  dinge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="4.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="14.5" width="7" height="5" rx="1.6"/><rect x="13.5" y="14.5" width="7" height="5" rx="1.6"/></svg>',
  verlauf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l5-5 3.5 3L20 7"/><path d="M20 11V7h-4"/></svg>'
};

/* ---------- Rechnen ---------- */
const mDa = () => MDB.dinge.filter(d => !d.raus);
const mAnzahl = () => mDa().reduce((n, d) => n + d.anzahl, 0);
const mLetzteAnschaffung = () => {
  /* „Neu" heisst gekauft – geschenkt oder schon da zählt nicht als Kauf. */
  const k = MDB.dinge.filter(d => d.weg === 'gekauft').map(d => d.rein).sort();
  return k.length ? k[k.length - 1] : '';
};
const mTageSeit = (datum) => {
  if (!datum) return null;
  const t = kDatum(datum);
  if (!t) return null;
  const heuteD = new Date(); heuteD.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((heuteD - t) / 86400000);
};
const mNachBereich = () => {
  const map = new Map();
  mDa().forEach(d => { map.set(d.bereich, (map.get(d.bereich) || 0) + d.anzahl); });
  return Array.from(map, ([bereich, n]) => ({ bereich, n })).sort((a, b) => b.n - a.n);
};

/* ---------- Gerüst ---------- */
const MTABS = [
  { id: 'stand', label: 'Stand', icon: MICON.stand },
  { id: 'dinge', label: 'Dinge', icon: MICON.dinge },
  { id: 'verlauf', label: 'Verlauf', icon: MICON.verlauf },
  { id: 'mimehr', label: 'Mehr', icon: ICON.more }
];
let mTab = 'stand';
let mFilter = '';          /* Bereich, auf den die Liste eingeschränkt ist */
let mZeigeWeg = false;     /* auch das Abgegebene zeigen */

function minStarten() {
  appFlaeche('mi');
  aktiverSpeicher = MStore;
  mTab = 'stand';
  themeAnwenden();
  mKnoepfeMalen();
  $('#miBtnTheme').onclick = () => { themeUmschalten(); mKnoepfeMalen(); mViewMalen(); };
  $('#miBtnVoll').onclick = vollbildUmschalten;
  $('#miBtnRaus').innerHTML = ICON.x;
  $('#miBtnRaus').onclick = () => zumStartbildschirm();
  $('#miBrand').onclick = () => { if (mTab !== 'stand') mTabWechseln('stand'); else window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#miSaveChip').onclick = () => MStore.alsDateiSichern(false);
  $('#miBanner').onclick = () => mTabWechseln('stand');
  mTabbarMalen();
  mViewMalen();
  MStore.autosaveStarten();
  saveChipMalen();
}

function mKnoepfeMalen() {
  const t = $('#miBtnTheme'), v = $('#miBtnVoll');
  if (t) t.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  if (!v) return;
  v.hidden = !vollbildGeht();
  v.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
}
function mTabbarMalen() {
  $('#mitabbar').innerHTML = MTABS.map(t =>
    `<button data-mitab="${t.id}" aria-selected="${t.id === mTab}">${t.icon}<span>${t.label}</span></button>`).join('');
  $('#mitabbar').onclick = e => {
    const b = e.target.closest('[data-mitab]');
    if (b) mTabWechseln(b.dataset.mitab);
  };
}
function mTabWechseln(id) {
  mTab = id;
  mTabbarMalen();
  mViewMalen();
  window.scrollTo(0, 0);
}
function mViewMalen() {
  leistenHoeheMessen();
  const v = $('#miview');
  mBannerMalen();
  if (mTab === 'stand') mStandMalen(v);
  else if (mTab === 'dinge') mDingeMalen(v);
  else if (mTab === 'verlauf') mVerlaufMalen(v);
  else mMehrMalen(v);
  mKnoepfeMalen();
  saveChipMalen();
}
function mBannerMalen() {
  const b = $('#miBanner');
  const tage = mTageSeit(mLetzteAnschaffung());
  b.innerHTML = `
    <span class="kb-tag">${mAnzahl()} ${mAnzahl() === 1 ? 'Ding' : 'Dinge'}</span>
    <span class="kb-zahlen">${tage == null ? '<span>nichts gekauft</span>'
      : `<span class="num">${tage}</span><span>${tage === 1 ? 'Tag ohne Kauf' : 'Tage ohne Kauf'}</span>`}</span>`;
}

/* ---------- Stand ---------- */
function mStandMalen(v) {
  const n = mAnzahl();
  const kauf = mLetzteAnschaffung();
  const tage = mTageSeit(kauf);
  const ziel = MDB.einstellungen.ziel;
  const bereiche = mNachBereich();
  const groesste = bereiche.length ? bereiche[0].n : 1;
  const letzte = MDB.dinge.filter(d => !d.raus).slice().sort((a, b) => (a.rein < b.rein ? 1 : -1)).slice(0, 3);

  v.innerHTML = `
    <div class="mizahl">
      <b class="num">${n}</b>
      <span>${n === 1 ? 'Ding' : 'Dinge'} im Besitz</span>
      ${ziel ? `<i class="${n <= ziel ? 'gut' : 'drueber'}">Ziel ${ziel} · ${n <= ziel
        ? (ziel - n === 0 ? 'genau erreicht' : pl(ziel - n, 'Platz frei', 'Plätze frei'))
        : pl(n - ziel, 'darüber', 'darüber')}</i>` : ''}
    </div>

    <div class="mikauf${tage != null && tage >= 30 ? ' lang' : ''}">
      ${kauf ? `<b class="num">${tage}</b><span>${tage === 1 ? 'Tag' : 'Tage'} seit dem letzten Kauf</span>
        <i>zuletzt am ${esc(kTagText(kauf, true))}</i>`
      : `<b>–</b><span>noch nichts gekauft</span><i>Was hier steht, kam auf anderem Weg</i>`}
    </div>

    ${bereiche.length ? `
      <div class="section-head" style="margin-top:22px"><h2>Wo es liegt</h2></div>
      <div class="list-card">
        ${bereiche.map(b => `
          <button class="rowline mibereich" data-bereich="${esc(b.bereich)}">
            <span class="grow"><span class="rn">${esc(b.bereich)}</span>
              <span class="balken"><i style="width:${Math.round(b.n / groesste * 100)}%"></i></span></span>
            <span class="num">${b.n}</span>
          </button>`).join('')}
      </div>` : `
      <div class="empty" style="margin-top:30px"><strong>Noch nichts eingetragen</strong>
        Trag ein, was du hast – oder wenigstens das, was dazukommt. Schon die Zahl allein
        ändert den Blick.</div>`}

    ${letzte.length ? `
      <div class="section-head" style="margin-top:22px"><h2>Zuletzt dazugekommen</h2></div>
      <div class="list-card">
        ${letzte.map(d => `
          <div class="rowline"><span class="grow"><span class="rn">${esc(d.name)}</span>
            <span class="rm">${esc(mWegText(d))} · ${esc(kTagText(d.rein))}</span></span>
            ${d.anzahl > 1 ? `<span class="num">${d.anzahl}×</span>` : ''}</div>`).join('')}
      </div>` : ''}

    <button class="btn btn-primary btn-block" style="margin-top:22px" data-mineu>${ICON.plus} Ding eintragen</button>
    <p class="hinweis" style="padding:16px 0 30px">Abgegebenes bleibt in der Liste, nur mit
      Datum des Abgangs – sonst liesse sich später nicht mehr sagen, wie es einmal war.</p>`;

  $$('[data-bereich]', v).forEach(b => b.onclick = () => {
    mFilter = b.dataset.bereich;
    mTabWechseln('dinge');
  });
  $('[data-mineu]', v).onclick = () => mDingBlatt(null);
}

const mWegText = d => (MIWEGE.find(w => w.id === d.weg) || MIWEGE[0]).name;
const mRausText = d => (MIRAUS.find(w => w.id === d.wohin) || { name: 'weg' }).name;

/* ---------- Dinge ---------- */
function mDingeMalen(v) {
  const alle = MDB.dinge.filter(d => mZeigeWeg || !d.raus);
  const gezeigt = mFilter ? alle.filter(d => d.bereich === mFilter) : alle;
  const nachBereich = [];
  gezeigt.slice().sort((a, b) => (a.rein < b.rein ? 1 : -1)).forEach(d => {
    let g = nachBereich.find(x => x.bereich === d.bereich);
    if (!g) { g = { bereich: d.bereich, dinge: [] }; nachBereich.push(g); }
    g.dinge.push(d);
  });

  v.innerHTML = `
    <div class="chiprow" style="margin-top:14px">
      <button class="chip" data-mifilter="" aria-pressed="${!mFilter}">Alle</button>
      ${MDB.bereiche.map(b => `<button class="chip" data-mifilter="${esc(b)}" aria-pressed="${mFilter === b}">${esc(b)}</button>`).join('')}
    </div>
    <div class="rowline" style="border:0;padding:10px 2px 0">
      <span class="grow"><span class="rm">${pl(gezeigt.filter(d => !d.raus).reduce((n, d) => n + d.anzahl, 0), 'Ding', 'Dinge')} hier</span></span>
      <button class="btn btn-sm" data-miweg>${mZeigeWeg ? 'Abgegebene aus' : 'Abgegebene an'}</button>
    </div>

    ${nachBereich.length ? nachBereich.map(g => `
      <div class="section-head" style="margin-top:18px"><h2>${esc(g.bereich)}</h2>
        <span class="eyebrow">${g.dinge.filter(d => !d.raus).reduce((n, d) => n + d.anzahl, 0)}</span></div>
      <div class="list-card">
        ${g.dinge.map(d => `
          <button class="rowline miding${d.raus ? ' weg' : ''}" data-miding="${d.id}">
            <span class="grow"><span class="rn">${esc(d.name)}${d.anzahl > 1 ? ' <i class="mimenge">' + d.anzahl + '×</i>' : ''}</span>
              <span class="rm">${d.raus
      ? esc(mRausText(d)) + ' am ' + esc(kTagText(d.raus))
      : esc(mWegText(d)) + ' am ' + esc(kTagText(d.rein))}</span></span>
            ${d.raus ? '' : `<span class="mitage num">${mTageSeit(d.rein)} T</span>`}
          </button>`).join('')}
      </div>`).join('')
      : `<div class="empty" style="margin-top:30px"><strong>Hier ist nichts</strong>
          ${mFilter ? 'In diesem Bereich steht noch nichts.' : 'Trag das erste Ding ein.'}</div>`}

    <button class="btn btn-primary btn-block" style="margin-top:20px" data-mineu>${ICON.plus} Ding eintragen</button>
    <div style="height:30px"></div>`;

  $$('[data-mifilter]', v).forEach(b => b.onclick = () => { mFilter = b.dataset.mifilter; mViewMalen(); });
  $('[data-miweg]', v).onclick = () => { mZeigeWeg = !mZeigeWeg; mViewMalen(); };
  $$('[data-miding]', v).forEach(b => b.onclick = () => mDingBlatt(MDB.dinge.find(d => d.id === b.dataset.miding)));
  $('[data-mineu]', v).onclick = () => mDingBlatt(null);
}

/* Ein Ding anlegen oder ändern. */
function mDingBlatt(ding) {
  const neu = !ding;
  const d = ding || { id: uid(), name: '', bereich: mFilter || MDB.bereiche[0] || 'Sonstiges', anzahl: 1, rein: heute(), weg: 'gekauft', raus: '', wohin: '', notiz: '' };
  const s = blatt(neu ? 'Ding eintragen' : 'Ding', `
    <div class="field"><label>Was ist es?</label>
      <input type="text" data-name value="${esc(d.name)}" placeholder="z.B. Winterjacke"></div>
    <div class="grid2">
      <div class="field"><label>Bereich</label>
        <select data-dbereich>${MDB.bereiche.map(b => `<option value="${esc(b)}"${b === d.bereich ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
      <div class="field"><label>Anzahl</label>
        <input type="number" data-anzahl min="1" max="9999" value="${d.anzahl}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Seit wann</label>
        <input type="date" data-rein value="${esc(d.rein)}"></div>
      <div class="field"><label>Wie gekommen</label>
        <select data-weg>${MIWEGE.map(w => `<option value="${w.id}"${w.id === d.weg ? ' selected' : ''}>${w.name}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Notiz</label>
      <textarea data-notiz style="min-height:70px" placeholder="Muss nicht">${esc(d.notiz)}</textarea></div>

    ${neu ? '' : `
      <div class="section-head" style="margin-top:6px"><h2>Abgeben</h2></div>
      <div class="list-card" style="margin-bottom:14px">
        <div class="rowline"><span class="grow"><span class="rn">${d.raus ? 'Ging am ' + esc(kTagText(d.raus)) : 'Ist noch da'}</span>
          <span class="rm">${d.raus ? esc(mRausText(d)) : 'Weggegeben, verkauft, entsorgt?'}</span></span>
          <button class="btn btn-sm" data-mirausx>${d.raus ? 'Zurückholen' : 'Abgeben'}</button></div>
      </div>`}

    <div class="btn-row">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Eintragen' : 'Sichern'}</button>
      ${neu ? '' : '<button class="btn btn-danger" data-loeschen>' + ICON.trash + '</button>'}
    </div>`, { fokus: neu });

  $('[data-ok]', s).onclick = () => {
    const name = $('[data-name]', s).value.trim();
    if (!name) { toast('Ohne Namen geht es nicht.'); return; }
    const rein = $('[data-rein]', s).value;
    mAendern(() => {
      d.name = name.slice(0, 120);
      d.bereich = $('[data-dbereich]', s).value;
      d.anzahl = clamp(Math.round(+$('[data-anzahl]', s).value || 1), 1, 9999);
      d.rein = /^\d{4}-\d{2}-\d{2}$/.test(rein) ? rein : heute();
      d.weg = $('[data-weg]', s).value;
      d.notiz = $('[data-notiz]', s).value.trim().slice(0, 600);
      if (neu) MDB.dinge.push(d);
    });
    MStore.sichern(true);
    layerSchliessen();
    mViewMalen();
  };
  const rausKnopf = $('[data-mirausx]', s);
  if (rausKnopf) rausKnopf.onclick = () => {
    if (d.raus) {
      mAendern(() => { d.raus = ''; d.wohin = ''; });
      MStore.sichern(true);
      layerSchliessen();
      mViewMalen();
      return;
    }
    mAbgebenBlatt(d);
  };
  const del = $('[data-loeschen]', s);
  if (del) del.onclick = async () => {
    if (!await bestaetigen('Eintrag löschen?',
      'Das Ding verschwindet ganz aus der Liste. Wer nur abgibt, nimmt besser „Abgeben“ – dann bleibt der Verlauf stehen.',
      'Löschen', true)) return;
    mAendern(() => { MDB.dinge = MDB.dinge.filter(x => x.id !== d.id); });
    MStore.sichern(true);
    layerSchliessen();
    mViewMalen();
  };
}

/* Abgeben heisst: das Ding bleibt stehen, bekommt aber sein Enddatum. */
function mAbgebenBlatt(d) {
  const s = blatt('Abgeben', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      <strong>${esc(d.name)}</strong> bleibt im Verlauf stehen und zählt ab dem Tag nicht mehr mit.</p>
    <div class="grid2">
      <div class="field"><label>Wann</label><input type="date" data-datum value="${heute()}"></div>
      <div class="field"><label>Wohin</label>
        <select data-wohin>${MIRAUS.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select></div>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Abgeben</button>`, { ersetzen: true, fokus: false });
  $('[data-ok]', s).onclick = () => {
    const t = $('[data-datum]', s).value;
    mAendern(() => {
      d.raus = /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : heute();
      d.wohin = $('[data-wohin]', s).value;
    });
    MStore.sichern(true);
    layerSchliessen();
    mViewMalen();
    toast('Abgegeben. Ein Ding weniger.');
  };
}

/* ---------- Verlauf ---------- */
/* Monat für Monat: was kam, was ging – und wie viele es danach waren. */
function mVerlaufMalen(v) {
  const monate = new Map();
  const merke = (datum, feld) => {
    if (!datum) return;
    const m = datum.slice(0, 7);
    if (!monate.has(m)) monate.set(m, { monat: m, rein: 0, raus: 0 });
    monate.get(m)[feld]++;
  };
  MDB.dinge.forEach(d => { merke(d.rein, 'rein'); merke(d.raus, 'raus'); });
  const reihe = Array.from(monate.values()).sort((a, b) => (a.monat < b.monat ? -1 : 1));
  /* Der Stand am Ende jedes Monats. */
  let stand = 0;
  reihe.forEach(m => { stand += m.rein - m.raus; m.stand = stand; });
  const groesste = Math.max(1, ...reihe.map(m => Math.max(m.rein, m.raus)));
  const jüngste = reihe.slice(-14).reverse();

  const ereignisse = [];
  MDB.dinge.forEach(d => {
    ereignisse.push({ datum: d.rein, art: 'rein', ding: d });
    if (d.raus) ereignisse.push({ datum: d.raus, art: 'raus', ding: d });
  });
  ereignisse.sort((a, b) => (a.datum < b.datum ? 1 : -1));

  v.innerHTML = `
    ${reihe.length ? `
      <div class="section-head" style="padding-top:14px"><h2>Monat für Monat</h2></div>
      <div class="list-card">
        ${jüngste.map(m => `
          <div class="rowline mimonat">
            <span class="mimon">${esc(mMonatText(m.monat))}</span>
            <span class="grow mibalken">
              <i class="rein" style="width:${Math.round(m.rein / groesste * 50)}%"></i>
              <i class="raus" style="width:${Math.round(m.raus / groesste * 50)}%"></i>
            </span>
            <span class="num mistand">${m.stand}</span>
          </div>`).join('')}
      </div>
      <p class="hinweis" style="padding:10px 0 0">Links, was kam. Rechts, was ging.
        Rechts aussen der Stand am Ende des Monats.</p>` : ''}

    <div class="section-head" style="margin-top:22px"><h2>Alles der Reihe nach</h2></div>
    ${ereignisse.length ? `<div class="list-card">
      ${ereignisse.slice(0, 80).map(e => `
        <div class="rowline">
          <span class="mipunkt ${e.art}"></span>
          <span class="grow"><span class="rn">${esc(e.ding.name)}</span>
            <span class="rm">${e.art === 'rein' ? esc(mWegText(e.ding)) : esc(mRausText(e.ding))}
              · ${esc(e.ding.bereich)}</span></span>
          <span class="rm num">${esc(kTagText(e.datum))}</span>
        </div>`).join('')}
    </div>` : `<div class="empty"><strong>Noch nichts geschehen</strong>
      Sobald etwas kommt oder geht, steht es hier.</div>`}
    <div style="height:30px"></div>`;
}

const mMonatText = (m) => {
  const [j, mo] = m.split('-');
  const namen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return namen[+mo - 1] + ' ' + j.slice(2);
};

/* ---------- Mehr ---------- */
function mMehrMalen(v) {
  const weg = MDB.dinge.filter(d => d.raus).length;
  v.innerHTML = `
    ${appDatenHtml(MORT)}

    <div class="section-head" style="padding-top:14px"><h2>Deine Ordnung</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Ziel</span>
        <span class="rm">${MDB.einstellungen.ziel ? 'Nicht mehr als ' + MDB.einstellungen.ziel + ' Dinge' : 'Keins gesetzt'}</span></span>
        <input type="number" data-miziel min="0" max="99999" value="${MDB.einstellungen.ziel || ''}" style="width:88px;text-align:right"></div>
      <div class="rowline"><span class="grow"><span class="rn">Bereiche</span>
        <span class="rm">${esc(MDB.bereiche.join(' · '))}</span></span>
        <button class="btn btn-sm" data-mibereiche>Ändern</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Abgegeben</span>
        <span class="rm">${weg ? pl(weg, 'Eintrag', 'Einträge') + ' im Verlauf' : 'noch nichts'}</span></span>
        <span class="num">${weg}</span></div>
      <div class="rowline"><span class="grow"><span class="rn">Alles löschen</span>
        <span class="rm">${pl(MDB.dinge.length, 'Eintrag', 'Einträge')}</span></span>
        <button class="btn btn-sm btn-danger" data-mireset>Zurücksetzen</button></div>
    </div>

    ${huelleEinstellungenHtml()}
    <p class="hinweis" style="padding:16px 0 30px">minimal führt eine eigene Datei. Die anderen
      Apps dieser Datei bleiben davon unberührt.</p>`;

  appDatenBinden(MORT, v, mViewMalen);
  $('[data-miziel]', v).onchange = e => {
    const z = Math.max(0, Math.round(+e.target.value || 0));
    mAendern(() => { MDB.einstellungen.ziel = z; });
    mViewMalen();
  };
  $('[data-mibereiche]', v).onclick = () => mBereicheBlatt();
  $('[data-mireset]', v).onclick = async () => {
    if (!await bestaetigen('Wirklich alles löschen?',
      MDB.dinge.length + ' Einträge werden entfernt.', 'Alles löschen', true)) return;
    MDB = leereMin();
    await MStore.sichern(true);
    mTabWechseln('stand');
    toast('Zurückgesetzt.');
  };
  huelleEinstellungenBinden(v, mViewMalen);
}

function mBereicheBlatt() {
  const s = blatt('Bereiche', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:12px">Einer je Zeile.
      Ein Bereich, in dem noch etwas liegt, bleibt erhalten – auch wenn er hier verschwindet.</p>
    <textarea data-liste style="min-height:150px">${esc(MDB.bereiche.join('\n'))}</textarea>
    <button class="btn btn-primary btn-block" style="margin-top:14px" data-ok>Sichern</button>`, { fokus: false });
  $('[data-ok]', s).onclick = () => {
    const neu = $('[data-liste]', s).value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 40);
    if (!neu.length) { toast('Wenigstens einer muss bleiben.'); return; }
    /* Bereiche, in denen noch etwas liegt, dürfen nicht verschwinden. */
    const benutzt = Array.from(new Set(MDB.dinge.filter(d => !d.raus).map(d => d.bereich)));
    const fehlt = benutzt.filter(b => !neu.includes(b));
    mAendern(() => { MDB.bereiche = neu.concat(fehlt); });
    MStore.sichern(true);
    layerSchliessen();
    mViewMalen();
  };
}
