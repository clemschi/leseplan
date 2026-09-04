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
    aufgaben: [],
    /* Wiederkehrende Tätigkeiten: „Mo–Fr lesen, 45 Minuten“. Sie hängen an
       keinem Thema, sondern am Wochentag, und werden je Tag abgehakt. */
    routinen: [],
    /* Die Reihenfolge, in der „Heute fällig“ an einem Tag liegt – je Tag
       eine Liste von Kennungen. Was fehlt, hängt sich hinten an. */
    reihen: {}
  };
}

function kalNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const k = leereKal();
  k.erstellt = +d.erstellt || Date.now();
  k.einstellungen = Object.assign(k.einstellungen, d.einstellungen || {});
  k.termine = (Array.isArray(d.termine) ? d.termine : []).map(t => {
    const datum = /^\d{4}-\d{2}-\d{2}$/.test(t.datum) ? t.datum : heute();
    const zeit = /^\d{2}:\d{2}$/.test(t.zeit) ? t.zeit : null;
    let bis = /^\d{4}-\d{2}-\d{2}$/.test(t.bis) ? t.bis : '';
    let bisZeit = /^\d{2}:\d{2}$/.test(t.bisZeit) ? t.bisZeit : null;
    /* Früher stand hier eine Dauer in Minuten. Daraus wird jetzt eine
       Uhrzeit – und wenn sie über Mitternacht reichte, ein zweiter Tag. */
    if (!bisZeit && zeit && +t.dauer > 0) {
      const gesamt = kMinuten(zeit) + Math.min(+t.dauer, 60 * 24 * 30);
      bisZeit = kUhrzeit(gesamt % 1440);
      const tage = Math.floor(gesamt / 1440);
      if (tage > 0 && !bis) bis = kPlus(datum, tage);
    }
    if (bis && bis <= datum) bis = '';
    return {
      id: t.id || uid(),
      titel: String(t.titel || '').trim() || 'Ohne Titel',
      datum,
      /* Leer heisst: der Termin dauert einen Tag. */
      bis,
      zeit,
      bisZeit,
      ort: String(t.ort || ''),
      notiz: String(t.notiz || ''),
      farbe: KFARBEN.includes(t.farbe) ? t.farbe : KFARBEN[0],
      wdh: KWDH[t.wdh] ? t.wdh : 'keine'
    };
  });
  /* Drei Ebenen: Thema → Tag → Tätigkeit. Ältere Stände hiessen Vorhaben,
     Schritt und Handgriff; ihre Felder werden hier übernommen. */
  const dauerVon = x => (x == null || x === '') ? null : clamp(Math.round(+x || 0), 0, 1440) || null;
  const taetigkeit = x => ({
    id: x.id || uid(), text: String(x.text || '').trim(), done: !!x.done,
    /* Wie lange es dauern soll – in Minuten, oder gar nicht. */
    dauer: dauerVon(x.dauer)
  });
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
  k.routinen = (Array.isArray(d.routinen) ? d.routinen : []).map(r => {
    const wt = Array.isArray(r.wochentage)
      ? [...new Set(r.wochentage.map(n => clamp(Math.round(+n || 0), 0, 6)))].sort((a, b) => a - b)
      : [0, 1, 2, 3, 4];
    /* Abgehakt wird je Tag. Was älter als zwei Monate ist, fliegt raus –
       sonst wächst die Datei mit jedem Tag. */
    const grenze = kPlus(heute(), -62);
    const erledigt = {};
    Object.keys((r.erledigt && typeof r.erledigt === 'object') ? r.erledigt : {})
      .filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t) && t >= grenze)
      .forEach(t => { erledigt[t] = true; });
    return {
      id: r.id || uid(),
      text: String(r.text || '').trim(),
      wochentage: wt.length ? wt : [0, 1, 2, 3, 4],
      dauer: dauerVon(r.dauer),
      aktiv: r.aktiv !== false,
      erledigt
    };
  }).filter(r => r.text);
  const grenzeR = kPlus(heute(), -14);
  k.reihen = {};
  Object.entries((d.reihen && typeof d.reihen === 'object') ? d.reihen : {})
    .forEach(([t, liste]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || t < grenzeR || !Array.isArray(liste)) return;
      k.reihen[t] = liste.filter(x => typeof x === 'string').slice(0, 200);
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
/* Uhrzeiten als Minuten seit Mitternacht – damit lässt sich rechnen. */
const kMinuten = hhmm => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? (+m[1]) * 60 + (+m[2]) : null;
};
const kUhrzeit = min => String(Math.floor(min / 60) % 24).padStart(2, '0')
  + ':' + String(Math.round(min) % 60).padStart(2, '0');

