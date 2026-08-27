/* ============================================================
   Kalender – die zweite App in dieser Datei
   Eigene Datenbasis, eigener Speicherort, gleiches Gesicht:
   Heute · Kalender · To-Do · Mehr
   ============================================================ */

let KDB = leereKal();

function leereKal() {
  return {
    format: 'mylife-kalender',
    version: 1,
    erstellt: Date.now(),
    geaendert: Date.now(),
    einstellungen: { autosaveSek: 60 },
    /* Ein Termin: Tag, wahlweise Uhrzeit und Dauer, wahlweise Wiederholung. */
    termine: [],
    /* Eine Aufgabe in drei Ebenen: Vorhaben → Schritt → Handgriff. */
    aufgaben: []
  };
}

function kalNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const k = leereKal();
  k.erstellt = +d.erstellt || Date.now();
  k.einstellungen = Object.assign(k.einstellungen, d.einstellungen || {});
  k.termine = (Array.isArray(d.termine) ? d.termine : []).map(t => ({
    id: t.id || uid(),
    titel: String(t.titel || '').trim() || 'Ohne Titel',
    datum: /^\d{4}-\d{2}-\d{2}$/.test(t.datum) ? t.datum : heute(),
    zeit: /^\d{2}:\d{2}$/.test(t.zeit) ? t.zeit : null,
    dauer: t.dauer == null ? null : clamp(+t.dauer || 0, 0, 1440),
    ort: String(t.ort || ''),
    notiz: String(t.notiz || ''),
    farbe: KFARBEN.includes(t.farbe) ? t.farbe : KFARBEN[0],
    wdh: KWDH[t.wdh] ? t.wdh : 'keine'
  }));
  /* Drei Ebenen: Thema → Tag → Tätigkeit. Ältere Stände hiessen Vorhaben,
     Schritt und Handgriff; ihre Felder werden hier übernommen. */
  const taetigkeit = x => ({ id: x.id || uid(), text: String(x.text || '').trim(), done: !!x.done });
  k.aufgaben = (Array.isArray(d.aufgaben) ? d.aufgaben : []).map(v => {
    const tage = (Array.isArray(v.tage) ? v.tage : (Array.isArray(v.teile) ? v.teile : [])).map(t => ({
      id: t.id || uid(),
      datum: /^\d{4}-\d{2}-\d{2}$/.test(t.datum) ? t.datum
        : (/^\d{4}-\d{2}-\d{2}$/.test(t.faellig) ? t.faellig : null),
      notiz: String(t.notiz != null ? t.notiz : (t.text || '')).trim(),
      done: !!t.done,
      taetigkeiten: (Array.isArray(t.taetigkeiten) ? t.taetigkeiten
        : (Array.isArray(t.schritte) ? t.schritte : [])).map(taetigkeit).filter(x => x.text)
    })).filter(t => t.datum || t.notiz || t.taetigkeiten.length);
    /* Hatte ein Thema früher selbst eine Frist und noch keinen Tag, wird daraus einer. */
    if (!tage.length && /^\d{4}-\d{2}-\d{2}$/.test(v.faellig)) {
      tage.push({ id: uid(), datum: v.faellig, notiz: '', done: !!v.done, taetigkeiten: [] });
    }
    return {
      id: v.id || uid(),
      text: String(v.text || '').trim() || 'Ohne Titel',
      done: !!v.done,
      tage
    };
  });
  return k;
}

const KFARBEN = ['accent', 'good', 'wirkt', 'beides', 'bad'];
/* Was der leseliste fehlt, bringt der Kalender selbst mit. */
const KICON = {
  heute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="2" fill="currentColor" stroke="none"/></svg>',
  monat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8.5 14h1M12 14h1M15.5 14h1M8.5 17.5h1M12 17.5h1"/></svg>',
  fluss: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="5" rx="2"/><path d="M12 8v4M6 16h12M6 12v4M18 12v4"/><rect x="3" y="16" width="6" height="5" rx="2"/><rect x="15" y="16" width="6" height="5" rx="2"/></svg>',
  frist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>'
};
const KWDH = {
  keine: 'einmalig', taeglich: 'täglich', woechentlich: 'wöchentlich',
  monatlich: 'monatlich', jaehrlich: 'jährlich'
};

const KStore = macheSpeicher({
  id: 'kalender', metaKey: 'meta-kalender', datenKey: 'daten-kalender', dateiname: 'kalender.json',
  daten: () => KDB, setzen: d => { KDB = d; }
});

/* Wie aendern() in der leseliste: anfassen, vormerken, den Rest macht der Takt. */
function kAendern(fn) {
  if (fn) fn();
  KStore.aendern();
}

/* ---------- Tage rechnen ---------- */
const KTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const KMONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const KTAGE_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function kDatum(iso) { const [j, m, t] = iso.split('-').map(Number); return new Date(j, m - 1, t); }
function kIso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function kPlus(iso, tage) { const d = kDatum(iso); d.setDate(d.getDate() + tage); return kIso(d); }
/* Montag = 0, damit die Woche dort beginnt, wo sie hier beginnt. */
function kWochentag(iso) { return (kDatum(iso).getDay() + 6) % 7; }
function kTagText(iso, lang) {
  const d = kDatum(iso);
  return (lang ? KTAGE_LANG : KTAGE)[kWochentag(iso)] + ', ' + d.getDate() + '. ' + MONATE[d.getMonth()]
    + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
}
function kNaheText(iso) {
  const h = heute();
  if (iso === h) return 'Heute';
  if (iso === kPlus(h, 1)) return 'Morgen';
  if (iso === kPlus(h, -1)) return 'Gestern';
  return null;
}

/* Fällt ein wiederkehrender Termin auf diesen Tag? */
function kFaelltAuf(t, iso) {
  if (t.datum === iso) return true;
  if (t.wdh === 'keine' || iso < t.datum) return false;
  const a = kDatum(t.datum), b = kDatum(iso);
  if (t.wdh === 'taeglich') return true;
  if (t.wdh === 'woechentlich') return a.getDay() === b.getDay();
  if (t.wdh === 'monatlich') return a.getDate() === b.getDate();
  if (t.wdh === 'jaehrlich') return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
  return false;
}
function kTermineAm(iso) {
  return KDB.termine.filter(t => kFaelltAuf(t, iso))
    .sort((x, y) => (x.zeit || '99:99').localeCompare(y.zeit || '99:99') || x.titel.localeCompare(y.titel));
}
/* Was an diesem Tag ansteht: jeder Tag eines Themas mit seinem Datum. */
function kFaelligAm(iso) {
  const raus = [];
  KDB.aufgaben.forEach(v => {
    v.tage.forEach(t => {
      if (t.datum !== iso || t.done) return;
      const offen = t.taetigkeiten.filter(x => !x.done);
      raus.push({ thema: v, tag: t, text: t.notiz || v.text, offen: offen.length, taetigkeiten: offen });
    });
  });
  return raus;
}
function kFortschritt(v) {
  const alle = [];
  v.tage.forEach(t => { alle.push(t.done); t.taetigkeiten.forEach(x => alle.push(x.done)); });
  if (!alle.length) return { fertig: v.done ? 1 : 0, ganz: 1 };
  return { fertig: alle.filter(Boolean).length, ganz: alle.length };
}
/* Ein Elternteil gilt als erledigt, wenn alles darunter erledigt ist. */
function kElternPruefen(v) {
  v.tage.forEach(t => { if (t.taetigkeiten.length) t.done = t.taetigkeiten.every(x => x.done); });
  if (v.tage.length) v.done = v.tage.every(t => t.done);
}
/* Tage stehen in der Reihenfolge, in der sie liegen – neue rutschen an ihren Platz. */
function kTagEinfuegen(thema, tag) {
  if (!tag.datum) { thema.tage.push(tag); return; }
  const i = thema.tage.findIndex(t => t.datum && t.datum > tag.datum);
  if (i < 0) thema.tage.push(tag); else thema.tage.splice(i, 0, tag);
}

/* ---------- Öffnen und Speicherort ---------- */
/* Den Weg dorthin geht appSpeicherort in speicher.js für alle Nebenapps
   gleich; hier stehen nur die Angaben des Kalenders. */
const KORT = {
  store: KStore, name: 'kalender', datei: 'kalender.json',
  lead: 'Wo sollen Termine und Aufgaben liegen? Der Kalender führt eine eigene Datei – die leseliste bleibt davon unberührt.',
  normalisiere: kalNormalisiere, leer: leereKal, starten: () => kalStarten()
};
function kalenderOeffnen() { return appSpeicherOeffnen(KORT); }
function kalSpeicherort(erneut) { appSpeicherort(KORT, erneut); }

/* ---------- Gerüst ---------- */
const KTABS = [
  { id: 'heute', label: 'Heute', icon: KICON.heute },
  { id: 'monat', label: 'Kalender', icon: KICON.monat },
  { id: 'todo', label: 'To-Do', icon: KICON.fluss },
  { id: 'kmehr', label: 'Mehr', icon: ICON.more }
];
let kTab = 'heute';
let kMonat = null;   // erster Tag des gezeigten Monats