/* Über wie viele Tage der Termin geht: 0 heisst, er beginnt und endet am
   selben Tag. Gedeckelt, damit ein verrutschtes Datum keine Schleife wird. */
const kSpanne = t => (!t.bis || t.bis <= t.datum) ? 0
  : Math.min(366, Math.round((kDatum(t.bis) - kDatum(t.datum)) / 86400000));

/* Fällt der **Beginn** auf diesen Tag? Die Wiederholung hängt am Beginn. */
function kBeginntAn(t, iso) {
  if (t.datum === iso) return true;
  if (t.wdh === 'keine' || iso < t.datum) return false;
  const a = kDatum(t.datum), b = kDatum(iso);
  if (t.wdh === 'taeglich') return true;
  if (t.wdh === 'woechentlich') return a.getDay() === b.getDay();
  if (t.wdh === 'monatlich') return a.getDate() === b.getDate();
  if (t.wdh === 'jaehrlich') return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
  return false;
}

/* Der wievielte Tag des Termins ist dieser hier? `null`, wenn keiner.
   Ein mehrtägiger Termin steht an jedem seiner Tage im Kalender – sonst
   wäre er nur am ersten zu sehen und am dritten spurlos verschwunden. */
function kTagImTermin(t, iso) {
  const spanne = kSpanne(t);
  for (let k = 0; k <= spanne; k++) {
    const beginn = kPlus(iso, -k);
    if (beginn < t.datum) break;
    if (kBeginntAn(t, beginn)) {
      return { nr: k + 1, tage: spanne + 1, erster: k === 0, letzter: k === spanne, beginn };
    }
  }
  return null;
}
const kFaelltAuf = (t, iso) => kTagImTermin(t, iso) !== null;