function kalStarten() {
  appFlaeche('kal');
  aktiverSpeicher = KStore;
  kTab = 'heute';
  kMonat = kMonat || heute().slice(0, 8) + '01';
  themeAnwenden();
  kVollbildKnopfMalen();
  $('#kBtnTheme').onclick = () => { themeUmschalten(); kVollbildKnopfMalen(); kViewMalen(); };
  $('#kBtnVoll').onclick = vollbildUmschalten;
  $('#kBtnRaus').innerHTML = ICON.x;
  $('#kBtnRaus').onclick = zumStartbildschirm;
  $('#kBrand').onclick = () => { if (kTab !== 'heute') kTabWechseln('heute'); else window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#kSaveChip').onclick = () => KStore.alsDateiSichern(false);
  kTabbarMalen();
  kViewMalen();
  KStore.autosaveStarten();
  saveChipMalen();
}

function kVollbildKnopfMalen() {
  const t = $('#kBtnTheme'), v = $('#kBtnVoll');
  if (t) t.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  if (!v) return;
  v.hidden = !vollbildGeht();
  v.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
}

function kTabbarMalen() {
  $('#ktabbar').innerHTML = KTABS.map(t =>
    `<button data-ktab="${t.id}" aria-selected="${t.id === kTab}">${t.icon}<span>${t.label}</span></button>`).join('');
  $('#ktabbar').onclick = e => {
    const b = e.target.closest('[data-ktab]');
    if (b) kTabWechseln(b.dataset.ktab);
  };
}
function kTabWechseln(id) {
  kTab = id;
  kTabbarMalen();
  kViewMalen();
  window.scrollTo(0, 0);
}
function kViewMalen() {
  leistenHoeheMessen();
  const v = $('#kview');
  kBannerMalen();
  if (kTab === 'heute') kHeuteMalen(v);
  else if (kTab === 'monat') kMonatMalen(v);
  else if (kTab === 'todo') kTodoMalen(v);
  else kMehrMalen(v);
  kVollbildKnopfMalen();
  saveChipMalen();
}

/* Die Zeile unter dem Namen: was heute ansteht, immer sichtbar. */
function kBannerMalen() {
  const b = $('#kBanner');
  const h = heute();
  const t = kTermineAm(h), f = kFaelligAm(h);
  const naechster = t.find(x => x.zeit && x.zeit >= new Date().toTimeString().slice(0, 5));
  b.innerHTML = `
    <span class="kb-tag num">${esc(kTagText(h, true))}</span>
    <span class="kb-zahlen">
      <span>${pl(t.length, 'Termin', 'Termine')}</span>
      <span class="kb-punkt">·</span>
      <span>${pl(f.length, 'Aufgabe', 'Aufgaben')}</span>
      ${naechster ? `<span class="kb-punkt">·</span><span class="kb-next num">${esc(naechster.zeit)} ${esc(naechster.titel)}</span>` : ''}
    </span>`;
}

/* ---------- Heute ---------- */
/* Welche Tage in „Heute fällig“ ihre Tätigkeiten zeigen. */
const kHeuteAuf = new Set();
function kHeuteMalen(v) {
  const h = heute();
  const t = kTermineAm(h);
  const f = kFaelligAm(h);
  const kommend = [];
  for (let i = 1; i <= 7; i++) {
    const tag = kPlus(h, i);
    const tt = kTermineAm(tag), ff = kFaelligAm(tag);
    if (tt.length || ff.length) kommend.push({ tag, termine: tt, faellig: ff });
  }
  const offen = KDB.aufgaben.filter(x => !x.done);

  v.innerHTML = `
    <div class="section-head" style="padding-top:14px"><h2>Termine</h2>
      <button class="btn btn-sm" data-neuertermin>${ICON.plus} Termin</button></div>
    ${t.length ? `<div class="list-card">${t.map(x => kTerminZeile(x, h)).join('')}</div>`
      : `<div class="empty" style="margin:0"><strong>Heute nichts eingetragen</strong>Ein freier Tag – oder einer, der noch gefüllt wird.</div>`}

    <div class="section-head" style="margin-top:20px"><h2>Heute fällig</h2>
      ${f.length ? `<span class="eyebrow">${f.length}</span>` : ''}</div>
    ${f.length ? `<div class="list-card">${f.map(x => {
      const auf = kHeuteAuf.has(x.tag.id);
      const n = x.taetigkeiten.length;
      return `<div class="kfaellig">
        <div class="rowline">
          <button class="status-btn" data-fertig="${x.tag.id}" aria-label="Alles erledigt">${ICON.check}</button>
          <button class="grow" data-auf="${x.tag.id}" style="text-align:left">
            <span class="rn">${esc(x.thema.text)}</span>
            <span class="rm">${x.tag.notiz ? esc(x.tag.notiz) + ' · ' : ''}${n
        ? pl(n, 'Tätigkeit', 'Tätigkeiten') + ' offen'
        : 'ohne Tätigkeit'}</span>
          </button>
          ${n ? `<span class="chev${auf ? ' auf' : ''}">${ICON.chev}</span>` : ''}
        </div>
        ${auf && n ? `<div class="kfliste">${x.taetigkeiten.map(t => `
          <div class="kh">
            <button class="status-btn winzig" data-fertig="${t.id}" aria-label="Erledigt"></button>
            <span class="kh-text">${esc(t.text)}</span>
          </div>`).join('')}</div>` : ''}
      </div>`;
    }).join('')}</div>`
      : `<p class="hinweis" style="padding:0">Nichts fällig. Termine im Kalender, Themen unter To-Do.</p>`}

    ${offen.length ? `
      <div class="section-head" style="margin-top:20px"><h2>Themen</h2><span class="eyebrow">${offen.length} offen</span></div>
      <div class="list-card">${offen.slice(0, 5).map(x => {
        const fs = kFortschritt(x);
        return `<button class="rowline" data-vorhaben="${x.id}" style="width:100%;text-align:left">
          <span class="grow"><span class="rn">${esc(x.text)}</span>
            <span class="rm">${fs.fertig} von ${fs.ganz} erledigt${x.tage.length ? ' · ' + pl(x.tage.length, 'Tag', 'Tage') : ''}</span></span>
          <span class="kfort"><i style="width:${Math.round(fs.fertig / fs.ganz * 100)}%"></i></span>
          <span class="chev">${ICON.chev}</span></button>`;
      }).join('')}</div>` : ''}

    ${kommend.length ? `
      <div class="section-head" style="margin-top:20px"><h2>Die nächsten Tage</h2></div>
      <div class="list-card">${kommend.map(k => `
        <button class="rowline" data-tag="${k.tag}" style="width:100%;text-align:left">
          <span class="ktagchip num">${esc(KTAGE[kWochentag(k.tag)])}<b>${kDatum(k.tag).getDate()}</b></span>
          <span class="grow"><span class="rn">${esc(k.termine.length ? k.termine[0].titel : k.faellig[0].text)}</span>
            <span class="rm">${k.termine.length + k.faellig.length > 1
        ? 'und ' + (k.termine.length + k.faellig.length - 1) + ' weitere' : (k.termine.length ? (k.termine[0].zeit || 'ganztägig') : 'fällig')}</span></span>
          <span class="chev">${ICON.chev}</span></button>`).join('')}</div>` : ''}
    <div style="height:26px"></div>`;

  $('[data-neuertermin]', v).onclick = () => kTerminBearbeiten(null, h);
  $$('[data-termin]', v).forEach(b => b.onclick = () => kTerminBearbeiten(KDB.termine.find(x => x.id === b.dataset.termin), h));
  $$('[data-tag]', v).forEach(b => b.onclick = () => kTagBlatt(b.dataset.tag));
  $$('[data-vorhaben]', v).forEach(b => b.onclick = () => { kTabWechseln('todo'); setTimeout(() => kZuThema(b.dataset.vorhaben), 60); });
  $$('[data-fertig]', v).forEach(b => b.onclick = () => { kAbhaken(b.dataset.fertig); kViewMalen(); });
  $$('[data-auf]', v).forEach(b => b.onclick = () => {
    const id = b.dataset.auf;
    if (kHeuteAuf.has(id)) kHeuteAuf.delete(id); else kHeuteAuf.add(id);
    kViewMalen();
  });
}

function kTerminZeile(x, iso) {
  return `<button class="rowline" data-termin="${x.id}" style="width:100%;text-align:left">
    <span class="kpunkt" style="background:var(--${x.farbe})"></span>
    <span class="kzeit num">${x.zeit ? esc(x.zeit) : '–'}</span>
    <span class="grow"><span class="rn">${esc(x.titel)}</span>
      <span class="rm">${[x.ort, x.dauer ? fmtDauer(x.dauer) : '', x.wdh !== 'keine' ? KWDH[x.wdh] : '']
      .filter(Boolean).map(esc).join(' · ') || 'ohne weitere Angabe'}</span></span>
    <span class="chev">${ICON.chev}</span></button>`;
}

/* Ein Häkchen von irgendwo: die Kennung kann ein Vorhaben oder ein Schritt sein. */
function kAbhaken(id) {
  kAendern(() => {
    KDB.aufgaben.forEach(v => {
      if (v.id === id) {
        v.done = !v.done;
        v.tage.forEach(t => { t.done = v.done; t.taetigkeiten.forEach(x => { x.done = v.done; }); });
        return;
      }
      v.tage.forEach(t => {
        if (t.id === id) { t.done = !t.done; t.taetigkeiten.forEach(x => { x.done = t.done; }); }
        t.taetigkeiten.forEach(x => { if (x.id === id) x.done = !x.done; });
      });
      kElternPruefen(v);
    });
  });
}

/* ---------- Kalender: das Monatsblatt ---------- */
function kMonatMalen(v) {
  const erster = kMonat;
  const d = kDatum(erster);
  const jahr = d.getFullYear(), monat = d.getMonth();
  const tageImMonat = new Date(jahr, monat + 1, 0).getDate();
  const vorlauf = kWochentag(erster);
  const zellen = [];
  for (let i = 0; i < vorlauf; i++) zellen.push(null);
  for (let i = 1; i <= tageImMonat; i++) zellen.push(kIso(new Date(jahr, monat, i)));
  while (zellen.length % 7) zellen.push(null);

  const h = heute();
  v.innerHTML = `
    <div class="kmonatkopf">
      <button class="icon-btn" data-vor aria-label="Vorheriger Monat">${ICON.back}</button>
      <div class="grow" style="text-align:center">
        <div class="km-name serif">${KMONATE[monat]} ${jahr}</div>
        <div class="km-sub">${pl(KDB.termine.filter(t => zellen.some(z => z && kFaelltAuf(t, z))).length, 'Termin', 'Termine')} in diesem Monat</div>
      </div>
      <button class="icon-btn" data-zurueck2 aria-label="Nächster Monat" style="transform:rotate(180deg)">${ICON.back}</button>
    </div>
    <div class="kgitterrahmen" data-rahmen>
      <div class="kgitter" data-gitter>
        ${KTAGE.map(t => `<span class="kwtag">${t}</span>`).join('')}
        ${zellen.map(z => {
          if (!z) return '<span class="ktag leer"></span>';
          const t = kTermineAm(z), f = kFaelligAm(z);
          const punkte = t.slice(0, 3).map(x => `<i style="background:var(--${x.farbe})"></i>`).join('')
            + (f.length ? '<i class="offen"></i>' : '');
          return `<button class="ktag${z === h ? ' heute' : ''}${z.slice(0, 7) !== erster.slice(0, 7) ? ' fremd' : ''}" data-tag="${z}">
            <span class="kz num">${kDatum(z).getDate()}</span>
            <span class="kpunkte">${punkte}</span></button>`;
        }).join('')}
      </div>
    </div>
    <div class="section-head" style="margin-top:18px"><h2>${esc(KMONATE[monat])} im Überblick</h2>
      <button class="btn btn-sm" data-neuertermin>${ICON.plus} Termin</button></div>
    ${(() => {
      const liste = [];
      zellen.filter(Boolean).forEach(z => { kTermineAm(z).forEach(t => liste.push({ z, t })); });
      if (!liste.length) return `<div class="empty" style="margin:0"><strong>Noch nichts in diesem Monat</strong>Tippe einen Tag an oder leg oben einen Termin an.</div>`;
      return `<div class="list-card">${liste.slice(0, 40).map(x => `
        <button class="rowline" data-tag="${x.z}" style="width:100%;text-align:left">
          <span class="ktagchip num">${esc(KTAGE[kWochentag(x.z)])}<b>${kDatum(x.z).getDate()}</b></span>
          <span class="kpunkt" style="background:var(--${x.t.farbe})"></span>
          <span class="grow"><span class="rn">${esc(x.t.titel)}</span>
            <span class="rm">${x.t.zeit ? esc(x.t.zeit) + ' Uhr' : 'ganztägig'}${x.t.ort ? ' · ' + esc(x.t.ort) : ''}</span></span>
        </button>`).join('')}</div>`;
    })()}
    <div style="height:26px"></div>`;

  const springen = (n) => {
    const dd = kDatum(kMonat); dd.setMonth(dd.getMonth() + n);
    kMonat = kIso(new Date(dd.getFullYear(), dd.getMonth(), 1));
    kViewMalen();
  };
  $('[data-vor]', v).onclick = () => springen(-1);
  $('[data-zurueck2]', v).onclick = () => springen(1);
  $('[data-neuertermin]', v).onclick = () => kTerminBearbeiten(null, erster);
  $$('[data-tag]', v).forEach(b => b.onclick = () => kTagBlatt(b.dataset.tag));
  kMonatZiehen($('[data-rahmen]', v), $('[data-gitter]', v), springen);
}

/* Das Blatt folgt dem Finger, genau wie die Karten beim Stöbern: 1:1, kurze
   Schwelle, Schwung zählt auch. */
function kMonatZiehen(rahmen, gitter, springen) {
  if (!rahmen || !gitter) return;
  let x0 = null, y0 = 0, zieht = false, ab = 0, weiter = 0;
  let letztX = 0, letztT = 0, tempo = 0;
  const schwelle = () => Math.max(80, (rahmen.clientWidth || 320) * 0.26);

  const setzen = (dx) => {
    gitter.style.transition = 'none';
    gitter.style.transform = 'translateX(' + dx.toFixed(1) + 'px)';
    gitter.style.opacity = String(clamp(1 - Math.abs(dx) / (rahmen.clientWidth || 320) * 0.7, 0.25, 1));
  };
  const loesen = (fertig) => {
    gitter.style.transition = 'transform .24s cubic-bezier(.2,.8,.3,1),opacity .2s ease';
    if (fertig) {
      const b = rahmen.clientWidth || 320;
      gitter.style.transform = 'translateX(' + (weiter < 0 ? b : -b) + 'px)';
      gitter.style.opacity = '0';
      setTimeout(() => springen(weiter), 200);
    } else {
      gitter.style.transform = 'translateX(0)';
      gitter.style.opacity = '1';
    }
    setTimeout(() => { window.__zieht = false; }, 240);
  };

  rahmen.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || window.__zieht) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    zieht = false; weiter = 0;
    letztX = x0; letztT = Date.now(); tempo = 0;
  }, { passive: true });

  rahmen.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const t = e.touches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
    if (!zieht) {
      if (dy > 16 && dy > Math.abs(dx)) { x0 = null; return; }
      if (Math.abs(dx) < 12) return;
      zieht = true; ab = dx; window.__zieht = true;
    }
    e.preventDefault();
    const jetzt = Date.now();
    if (jetzt > letztT) { tempo = (t.clientX - letztX) / (jetzt - letztT); letztX = t.clientX; letztT = jetzt; }
    const x = dx - ab;
    weiter = (x < 0 || tempo < -0.45) ? 1 : -1;
    setzen(x);
  }, { passive: false });

  const los = () => {
    if (x0 == null) return;
    const zog = zieht;
    const dx = letztX - x0 - ab;
    x0 = null; zieht = false;
    if (!zog) return;
    loesen(Math.abs(dx) > schwelle() || Math.abs(tempo) > 0.45);
  };
  rahmen.addEventListener('touchend', los, { passive: true });
  rahmen.addEventListener('touchcancel', los, { passive: true });
}

/* Ein Tag in ganzer Länge, als Blatt von unten. */
function kTagBlatt(iso) {
  const malen = () => {
    const t = kTermineAm(iso), f = kFaelligAm(iso);
    const nahe = kNaheText(iso);
    const s = blatt(nahe ? nahe : kTagText(iso, true), `
      ${nahe ? `<p class="muted" style="font-size:12.5px;margin:-6px 0 12px">${esc(kTagText(iso, true))}</p>` : ''}
      ${t.length ? `<div class="list-card" style="margin-bottom:12px">${t.map(x => kTerminZeile(x, iso)).join('')}</div>`
        : `<p class="hinweis" style="padding:0 0 12px">Keine Termine an diesem Tag.</p>`}
      ${f.length ? `<div class="section-head" style="padding:0;margin:0 0 8px"><h2>Zu tun</h2></div>
        <div class="list-card" style="margin-bottom:12px">${f.map(x => `
          <div class="rowline">
            <button class="status-btn" data-fertig="${x.tag.id}" aria-label="Erledigt">${ICON.check}</button>
            <span class="grow"><span class="rn">${esc(x.thema.text)}</span>
              <span class="rm">${x.taetigkeiten.length
        ? x.taetigkeiten.map(t => esc(t.text)).join(' · ')
        : (x.tag.notiz ? esc(x.tag.notiz) : 'ohne Tätigkeit')}</span></span>
          </div>`).join('')}</div>` : ''}
      <button class="btn btn-primary btn-block" data-neu>${ICON.plus} Termin an diesem Tag</button>`, { fokus: false });

    $('[data-neu]', s).onclick = () => kTerminBearbeiten(null, iso, true);
    $$('[data-termin]', s).forEach(b => b.onclick = () =>
      kTerminBearbeiten(KDB.termine.find(x => x.id === b.dataset.termin), iso, true));
    $$('[data-fertig]', s).forEach(b => b.onclick = () => { kAbhaken(b.dataset.fertig); layerSchliessen(); kViewMalen(); malen(); });
  };
  malen();
}