/* „09:30–10:30“, „ab 09:30“, „bis 10:30“ – was bekannt ist. */
function kZeitspanne(t) {
  if (t.zeit && t.bisZeit) return t.zeit + '–' + t.bisZeit;
  if (t.zeit) return 'ab ' + t.zeit;
  if (t.bisZeit) return 'bis ' + t.bisZeit;
  return '';
}
/* Wie lange er dauert, über alle Tage. Null, wenn nichts zu rechnen ist. */
function kTerminDauer(t) {
  const von = kMinuten(t.zeit), bis = kMinuten(t.bisZeit);
  if (von == null || bis == null) return null;
  const d = kSpanne(t) * 1440 + bis - von;
  return d > 0 ? d : null;
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
/* ---------- Routine-Tätigkeiten ---------- */
/* Eine Routine trifft an ihren Wochentagen – „Mo–Fr lesen, 45 Minuten“. */
const kRoutineAm = iso => KDB.routinen.filter(r => r.aktiv && r.wochentage.includes(kWochentag(iso)));
const kRoutineOffen = iso => kRoutineAm(iso).filter(r => !r.erledigt[iso]);
function kRoutineAbhaken(id, iso) {
  const r = KDB.routinen.find(x => x.id === id);
  if (!r) return;
  kAendern(() => { if (r.erledigt[iso]) delete r.erledigt[iso]; else r.erledigt[iso] = true; });
}
/* „Mo–Fr“, „täglich“, „Di, Do“ – so kurz wie möglich. */
function kTakteText(wt) {
  if (wt.length === 7) return 'täglich';
  if (wt.length === 5 && wt.every((n, i) => n === i)) return 'Mo–Fr';
  if (wt.length === 2 && wt[0] === 5 && wt[1] === 6) return 'Wochenende';
  return wt.map(n => KTAGE[n]).join(', ');
}

/* ---------- „Heute fällig“ als eine flache Liste ----------
   Nicht nach Themen gruppiert: jede Tätigkeit steht für sich, und daneben
   steht, aus welcher Gruppe sie kommt. So lässt sich der Tag in der
   Reihenfolge ordnen, in der er wirklich abläuft – quer über alle Themen. */
function kHeuteListe(iso) {
  const roh = [];
  KDB.aufgaben.forEach(v => {
    v.tage.forEach(t => {
      if (t.datum !== iso || t.done) return;
      const offen = t.taetigkeiten.filter(x => !x.done);
      if (offen.length) {
        offen.forEach(x => roh.push({
          id: x.id, art: 'tat', text: x.text, gruppe: v.text,
          notiz: t.notiz, dauer: x.dauer, themaId: v.id
        }));
      } else {
        /* Ein Tag ohne Tätigkeiten ist selbst die Aufgabe. */
        roh.push({
          id: t.id, art: 'tag', text: t.notiz || v.text, gruppe: v.text,
          notiz: '', dauer: null, themaId: v.id
        });
      }
    });
  });
  kRoutineOffen(iso).forEach(r => roh.push({
    id: r.id, art: 'routine', text: r.text, gruppe: 'Routine',
    notiz: kTakteText(r.wochentage), dauer: r.dauer, themaId: null
  }));
  /* Die gemerkte Reihenfolge zuerst, alles Neue hinten dran. */
  const reihe = KDB.reihen[iso] || [];
  const rang = new Map(reihe.map((id, i) => [id, i]));
  return roh
    .map((x, i) => ({ x, r: rang.has(x.id) ? rang.get(x.id) : reihe.length + i }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.x);
}
const kDauerSumme = liste => liste.reduce((n, x) => n + (x.dauer || 0), 0);

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
const KORT = appOrtAnmelden({
  store: KStore, name: 'kalender', datei: 'kalender.json', format: 'mylife-kalender',
  lead: 'Wo sollen Termine und Aufgaben liegen? Der Kalender führt eine eigene Datei – die leseliste bleibt davon unberührt.',
  normalisiere: kalNormalisiere, leer: leereKal, starten: () => kalStarten(),
  ortWechseln: () => kalSpeicherort(false)
});
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
  const t = kTermineAm(h), f = kHeuteListe(h);
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
function kHeuteMalen(v) {
  const h = heute();
  const t = kTermineAm(h);
  const f = kHeuteListe(h);
  const geplant = kDauerSumme(f);
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
      ${f.length ? `<span class="eyebrow">${f.length}${geplant ? ' · ' + fmtDauer(geplant) : ''}</span>` : ''}</div>
    ${f.length ? `<div class="list-card" data-heuteliste>${f.map(x => `
        <div class="rowline kheute" data-sortheute="${x.id}">
          <button class="status-btn" data-fertig="${x.id}" data-art="${x.art}" aria-label="Erledigt">${ICON.check}</button>
          <span class="grow"><span class="rn">${esc(x.text)}</span>
            ${x.notiz && x.art !== 'routine' ? `<span class="rm">${esc(x.notiz)}</span>` : ''}</span>
          ${x.dauer ? `<span class="kdauer num">${esc(fmtDauerKurz(x.dauer))}</span>` : ''}
          <span class="kgruppe${x.art === 'routine' ? ' routine' : ''}">${esc(x.gruppe)}</span>
        </div>`).join('')}</div>
      <p class="hinweis" style="padding:7px 2px 0;font-size:10.5px">Lang drücken und schieben
        ordnet den Tag.</p>`
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
  $$('[data-fertig]', v).forEach(b => b.onclick = () => {
    if (b._langGedrueckt) return;
    if (b.dataset.art === 'routine') kRoutineAbhaken(b.dataset.fertig, h);
    else kAbhaken(b.dataset.fertig);
    kViewMalen();
  });
  /* Lang drücken hebt eine Zeile an – quer über alle Gruppen, denn der Tag
     läuft nicht nach Themen ab. Gemerkt wird die Reihe für diesen Tag. */
  $$('[data-sortheute]', v).forEach(node => {
    node._sortId = node.dataset.sortheute;
    ziehenZumSortieren(node, node, {
      auswahl: '[data-sortheute]',
      neuMalen: kViewMalen,
      fertig: reihe => kAendern(() => { KDB.reihen[h] = reihe; })
    });
  });
}

function kTerminZeile(x, iso) {
  const lage = kTagImTermin(x, iso);
  const mehr = lage && lage.tage > 1;
  /* Die schmale Spalte trägt bei einem Tag die Uhrzeit, bei mehreren die
     Nummer des Tages – „2/4“ sagt dort mehr als eine Anfangszeit, die
     schon zwei Tage zurückliegt. */
  const spalte = mehr ? lage.nr + '/' + lage.tage : (x.zeit ? esc(x.zeit) : '–');
  const teile = [
    mehr ? esc(kTagKurz(x.datum)) + ' – ' + esc(kTagKurz(lage ? kPlus(lage.beginn, lage.tage - 1) : x.bis)) : '',
    kZeitspanne(x),
    x.ort,
    x.wdh !== 'keine' ? KWDH[x.wdh] : ''
  ].filter(Boolean);
  return `<button class="rowline${mehr ? ' kmehrtag' : ''}" data-termin="${x.id}" style="width:100%;text-align:left">
    <span class="kpunkt" style="background:var(--${x.farbe})"></span>
    <span class="kzeit num">${esc(spalte)}</span>
    <span class="grow"><span class="rn">${esc(x.titel)}</span>
      <span class="rm">${teile.map(esc).join(' · ') || 'ohne weitere Angabe'}</span></span>
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
  const w = t || { id: uid(), titel: '', datum: vorgabe || heute(), bis: '', zeit: null, bisZeit: null, ort: '', notiz: '', farbe: KFARBEN[0], wdh: 'keine' };
  const s = blatt(neu ? 'Neuer Termin' : 'Termin', `
    <div class="field"><label>Was</label>
      <input type="text" data-titel value="${esc(w.titel)}" placeholder="z.B. Zahnarzt"></div>
    <div class="grid2">
      <div class="field"><label>Von – Tag</label><input type="date" data-datum value="${esc(w.datum)}"></div>
      <div class="field"><label>Bis – Tag</label><input type="date" data-bis value="${esc(w.bis || '')}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Von – Uhrzeit</label><input type="time" data-zeit value="${w.zeit ? esc(w.zeit) : ''}"></div>
      <div class="field"><label>Bis – Uhrzeit</label><input type="time" data-biszeit value="${w.bisZeit ? esc(w.bisZeit) : ''}"></div>
    </div>
    <span class="hint" style="display:block;margin:-6px 0 12px" data-spanne></span>
    <div class="field"><label>Ort</label><input type="text" data-ort value="${esc(w.ort)}" placeholder="optional"></div>
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

  /* Was gerade eingetragen ist, in einem Satz – dann muss niemand im Kopf
     nachrechnen, ob die Angaben zusammenpassen. */
  const lesen = () => {
    const datum = $('[data-datum]', s).value || heute();
    const bis = $('[data-bis]', s).value;
    const zeit = $('[data-zeit]', s).value;
    const bisZeit = $('[data-biszeit]', s).value;
    return {
      datum,
      bis: /^\d{4}-\d{2}-\d{2}$/.test(bis) && bis > datum ? bis : '',
      bisRoh: bis,
      zeit: /^\d{2}:\d{2}$/.test(zeit) ? zeit : null,
      bisZeit: /^\d{2}:\d{2}$/.test(bisZeit) ? bisZeit : null
    };
  };
  const spanneMalen = () => {
    const v = lesen();
    const el = $('[data-spanne]', s);
    const tage = kSpanne(v) + 1;
    const dauer = kTerminDauer(v);
    if (v.bisRoh && !v.bis) {
      el.textContent = 'Das Ende liegt vor dem Anfang – der Termin gilt für einen Tag.';
      el.style.color = 'var(--bad)';
      return;
    }
    el.style.color = '';
    const teile = [];
    if (tage > 1) teile.push(pl(tage, 'Tag', 'Tage'));
    if (kZeitspanne(v)) teile.push(kZeitspanne(v));
    if (dauer) teile.push('macht ' + fmtDauer(dauer));
    el.textContent = teile.length ? teile.join(' · ')
      : 'Ohne Uhrzeit gilt er als ganztägig. Für mehrere Tage einen Bis-Tag eintragen.';
  };
  ['[data-datum]', '[data-bis]', '[data-zeit]', '[data-biszeit]'].forEach(q => {
    const el = $(q, s);
    if (el) { el.addEventListener('change', spanneMalen); el.addEventListener('input', spanneMalen); }
  });
  spanneMalen();

  $('[data-ok]', s).onclick = () => {
    const titel = $('[data-titel]', s).value.trim();
    if (!titel) { toast('Ohne Titel geht es nicht.'); return; }
    const v = lesen();
    /* An einem Tag muss das Ende nach dem Anfang liegen. Wer über
       Mitternacht feiert, trägt den nächsten Tag als Bis-Tag ein. */
    if (!v.bis && v.zeit && v.bisZeit && kMinuten(v.bisZeit) <= kMinuten(v.zeit)) {
      toast('Das Ende liegt vor dem Anfang. Geht es über Mitternacht, trag den nächsten Tag als Bis-Tag ein.', 5000);
      return;
    }
    kAendern(() => {
      w.titel = titel;
      w.datum = v.datum;
      w.bis = v.bis;
      w.zeit = v.zeit;
      w.bisZeit = v.bisZeit;
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
    ${KDB.routinen.length ? `
      <div class="section-head" style="margin-top:6px"><h2>Routine</h2>
        <button class="btn btn-sm" data-rneu>${ICON.plus} Routine</button></div>
      <div class="list-card" style="margin-bottom:22px">${KDB.routinen.map(r => `
        <button class="rowline kroutine${r.aktiv ? '' : ' ruht'}" data-redit="${r.id}" style="width:100%;text-align:left">
          <span class="grow"><span class="rn">${esc(r.text)}</span>
            <span class="rm">${esc(kTakteText(r.wochentage))}${r.aktiv ? '' : ' · ruht'}</span></span>
          ${r.dauer ? `<span class="kdauer num">${esc(fmtDauerKurz(r.dauer))}</span>` : ''}
          <span class="chev">${ICON.chev}</span></button>`).join('')}</div>`
      : `<button class="btn btn-block btn-ghost btn-sm" style="margin:2px 0 20px" data-rneu>${ICON.plus}
          Routine anlegen – etwa „Mo–Fr lesen, 45 min“</button>`}

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
  $('[data-rneu]', v).onclick = () => kRoutineBearbeiten(null);
  $$('[data-redit]', v).forEach(b => b.onclick = () =>
    kRoutineBearbeiten(KDB.routinen.find(r => r.id === b.dataset.redit)));
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
              <span class="kt-marke">${t.datum ? esc(kTagKurz(t.datum)) : 'Ohne Datum'}${
    kDauerSumme(t.taetigkeiten) ? ' · ' + esc(fmtDauerKurz(kDauerSumme(t.taetigkeiten))) : ''}</span>
              <button class="icon-btn" data-tedit="${t.id}" aria-label="Tag ändern">${ICON.edit}</button>
              <button class="icon-btn" data-tdel="${t.id}" aria-label="Löschen">${ICON.trash}</button>
            </div>
            ${t.datum ? `<div class="kt-text">${esc(kTagText(t.datum))}</div>` : ''}
            ${t.notiz ? `<div class="kt-notiz">${esc(t.notiz)}</div>` : ''}
            ${t.taetigkeiten.length ? `<div class="kt-liste" data-liste="${t.id}">${t.taetigkeiten.map(x => `
              <div class="kh${x.done ? ' fertig' : ''}" data-sorttat="${x.id}" data-griff-tat="${x.id}">
                <button class="status-btn winzig${x.done ? ' an' : ''}" data-scheck="${x.id}" aria-label="Erledigt">${x.done ? ICON.check : ''}</button>
                <button class="kh-text" data-sedit="${x.id}">${esc(x.text)}</button>
                ${x.dauer ? `<span class="kdauer num">${esc(fmtDauerKurz(x.dauer))}</span>` : ''}
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
          <input type="date" data-tneu="${vh.id}" value="${esc(kNaechsterTag(vh))}" aria-label="Tag">
          <button class="btn btn-sm" data-tadd="${vh.id}">${ICON.plus}</button>
        </div>
        <p class="hinweis" style="padding:6px 0 0;font-size:10px">Tag anlegen</p>
      </div>
    </div>
  </div>`;
}

/* Steht schon ein Tag im Thema, schlägt das Feld den nächsten vor – wer eine
   Reihe anlegt, tippt sonst jedes Datum von Hand. */
function kNaechsterTag(vh) {
  const daten = vh.tage.map(t => t.datum).filter(Boolean).sort();
  if (!daten.length) return heute();
  const naechster = kPlus(daten[daten.length - 1], 1);
  return naechster > heute() ? naechster : kPlus(heute(), 1);
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
  $$('[data-sedit]', v).forEach(b => b.onclick = () => {
    if (b._langGedrueckt) return;
    const f = finde(b.dataset.sedit);
    if (f) kTaetigkeitBearbeiten(f.vh, f.t, f.x);
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

/* Eine Tätigkeit trägt ihren Text und, wenn man will, die Zeit, die man ihr
   geben möchte. Die Summe steht über dem Tag und unter „Heute“. */
function kTaetigkeitBearbeiten(vh, t, x) {
  const s = blatt('Tätigkeit', `
    <div class="field"><label>Was</label><input type="text" data-t value="${esc(x.text)}"></div>
    <div class="field"><label>Geplante Dauer (Minuten)</label>
      <input type="number" inputmode="numeric" data-dauer min="0" max="1440" step="5"
        value="${x.dauer || ''}" placeholder="z.B. 45">
      <span class="hint">Leer lassen, wenn es keine Rolle spielt.</span></div>
    <div class="chiprow" style="margin-bottom:14px">
      ${[15, 30, 45, 60, 90].map(m => `<button class="chip" data-schnell="${m}">${m} min</button>`).join('')}
    </div>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`);
  $$('[data-schnell]', s).forEach(b => b.onclick = () => { $('[data-dauer]', s).value = b.dataset.schnell; });
  $('[data-ok]', s).onclick = () => {
    const text = $('[data-t]', s).value.trim();
    if (!text) { toast('Ohne Text geht es nicht.'); return; }
    const d = Math.round(+$('[data-dauer]', s).value || 0);
    kAendern(() => { x.text = text; x.dauer = clamp(d, 0, 1440) || null; });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
  };
}

/* ---------- Routine ---------- */
/* „Mo–Fr lesen, 45 Minuten“ – eine Tätigkeit ohne Thema, die am Wochentag
   hängt statt an einem Datum. */
function kRoutineBearbeiten(routine) {
  const neu = !routine;
  const r = routine || { id: uid(), text: '', wochentage: [0, 1, 2, 3, 4], dauer: null, aktiv: true, erledigt: {} };
  let wt = r.wochentage.slice();
  const s = blatt(neu ? 'Routine' : 'Routine ändern', `
    <div class="field"><label>Was</label>
      <input type="text" data-t value="${esc(r.text)}" placeholder="z.B. lesen"></div>
    <div class="field"><label>An welchen Tagen</label>
      <div class="ktagwahl" data-wahl>${KTAGE.map((n, i) =>
    `<button class="chip" data-wt="${i}" aria-pressed="${wt.includes(i)}">${n}</button>`).join('')}</div>
      <div class="chiprow" style="margin-top:8px">
        <button class="chip" data-preset="mofr">Mo–Fr</button>
        <button class="chip" data-preset="alle">täglich</button>
        <button class="chip" data-preset="we">Wochenende</button>
      </div></div>
    <div class="field"><label>Geplante Dauer (Minuten)</label>
      <input type="number" inputmode="numeric" data-dauer min="0" max="1440" step="5"
        value="${r.dauer || ''}" placeholder="z.B. 45"></div>
    ${neu ? '' : `<div class="list-card" style="margin-bottom:14px">
      <div class="rowline"><span class="grow"><span class="rn">${r.aktiv ? 'Läuft' : 'Ruht'}</span>
        <span class="rm">Eine ruhende Routine taucht unter „Heute“ nicht auf</span></span>
        <button class="btn btn-sm" data-ruht>${r.aktiv ? 'Ruhen lassen' : 'Wieder starten'}</button></div>
    </div>`}
    <div class="btn-row">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Eintragen' : 'Sichern'}</button>
      ${neu ? '' : '<button class="btn btn-danger" data-weg>' + ICON.trash + '</button>'}
    </div>`, { fokus: neu });

  const wahlMalen = () => $$('[data-wt]', s).forEach(b =>
    b.setAttribute('aria-pressed', wt.includes(+b.dataset.wt)));
  $$('[data-wt]', s).forEach(b => b.onclick = () => {
    const i = +b.dataset.wt;
    wt = wt.includes(i) ? wt.filter(x => x !== i) : wt.concat(i).sort((a, b) => a - b);
    wahlMalen();
  });
  $$('[data-preset]', s).forEach(b => b.onclick = () => {
    wt = b.dataset.preset === 'alle' ? [0, 1, 2, 3, 4, 5, 6]
      : b.dataset.preset === 'we' ? [5, 6] : [0, 1, 2, 3, 4];
    wahlMalen();
  });
  $('[data-ok]', s).onclick = () => {
    const text = $('[data-t]', s).value.trim();
    if (!text) { toast('Ohne Text geht es nicht.'); return; }
    if (!wt.length) { toast('Mindestens ein Tag.'); return; }
    const d = Math.round(+$('[data-dauer]', s).value || 0);
    kAendern(() => {
      r.text = text.slice(0, 200);
      r.wochentage = wt.slice();
      r.dauer = clamp(d, 0, 1440) || null;
      if (neu) KDB.routinen.push(r);
    });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
  };
  const ruht = $('[data-ruht]', s);
  if (ruht) ruht.onclick = () => {
    kAendern(() => { r.aktiv = !r.aktiv; });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
  };
  const weg = $('[data-weg]', s);
  if (weg) weg.onclick = async () => {
    if (!await bestaetigen('Routine löschen?', esc(r.text) + ' wird entfernt.', 'Löschen', true)) return;
    kAendern(() => { KDB.routinen = KDB.routinen.filter(x => x.id !== r.id); });
    KStore.sichern(true);
    layerSchliessen();
    kViewMalen();
  };
}

/* ---------- Mehr ---------- */
function kMehrMalen(v) {
  const offen = KDB.aufgaben.filter(x => !x.done).length;
  v.innerHTML = `
    ${appDatenHtml(KORT)}
    <div class="section-head" style="padding-top:14px"><h2>Inhalt</h2></div>
    <div class="list-card">
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
      <div class="rowline"><span class="grow"><span class="rn">Routine</span><span class="rm">${
    KDB.routinen.filter(r => r.aktiv).length} laufen</span></span>
        <span class="num">${KDB.routinen.length}</span></div>
    </div>

    ${huelleEinstellungenHtml()}
    <p class="hinweis" style="padding:16px 0 30px">Der Kalender führt seine eigene Datei. Die leseliste bleibt davon unberührt – jede App in dieser Datei hat ihre eigene Datenbasis.</p>`;

  appDatenBinden(KORT, v, kViewMalen);
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