/* Termin anlegen oder ändern. */
function kTerminBearbeiten(t, vorgabe, ersetzen) {
  const neu = !t;
  const w = t || { id: uid(), titel: '', datum: vorgabe || heute(), zeit: null, dauer: null, ort: '', notiz: '', farbe: KFARBEN[0], wdh: 'keine' };
  const s = blatt(neu ? 'Neuer Termin' : 'Termin', `
    <div class="field"><label>Was</label>
      <input type="text" data-titel value="${esc(w.titel)}" placeholder="z.B. Zahnarzt"></div>
    <div class="grid2">
      <div class="field"><label>Tag</label><input type="date" data-datum value="${esc(w.datum)}"></div>
      <div class="field"><label>Uhrzeit</label><input type="time" data-zeit value="${w.zeit ? esc(w.zeit) : ''}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Dauer in Minuten</label><input type="number" data-dauer value="${w.dauer || ''}" placeholder="60"></div>
      <div class="field"><label>Ort</label><input type="text" data-ort value="${esc(w.ort)}" placeholder="optional"></div>
    </div>
    <div class="field"><label>Wiederholung</label>
      <select data-wdh>${Object.keys(KWDH).map(k => `<option value="${k}"${k === w.wdh ? ' selected' : ''}>${KWDH[k]}</option>`).join('')}</select></div>
    <div class="field"><label>Farbe</label>
      <div class="kfarben">${KFARBEN.map(f => `<button class="kfarbe${f === w.farbe ? ' an' : ''}" data-farbe="${f}" style="background:var(--${f})" aria-label="${f}"></button>`).join('')}</div></div>
    <div class="field"><label>Notiz</label><textarea data-notiz rows="2" placeholder="optional">${esc(w.notiz)}</textarea></div>
    <div class="btn-row">
      <button class="btn btn-primary" data-ok style="flex:1">Sichern</button>
      ${neu ? '' : '<button class="btn btn-danger" data-del>Löschen</button>'}
    </div>`, { ersetzen: !!ersetzen });

  let farbe = w.farbe;
  $$('[data-farbe]', s).forEach(b => b.onclick = () => {
    farbe = b.dataset.farbe;
    $$('[data-farbe]', s).forEach(x => x.classList.toggle('an', x.dataset.farbe === farbe));
  });
  $('[data-ok]', s).onclick = () => {
    const titel = $('[data-titel]', s).value.trim();
    if (!titel) { toast('Ohne Titel geht es nicht.'); return; }
    const zeit = $('[data-zeit]', s).value;
    kAendern(() => {
      w.titel = titel;
      w.datum = $('[data-datum]', s).value || heute();
      w.zeit = /^\d{2}:\d{2}$/.test(zeit) ? zeit : null;
      w.dauer = num($('[data-dauer]', s).value);
      w.ort = $('[data-ort]', s).value.trim();
      w.notiz = $('[data-notiz]', s).value.trim();
      w.wdh = $('[data-wdh]', s).value;
      w.farbe = farbe;
      if (neu) KDB.termine.push(w);
    });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
    toast(neu ? 'Termin angelegt.' : 'Gesichert.');
  };
  const del = $('[data-del]', s);
  if (del) del.onclick = async () => {
    if (!await bestaetigen('Termin löschen?', esc(w.titel) + ' wird entfernt.', 'Löschen', true)) return;
    kAendern(() => { KDB.termine = KDB.termine.filter(x => x.id !== w.id); });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
  };
}

/* ---------- To-Do: Vorhaben → Schritt → Handgriff ----------
   Der Aufbau stammt aus der mitgebrachten Vorlage: eine Hauptaufgabe, darunter
   quer die Teilaufgaben, in jeder davon die einzelnen Handgriffe. Abgehakt
   wird von unten nach oben – ist alles darunter erledigt, gilt auch das
   Darüberliegende als erledigt. */
let kNurOffen = false;
let kZuletztVorhaben = null;

function kTodoMalen(v) {
  const alle = KDB.aufgaben;
  const liste = kNurOffen ? alle.filter(x => !x.done) : alle;
  v.innerHTML = `
    <div class="kneu">
      <input type="text" data-neu placeholder="Neues Thema …">
      <button class="btn btn-primary" data-add>${ICON.plus}</button>
    </div>
    <div class="chiprow" style="margin-bottom:4px">
      <button class="chip" data-filter="alle" aria-pressed="${!kNurOffen}">Alle</button>
      <button class="chip" data-filter="offen" aria-pressed="${kNurOffen}">Offen</button>
      ${alle.length ? `<span class="kzahl num">${alle.filter(x => x.done).length} / ${alle.length} erledigt</span>` : ''}
    </div>
    ${liste.length ? liste.map(vh => kThemaHtml(vh)).join('')
      : `<div class="empty" style="margin-top:26px"><strong>${alle.length ? 'Nichts Offenes mehr' : 'Noch keine Themen'}</strong>
          ${alle.length ? 'Alles abgehakt. Schalte oben auf „Alle“, um das Erledigte zu sehen.'
        : 'Ein Thema oben anlegen, darunter die Tage, an jedem Tag die einzelnen Tätigkeiten.'}</div>`}
    <div style="height:26px"></div>`;

  const eingabe = $('[data-neu]', v);
  const anlegen = () => {
    const text = eingabe.value.trim();
    if (!text) return;
    kAendern(() => KDB.aufgaben.push({ id: uid(), text, done: false, tage: [] }));
    eingabe.value = '';
    kViewMalen();
  };
  $('[data-add]', v).onclick = anlegen;
  eingabe.addEventListener('keydown', e => { if (e.key === 'Enter') anlegen(); });
  $$('[data-filter]', v).forEach(b => b.onclick = () => { kNurOffen = b.dataset.filter === 'offen'; kViewMalen(); });
  kTodoBinden(v);
  if (kZuletztVorhaben) {
    const el = $('[data-vh="' + kZuletztVorhaben + '"]', v);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    kZuletztVorhaben = null;
  }
}

function kZuThema(id) { kZuletztVorhaben = id; kViewMalen(); }

function kThemaHtml(vh) {
  const fs = kFortschritt(vh);
  const prozent = Math.round(fs.fertig / fs.ganz * 100);
  return `
  <div class="kfluss" data-vh="${vh.id}" data-sortthema="${vh.id}">
    <div class="kv-kopf${vh.done ? ' fertig' : ''}" data-griff-thema="${vh.id}">
      <button class="status-btn${vh.done ? ' an' : ''}" data-vhcheck="${vh.id}" aria-label="Erledigt">${vh.done ? ICON.check : ''}</button>
      <span class="grow">
        <span class="kv-titel serif">${esc(vh.text)}</span>
        <span class="kv-meta">${pl(vh.tage.length, 'Tag', 'Tage')} · ${fs.fertig} / ${fs.ganz}</span>
      </span>
      <span class="kfort"><i style="width:${prozent}%"></i></span>
      <span class="kctrl">
        <button class="icon-btn" data-vhedit="${vh.id}" aria-label="Ändern">${ICON.edit}</button>
        <button class="icon-btn" data-vhdel="${vh.id}" aria-label="Löschen">${ICON.trash}</button>
      </span>
    </div>
    <div class="kpfeil" aria-hidden="true"></div>
    <div class="kbahn" data-bahn="${vh.id}">
      ${vh.tage.map((t, i) => `
        ${i ? '<div class="kverbinder" aria-hidden="true"></div>' : ''}
        <div class="kspalte" data-sorttag="${t.id}">
          <div class="kt-kasten${t.done ? ' fertig' : ''}">
            <div class="kt-kopf" data-griff-tag="${t.id}">
              <button class="status-btn klein${t.done ? ' an' : ''}" data-tcheck="${t.id}" aria-label="Erledigt">${t.done ? ICON.check : ''}</button>
              <span class="kt-marke">${t.datum ? esc(kTagKurz(t.datum)) : 'Ohne Datum'}</span>
              <button class="icon-btn" data-tedit="${t.id}" aria-label="Tag ändern">${ICON.edit}</button>
              <button class="icon-btn" data-tdel="${t.id}" aria-label="Löschen">${ICON.trash}</button>
            </div>
            ${t.datum ? `<div class="kt-text">${esc(kTagText(t.datum))}</div>` : ''}
            ${t.notiz ? `<div class="kt-notiz">${esc(t.notiz)}</div>` : ''}
            ${t.taetigkeiten.length ? `<div class="kt-liste" data-liste="${t.id}">${t.taetigkeiten.map(x => `
              <div class="kh${x.done ? ' fertig' : ''}" data-sorttat="${x.id}" data-griff-tat="${x.id}">
                <button class="status-btn winzig${x.done ? ' an' : ''}" data-scheck="${x.id}" aria-label="Erledigt">${x.done ? ICON.check : ''}</button>
                <span class="kh-text">${esc(x.text)}</span>
                <button class="icon-btn" data-sdel="${x.id}" aria-label="Löschen">${ICON.x}</button>
              </div>`).join('')}</div>` : ''}
            <div class="kzeile">
              <input type="text" data-sneu="${t.id}" placeholder="Tätigkeit …">
              <button class="btn btn-sm" data-sadd="${t.id}">${ICON.plus}</button>
            </div>
          </div>
        </div>`).join('')}
      ${vh.tage.length ? '<div class="kverbinder" aria-hidden="true"></div>' : ''}
      <div class="kspalte anfuegen">
        <div class="kzeile">
          <input type="date" data-tneu="${vh.id}" value="${esc(heute())}" aria-label="Tag">
          <button class="btn btn-sm" data-tadd="${vh.id}">${ICON.plus}</button>
        </div>
        <p class="hinweis" style="padding:6px 0 0;font-size:10px">Tag anlegen</p>
      </div>
    </div>
  </div>`;
}

/* Kurzform für die Marke über dem Tag: „Fr · 4.9.“ */
function kTagKurz(iso) {
  const d = kDatum(iso);
  const h = heute();
  const nahe = kNaheText(iso);
  if (nahe) return nahe;
  return KTAGE[kWochentag(iso)] + ' · ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'
    + (d.getFullYear() !== kDatum(h).getFullYear() ? d.getFullYear() : '');
}

function kTodoBinden(v) {
  const finde = id => {
    for (const vh of KDB.aufgaben) {
      if (vh.id === id) return { vh };
      for (const t of vh.tage) {
        if (t.id === id) return { vh, t };
        for (const x of t.taetigkeiten) if (x.id === id) return { vh, t, x };
      }
    }
    return null;
  };
  const neuMalen = () => kViewMalen();

  $$('[data-vhcheck]', v).forEach(b => b.onclick = () => { if (!b._langGedrueckt) { kAbhaken(b.dataset.vhcheck); neuMalen(); } });
  $$('[data-tcheck]', v).forEach(b => b.onclick = () => { if (!b._langGedrueckt) { kAbhaken(b.dataset.tcheck); neuMalen(); } });
  $$('[data-scheck]', v).forEach(b => b.onclick = () => { if (!b._langGedrueckt) { kAbhaken(b.dataset.scheck); neuMalen(); } });

  $$('[data-vhdel]', v).forEach(b => b.onclick = async () => {
    const f = finde(b.dataset.vhdel);
    if (!f) return;
    if (!await bestaetigen('Thema löschen?', esc(f.vh.text) + ' samt allen Tagen darunter.', 'Löschen', true)) return;
    kAendern(() => { KDB.aufgaben = KDB.aufgaben.filter(x => x.id !== f.vh.id); });
    neuMalen();
  });
  $$('[data-tdel]', v).forEach(b => b.onclick = () => {
    const f = finde(b.dataset.tdel);
    if (!f) return;
    kAendern(() => { f.vh.tage = f.vh.tage.filter(x => x.id !== f.t.id); kElternPruefen(f.vh); });
    neuMalen();
  });
  $$('[data-sdel]', v).forEach(b => b.onclick = () => {
    const f = finde(b.dataset.sdel);
    if (!f) return;
    kAendern(() => { f.t.taetigkeiten = f.t.taetigkeiten.filter(x => x.id !== f.x.id); kElternPruefen(f.vh); });
    neuMalen();
  });

  $$('[data-vhedit]', v).forEach(b => b.onclick = () => {
    const f = finde(b.dataset.vhedit);
    if (f) kThemaBearbeiten(f.vh);
  });
  $$('[data-tedit]', v).forEach(b => b.onclick = () => {
    const f = finde(b.dataset.tedit);
    if (f) kTagBearbeiten(f.vh, f.t);
  });

  const tagAnlegen = (vhId, feld) => {
    if (!feld) return;
    const datum = feld.value;
    const vh = KDB.aufgaben.find(x => x.id === vhId);
    if (!vh) return;
    if (vh.tage.some(t => t.datum === datum)) { toast('Diesen Tag gibt es hier schon.'); return; }
    kAendern(() => {
      kTagEinfuegen(vh, { id: uid(), datum: /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : null, notiz: '', done: false, taetigkeiten: [] });
      kElternPruefen(vh);
    });
    neuMalen();
  };
  const tatAnlegen = (tId, feld) => {
    if (!feld) return;
    const text = feld.value.trim();
    if (!text) return;
    const f = finde(tId);
    if (!f) return;
    kAendern(() => { f.t.taetigkeiten.push({ id: uid(), text, done: false }); kElternPruefen(f.vh); });
    neuMalen();
  };
  $$('[data-tadd]', v).forEach(b => b.onclick = () => tagAnlegen(b.dataset.tadd, $('[data-tneu="' + b.dataset.tadd + '"]', v)));
  $$('[data-sadd]', v).forEach(b => b.onclick = () => tatAnlegen(b.dataset.sadd, $('[data-sneu="' + b.dataset.sadd + '"]', v)));
  $$('[data-sneu]', v).forEach(el => el.addEventListener('keydown', e => {
    if (e.key === 'Enter') tatAnlegen(el.dataset.sneu, el);
  }));

  /* Langes Drücken hebt an – Themen untereinander, Tage nebeneinander,
     Tätigkeiten innerhalb ihres Tages. */
  $$('[data-sortthema]', v).forEach(node => {
    node._sortId = node.dataset.sortthema;
    const griff = $('[data-griff-thema]', node);
    if (griff) ziehenZumSortieren(node, griff, {
      auswahl: '[data-sortthema]',
      neuMalen: kViewMalen,
      fertig: reihe => kAendern(() => { KDB.aufgaben = reihe.map(id => KDB.aufgaben.find(x => x.id === id)).filter(Boolean); })
    });
  });
  $$('[data-sorttag]', v).forEach(node => {
    node._sortId = node.dataset.sorttag;
    const griff = $('[data-griff-tag]', node);
    const f = finde(node.dataset.sorttag);
    if (griff && f) ziehenZumSortieren(node, griff, {
      auswahl: '[data-sorttag]', waagerecht: true,
      neuMalen: kViewMalen,
      fertig: reihe => kAendern(() => { f.vh.tage = reihe.map(id => f.vh.tage.find(x => x.id === id)).filter(Boolean); })
    });
  });
  $$('[data-sorttat]', v).forEach(node => {
    node._sortId = node.dataset.sorttat;
    const f = finde(node.dataset.sorttat);
    if (f) ziehenZumSortieren(node, node, {
      auswahl: '[data-sorttat]',
      neuMalen: kViewMalen,
      fertig: reihe => kAendern(() => { f.t.taetigkeiten = reihe.map(id => f.t.taetigkeiten.find(x => x.id === id)).filter(Boolean); })
    });
  });
}

function kThemaBearbeiten(vh) {
  const s = blatt('Thema', `
    <div class="field"><label>Name</label><input type="text" data-t value="${esc(vh.text)}"></div>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`);
  $('[data-ok]', s).onclick = () => {
    const text = $('[data-t]', s).value.trim();
    if (!text) { toast('Ohne Namen geht es nicht.'); return; }
    kAendern(() => { vh.text = text; });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
  };
}

function kTagBearbeiten(vh, t) {
  const s = blatt('Tag', `
    <div class="field"><label>Datum</label><input type="date" data-d value="${t.datum || ''}">
      <span class="hint">Der Tag ist zugleich die Frist: Was hier steht, taucht unter „Heute“ und im Kalender auf.</span></div>
    <div class="field"><label>Notiz (optional)</label><input type="text" data-n value="${esc(t.notiz)}" placeholder="z.B. vormittags"></div>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`);
  $('[data-ok]', s).onclick = () => {
    const d = $('[data-d]', s).value;
    kAendern(() => {
      t.datum = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
      t.notiz = $('[data-n]', s).value.trim();
      /* Nach einer Datumsänderung rutscht der Tag an seinen Platz. */
      vh.tage = vh.tage.filter(x => x.id !== t.id);
      kTagEinfuegen(vh, t);
    });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
  };
}

/* ---------- Mehr ---------- */
function kMehrMalen(v) {
  const ort = KStore.modus === 'datei' ? KStore.dateiname : (KStore.modus === 'geraet' ? 'Auf diesem Gerät' : 'Nicht gewählt');
  const offen = KDB.aufgaben.filter(x => !x.done).length;
  v.innerHTML = `
    <div class="section-head" style="padding-top:14px"><h2>Datenbasis</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Speicherort</span><span class="rm">${esc(ort)}</span></span>
        <button class="btn btn-sm" data-kwechseln>Ändern</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Jetzt sichern</span><span class="rm">Als Datei ablegen</span></span>
        <button class="btn btn-sm" data-ksave>Sichern</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Daten laden</span><span class="rm">Eine kalender.json einlesen</span></span>
        <button class="btn btn-sm" data-kimport>Laden</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Alles löschen</span><span class="rm">${pl(KDB.termine.length, 'Termin', 'Termine')} · ${pl(KDB.aufgaben.length, 'Thema', 'Themen')}</span></span>
        <button class="btn btn-sm btn-danger" data-kreset>Zurücksetzen</button></div>
    </div>

    <div class="section-head" style="margin-top:20px"><h2>Stand</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Termine</span><span class="rm">insgesamt eingetragen</span></span>
        <span class="num">${KDB.termine.length}</span></div>
      <div class="rowline"><span class="grow"><span class="rn">Themen offen</span><span class="rm">von ${KDB.aufgaben.length}</span></span>
        <span class="num">${offen}</span></div>
      <div class="rowline"><span class="grow"><span class="rn">Tätigkeiten</span><span class="rm">über alle Tage</span></span>
        <span class="num">${KDB.aufgaben.reduce((n, x) => n + x.tage.reduce((m, t) => m + t.taetigkeiten.length, 0), 0)}</span></div>
    </div>

    ${huelleEinstellungenHtml()}
    <p class="hinweis" style="padding:16px 0 30px">Der Kalender führt seine eigene Datei. Die leseliste bleibt davon unberührt – jede App in dieser Datei hat ihre eigene Datenbasis.</p>`;

  $('[data-kwechseln]', v).onclick = () => kalSpeicherort(false);
  $('[data-ksave]', v).onclick = () => KStore.alsDateiSichern(false);
  $('[data-kimport]', v).onclick = () => kImportDialog();
  huelleEinstellungenBinden(v, kViewMalen);
  $('[data-kreset]', v).onclick = async () => {
    if (!await bestaetigen('Wirklich alles löschen?',
      KDB.termine.length + ' Termine und ' + KDB.aufgaben.length + ' Themen werden entfernt.', 'Alles löschen', true)) return;
    KDB = leereKal();
    await KStore.sichern(true);
    kViewMalen();
    toast('Zurückgesetzt.');
  };
}

function kImportDialog() {
  const s = blatt('Daten laden', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">Eine <strong>kalender.json</strong> einlesen. Der bisherige Stand wird ersetzt.</p>
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
      const roh = JSON.parse(await f.text());
      KDB = kalNormalisiere(roh);
      await KStore.sichern(true);
      layerSchliessen();
      kViewMalen();
      toast(pl(KDB.termine.length, 'Termin', 'Termine') + ' geladen.');
    } catch (e) { toast('Die Datei ist kein gültiges JSON.', 4000); }
  };
}

