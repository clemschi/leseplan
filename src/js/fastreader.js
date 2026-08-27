/* ============================================================
   fastreader – die dritte App
   Wort für Wort an einem festen Punkt: das Auge bleibt stehen,
   der Text läuft. Bibliothek · Lesen · Bilanz · Mehr
   ============================================================ */

let FDB = leereFr();

function leereFr() {
  return {
    format: 'mylife-fastreader',
    version: 1,
    erstellt: Date.now(),
    geaendert: Date.now(),
    einstellungen: {
      autosaveSek: 60,
      tempo: 350,        // Wörter je Minute
      groesse: 30,       // Schriftgrad der Wortanzeige
      aufwaermen: true,  // die ersten Wörter langsamer
      pausen: true,      // an Satzzeichen länger stehen bleiben
      kontext: true      // beim Anhalten den Satz zeigen
    },
    /* Jeder Text mit seiner Stelle – der Text liegt mit in dieser Datenbasis,
       damit die Sicherung vollständig ist. */
    dokumente: [],
    bilanz: { worte: 0, ms: 0, proben: [] }
  };
}

function frNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const f = leereFr();
  f.erstellt = +d.erstellt || Date.now();
  f.einstellungen = Object.assign(f.einstellungen, d.einstellungen || {});
  f.einstellungen.tempo = clamp(+f.einstellungen.tempo || 350, 100, 1000);
  f.einstellungen.groesse = clamp(+f.einstellungen.groesse || 30, 14, 72);
  f.dokumente = (Array.isArray(d.dokumente) ? d.dokumente : []).map(x => ({
    id: x.id || uid(),
    name: String(x.name || 'Ohne Titel').trim().slice(0, 160),
    text: String(x.text || ''),
    wort: Math.max(0, +x.wort || 0),
    worte: Math.max(0, +x.worte || 0),
    quelle: String(x.quelle || ''),
    zuletzt: +x.zuletzt || Date.now()
  })).filter(x => x.text);
  const b = d.bilanz || {};
  f.bilanz = {
    worte: Math.max(0, +b.worte || 0),
    ms: Math.max(0, +b.ms || 0),
    proben: (Array.isArray(b.proben) ? b.proben : []).map(n => +n || 0).filter(n => n > 0).slice(-200)
  };
  return f;
}

const FStore = macheSpeicher({
  id: 'fastreader', metaKey: 'meta-fastreader', datenKey: 'daten-fastreader', dateiname: 'fastreader.json',
  daten: () => FDB, setzen: d => { FDB = d; }
});

function fAendern(fn) { if (fn) fn(); FStore.aendern(); }

const FICON = {
  buch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5"/></svg>',
  auge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  kurve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17.5 8.5 11l3.5 3.5L21 6"/><path d="M3 21h18"/></svg>',
  spulen: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 6v12L3 12zM21 6v12l-8-6z"/></svg>',
  start: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>',
  halt: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>'
};

/* ---------- Text aufbereiten ---------- */
/* Zeilenumbrüche aus Dateien sind Layout, keine Absätze: getrennte Wörter
   werden zusammengefügt, Kopf- und Fusszeilen fliegen raus. */
function frSaeubern(roh) {
  let zeilen = String(roh).split('\n').map(z => z.replace(/­/g, '').replace(/\s+/g, ' ').trim());
  zeilen = zeilen.filter(z => !/^([ivxlcdm]{1,7}|\d{1,4}|[-–—•·|]+)$/i.test(z));
  const gesehen = {};
  zeilen.forEach(z => { if (z.length > 3 && z.length < 70) gesehen[z] = (gesehen[z] || 0) + 1; });
  const laeufer = new Set(Object.keys(gesehen).filter(k => gesehen[k] >= 4));
  zeilen = zeilen.filter(z => !laeufer.has(z));
  const laengen = zeilen.filter(Boolean).map(z => z.length).sort((a, b) => a - b);
  const mitte = laengen.length ? laengen[Math.floor(laengen.length / 2)] : 64;
  let aus = '';
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (!z) { if (!/\n\n$/.test(aus)) aus += '\n\n'; continue; }
    const naechste = zeilen[i + 1] || '';
    if (/[-‐‑]$/.test(z) && /^[a-zäöüßàéèç]/.test(naechste)) { aus += z.slice(0, -1); continue; }
    aus += z;
    const schluss = /[.!?…»"'”)]$/.test(z);
    if ((schluss && z.length < mitte * 0.82) || !naechste.trim()) aus += '\n\n'; else aus += ' ';
  }
  return aus.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/* Abkürzungen, die kein Satzende sind. */
const F_ABK = new Set(['dr.', 'prof.', 'nr.', 'bzw.', 'usw.', 'etc.', 'vgl.', 'ca.', 'z.b.', 'u.a.',
  'd.h.', 'ggf.', 'abb.', 's.', 'vs.', 'mr.', 'mrs.', 'st.', 'ff.', 'inkl.', 'evtl.', 'jh.', 'bd.']);
function frSatzende(w) {
  if (!/[.!?…][»"'”)\]]?$/.test(w)) return false;
  return !F_ABK.has(w.toLowerCase());
}
function frZerlegen(text) {
  const marken = [];
  const absaetze = String(text).split(/\n{2,}/);
  absaetze.forEach((p, pi) => {
    const ws = p.split(/\s+/).filter(Boolean);
    ws.forEach((w, i) => {
      marken.push({
        w,
        absatz: i === ws.length - 1 && pi < absaetze.length - 1,
        satz: frSatzende(w),
        weich: /[,;:—–)]$/.test(w)
      });
    });
  });
  return marken;
}

/* Der Blickpunkt im Wort: nicht die Mitte, sondern etwas davor. */
function frFixpunkt(w) {
  const stellen = [];
  for (let j = 0; j < w.length; j++) if (/[\p{L}\p{N}]/u.test(w[j])) stellen.push(j);
  if (!stellen.length) return 0;
  const n = stellen.length;
  const i = n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  return stellen[Math.min(i, n - 1)];
}

/* Wie lange ein Wort stehen bleibt – lange Wörter länger, Satzzeichen halten auf. */
function frFaktor(t, pausen) {
  const len = t.w.replace(/[^\p{L}\p{N}]/gu, '').length;
  let m = 1;
  if (len > 7) m += (len - 7) * 0.055;
  if (len <= 2) m *= 0.9;
  if (pausen) {
    if (t.weich) m *= 1.5;
    if (t.satz) m *= 2.1;
    if (t.absatz) m *= 2.7;
  }
  return m;
}

/* ---------- Öffnen und Speicherort ---------- */
/* Den Weg dorthin geht appSpeicherort in speicher.js für alle Nebenapps
   gleich; hier stehen nur die Angaben des fastreaders. */
const FRORT = appOrtAnmelden({
  store: FStore, name: 'fastreader', datei: 'fastreader.json', format: 'mylife-fastreader',
  lead: 'Wo sollen deine Texte und Lesezeichen liegen? Der fastreader führt eine eigene Datei – die anderen Apps bleiben davon unberührt.',
  normalisiere: frNormalisiere, leer: leereFr, starten: () => frStarten(),
  ortWechseln: () => frSpeicherort(false)
});
function fastreaderOeffnen() { return appSpeicherOeffnen(FRORT); }
function frSpeicherort(erneut) { appSpeicherort(FRORT, erneut); }

/* ---------- Gerüst ---------- */
const FTABS = [
  { id: 'bib', label: 'Bibliothek', icon: FICON.buch },
  { id: 'lesen', label: 'Lesen', icon: FICON.auge },
  { id: 'bilanz', label: 'Bilanz', icon: FICON.kurve },
  { id: 'fmehr', label: 'Mehr', icon: ICON.more }
];
let fTab = 'bib';

/* Der laufende Stand des Lesers – nichts davon gehört in die Datenbasis. */
const FS = {
  doc: null, marken: [], i: 0, laeuft: false, uhr: null, norm: 1,
  seit: 0, warmZaehler: 0, sitzungWorte: 0, sitzungMs: 0, angehalten: 0
};
const F_RAMPE = 45;

function frStarten() {
  appFlaeche('fr');
  aktiverSpeicher = FStore;
  frVertiefen(false);
  fTab = FDB.dokumente.length ? 'lesen' : 'bib';
  if (fTab === 'lesen' && !FS.doc) frDokLaden(frLetztes());
  themeAnwenden();
  frKnoepfeMalen();
  $('#fBtnTheme').onclick = () => { themeUmschalten(); frKnoepfeMalen(); fViewMalen(); };
  $('#fBtnVoll').onclick = vollbildUmschalten;
  $('#fBtnRaus').innerHTML = ICON.x;
  $('#fBtnRaus').onclick = () => { frAnhalten(); zumStartbildschirm(); };
  $('#fBrand').onclick = () => { if (fTab !== 'bib') fTabWechseln('bib'); else window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#fSaveChip').onclick = () => FStore.alsDateiSichern(false);
  /* Solange alles versunken ist, hält jeder Tipp an – egal wohin. */
  if (!$('#fr')._tippBereit) {
    $('#fr')._tippBereit = true;
    $('#fr').addEventListener('click', e => {
      if (!$('#fr').classList.contains('vertieft')) return;
      e.stopPropagation();
      e.preventDefault();
      frAnhalten();
    }, true);
  }
  fTabbarMalen();
  fViewMalen();
  FStore.autosaveStarten();
  saveChipMalen();
}

function frKnoepfeMalen() {
  const t = $('#fBtnTheme'), v = $('#fBtnVoll');
  if (t) t.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  if (!v) return;
  v.hidden = !vollbildGeht();
  v.innerHTML = vollbildAn() ? ICON.vollAus : ICON.voll;
}
function fTabbarMalen() {
  $('#ftabbar').innerHTML = FTABS.map(t =>
    `<button data-ftab="${t.id}" aria-selected="${t.id === fTab}">${t.icon}<span>${t.label}</span></button>`).join('');
  $('#ftabbar').onclick = e => {
    const b = e.target.closest('[data-ftab]');
    if (b) fTabWechseln(b.dataset.ftab);
  };
}
function fTabWechseln(id) {
  if (fTab === 'lesen' && id !== 'lesen') frAnhalten();
  frVertiefen(false);
  fTab = id;
  fTabbarMalen();
  fViewMalen();
  window.scrollTo(0, 0);
}
function fViewMalen() {
  leistenHoeheMessen();
  const v = $('#fview');
  frBannerMalen();
  if (fTab === 'bib') frBibMalen(v);
  else if (fTab === 'lesen') frLesenMalen(v);
  else if (fTab === 'bilanz') frBilanzMalen(v);
  else frMehrMalen(v);
  frKnoepfeMalen();
  saveChipMalen();
}
function frBannerMalen() {
  const b = $('#fBanner');
  const d = FS.doc;
  if (!d) {
    b.innerHTML = `<span class="kb-tag num">${pl(FDB.dokumente.length, 'Text', 'Texte')}</span>
      <span class="kb-zahlen"><span>${FDB.einstellungen.tempo} WpM</span></span>`;
    return;
  }
  const rest = Math.max(0, FS.marken.length - FS.i);
  const min = rest / Math.max(FDB.einstellungen.tempo, 1);
  b.innerHTML = `
    <span class="kb-tag" style="max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.name)}</span>
    <span class="kb-zahlen">
      <span class="num">${Math.round(FS.i / Math.max(FS.marken.length - 1, 1) * 100)} %</span>
      <span class="kb-punkt">·</span>
      <span class="num">${min < 1 ? 'unter 1 min' : min < 60 ? Math.round(min) + ' min' : Math.floor(min / 60) + ' h ' + Math.round(min % 60) + ' m'} übrig</span>
    </span>`;
}

const frLetztes = () => FDB.dokumente.slice().sort((a, b) => b.zuletzt - a.zuletzt)[0] || null;

/* ---------- Bibliothek ---------- */
function frBibMalen(v) {
  const liste = FDB.dokumente.slice().sort((a, b) => b.zuletzt - a.zuletzt);
  v.innerHTML = `
    <div class="section-head" style="padding-top:14px"><h2>Text laden</h2></div>
    <div class="frquellen">
      <button class="frquelle" data-datei>
        <span class="q-kopf">${ICON.plus} Datei öffnen</span>
        <span class="q-sub">TXT · MD · DOCX · PDF</span>
      </button>
      <button class="frquelle" data-einfuegen>
        <span class="q-kopf">${ICON.edit} Text einfügen</span>
        <span class="q-sub">Aus der Zwischenablage oder getippt</span>
      </button>
      <button class="frquelle" data-adresse>
        <span class="q-kopf">${ICON.search} Von einer Adresse</span>
        <span class="q-sub">Wikipedia und offene Seiten</span>
      </button>
    </div>
    <input type="file" accept=".txt,.md,.markdown,.docx,.pdf,text/plain" hidden data-file>

    <div class="section-head" style="margin-top:22px"><h2>Bibliothek</h2>
      ${liste.length ? `<span class="eyebrow">${liste.length}</span>` : ''}</div>
    ${liste.length ? `<div class="list-card">${liste.map(d => {
      const pct = d.worte ? Math.round(d.wort / d.worte * 100) : 0;
      return `<div class="rowline frzeile">
        <button class="grow" data-oeffne="${d.id}" style="text-align:left">
          <span class="rn">${esc(d.name)}</span>
          <span class="rm">${fmtZahl(d.worte)} Wörter · Wort ${fmtZahl(d.wort)}${d.quelle ? ' · ' + esc(d.quelle) : ''}</span>
          <span class="frbalken"><i style="width:${pct}%"></i></span>
        </button>
        <span class="frpct num">${pct}<small>%</small></span>
        <button class="icon-btn" data-loesch="${d.id}" aria-label="Entfernen">${ICON.trash}</button>
      </div>`;
    }).join('')}</div>`
      : `<div class="empty" style="margin:0"><strong>Noch nichts hier</strong>
          Lade oben einen Text. Er bleibt danach liegen – samt der Stelle, an der du aufgehört hast.</div>`}
    <div style="height:26px"></div>`;

  const datei = $('[data-file]', v);
  $('[data-datei]', v).onclick = () => datei.click();
  datei.onchange = async () => { const f = datei.files[0]; datei.value = ''; if (f) await frDateiLesen(f); };
  $('[data-einfuegen]', v).onclick = () => frEinfuegenBlatt();
  $('[data-adresse]', v).onclick = () => frAdresseBlatt();
  $$('[data-oeffne]', v).forEach(b => b.onclick = () => {
    frDokLaden(FDB.dokumente.find(x => x.id === b.dataset.oeffne));
    fTabWechseln('lesen');
  });
  $$('[data-loesch]', v).forEach(b => b.onclick = async () => {
    const d = FDB.dokumente.find(x => x.id === b.dataset.loesch);
    if (!d) return;
    if (!await bestaetigen('Text entfernen?', esc(d.name) + ' verschwindet samt Lesezeichen.', 'Entfernen', true)) return;
    fAendern(() => { FDB.dokumente = FDB.dokumente.filter(x => x.id !== d.id); });
    if (FS.doc && FS.doc.id === d.id) { frAnhalten(); FS.doc = null; FS.marken = []; FS.i = 0; }
    FStore.sichern(true);
    fViewMalen();
  });
}

/* ---------- Text hereinholen ---------- */
async function frDateiLesen(f) {
  const name = f.name.replace(/\.[^.]+$/, '');
  const endung = (f.name.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
  const warten = frWarten('Text wird gelesen');
  try {
    let text;
    if (endung === 'docx') text = await frDocx(f);
    else if (endung === 'pdf') text = await frPdf(f, p => warten.stand(p));
    else text = frSaeubern(await f.text());
    warten.weg();
    if (!text || text.split(/\s+/).length < 10) {
      toast('In dieser Datei steckt kein lesbarer Text.', 4200);
      return;
    }
    frAnlegen(name, text, endung.toUpperCase());
  } catch (e) {
    warten.weg();
    console.warn(e);
    toast(e && e.message ? e.message : 'Die Datei liess sich nicht lesen.', 5000);
  }
}

/* DOCX ist ein ZIP – auspacken kann der Browser selbst. */
async function frDocx(f) {
  const buf = new Uint8Array(await f.arrayBuffer());
  const sicht = new DataView(buf.buffer);
  /* Das zentrale Verzeichnis steht am Ende; von dort führt der Weg zu den Teilen. */
  let ende = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (sicht.getUint32(i, true) === 0x06054b50) { ende = i; break; }
  }
  if (ende < 0) throw new Error('Das ist keine gültige DOCX-Datei.');
  let zeiger = sicht.getUint32(ende + 16, true);
  const anzahl = sicht.getUint16(ende + 10, true);
  let roh = null;
  for (let n = 0; n < anzahl; n++) {
    if (sicht.getUint32(zeiger, true) !== 0x02014b50) break;
    const art = sicht.getUint16(zeiger + 10, true);
    const gepackt = sicht.getUint32(zeiger + 20, true);
    const nLen = sicht.getUint16(zeiger + 28, true);
    const eLen = sicht.getUint16(zeiger + 30, true);
    const kLen = sicht.getUint16(zeiger + 32, true);
    const start = sicht.getUint32(zeiger + 42, true);
    const name = new TextDecoder().decode(buf.subarray(zeiger + 46, zeiger + 46 + nLen));
    if (name === 'word/document.xml') {
      const lokalN = sicht.getUint16(start + 26, true);
      const lokalE = sicht.getUint16(start + 28, true);
      const von = start + 30 + lokalN + lokalE;
      const teil = buf.subarray(von, von + gepackt);
      roh = art === 0 ? teil : await frAuspacken(teil);
      break;
    }
    zeiger += 46 + nLen + eLen + kLen;
  }
  if (!roh) throw new Error('In der DOCX-Datei fehlt der Textteil.');
  const xml = new TextDecoder().decode(roh);
  const absaetze = xml.split(/<\/w:p>/).map(p => {
    const stuecke = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]);
    return stuecke.join('')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
  if (!absaetze.length) throw new Error('In der DOCX-Datei steht kein Text.');
  return absaetze.join('\n\n');
}
async function frAuspacken(teil) {
  if (typeof DecompressionStream !== 'function') throw new Error('Dieser Browser kann DOCX nicht auspacken – bitte den Text einfügen.');
  const strom = new Blob([teil]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

/* PDF braucht eine fremde Bibliothek – die wird erst geholt, wenn wirklich
   ein PDF kommt, und nur, wenn diese Umgebung nach draussen darf. */
let frPdfLib = null;
async function frPdfBibliothek() {
  if (frPdfLib) return frPdfLib;
  if (typeof window.pdfjsLib !== 'undefined') { frPdfLib = window.pdfjsLib; return frPdfLib; }
  await new Promise((res, rej) => {
    const sk = document.createElement('script');
    sk.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    sk.onload = res;
    sk.onerror = () => rej(new Error('Die PDF-Bibliothek liess sich nicht laden. Ohne Verbindung geht PDF nicht – kopiere den Text und füge ihn ein.'));
    document.head.appendChild(sk);
    setTimeout(() => rej(new Error('Die PDF-Bibliothek antwortet nicht. Kopiere den Text und füge ihn ein.')), 15000);
  });
  if (typeof window.pdfjsLib === 'undefined') throw new Error('Die PDF-Bibliothek liess sich nicht laden.');
  frPdfLib = window.pdfjsLib;
  frPdfLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return frPdfLib;
}
async function frPdf(f, melden) {
  const lib = await frPdfBibliothek();
  const pdf = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
  const seiten = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent();
    const zeilen = new Map();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const key = Math.round(it.transform[5] / 3);
      if (!zeilen.has(key)) zeilen.set(key, []);
      zeilen.get(key).push({ x: it.transform[4], s: it.str, w: it.width || 0 });
    }
    seiten.push([...zeilen.entries()].sort((a, b) => b[0] - a[0]).map(([, items]) => {
      items.sort((a, b) => a.x - b.x);
      let s = '', ende = null;
      for (const it of items) {
        if (ende !== null && it.x - ende > 1.4) s += ' ';
        s += it.s; ende = it.x + it.w;
      }
      return s;
    }).join('\n'));
    melden(Math.round(p / pdf.numPages * 100));
    if (p % 12 === 0) await new Promise(r => setTimeout(r));
  }
  return frSaeubern(seiten.join('\n\n'));
}

function frWarten(titel) {
  const s = blatt(titel, `<p class="muted" style="font-size:13px;margin-bottom:8px" data-stand>einen Augenblick …</p>
    <div class="barwrap"><i class="bar-read" data-bar style="width:0%"></i></div>`, { fokus: false });
  return {
    stand: p => { const t = $('[data-stand]', s); if (t) t.textContent = p + ' %'; const b = $('[data-bar]', s); if (b) b.style.width = p + '%'; },
    weg: () => { if (s.isConnected) layerSchliessen(); }
  };
}

function frEinfuegenBlatt() {
  const s = blatt('Text einfügen', `
    <div class="field"><label>Titel</label><input type="text" data-name placeholder="z.B. Aufsatz über die Zeit"></div>
    <div class="field"><label>Text</label><textarea data-text style="min-height:160px" placeholder="Hier einfügen …"></textarea>
      <span class="hint" data-zahl></span></div>
    <button class="btn btn-primary btn-block" data-ok>Lesen</button>`, { fokus: false });
  const feld = $('[data-text]', s);
  feld.addEventListener('input', () => {
    const n = feld.value.trim().split(/\s+/).filter(Boolean).length;
    $('[data-zahl]', s).textContent = n ? fmtZahl(n) + ' Wörter' : '';
  });
  $('[data-ok]', s).onclick = () => {
    const t = feld.value.trim();
    if (t.split(/\s+/).filter(Boolean).length < 5) { toast('Da ist noch kein Text.'); return; }
    const name = $('[data-name]', s).value.trim() || 'Eingefügt · ' + new Date().toLocaleDateString('de-DE');
    layerSchliessen();
    frAnlegen(name, frSaeubern(t), 'eingefügt');
  };
}

function frAdresseBlatt() {
  const s = blatt('Von einer Adresse', `
    <div class="field"><label>Adresse</label>
      <input type="url" data-url placeholder="https://de.wikipedia.org/wiki/Lesen">
      <span class="hint">Wikipedia lädt direkt. Andere Seiten nur, wenn sie fremde Zugriffe erlauben –
      sonst hilft Kopieren und Einfügen.</span></div>
    <button class="btn btn-primary btn-block" data-ok>Holen</button>`);
  $('[data-ok]', s).onclick = async () => {
    const roh = $('[data-url]', s).value.trim();
    if (!roh) return;
    layerSchliessen();
    await frVonAdresse(roh);
  };
}

function frUrl(roh) {
  let u = roh.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u); } catch (e) { return null; }
}
const FR_WIKI_STOP = /^(Einzelnachweise|Literatur|Weblinks|Siehe auch|Anmerkungen|Quellen|Fußnoten|References|External links|See also|Further reading|Notes|Bibliography)$/i;

async function frVonAdresse(roh) {
  const u = frUrl(roh);
  if (!u) { toast('Das ist keine gültige Adresse.', 3500); return; }
  const warten = frWarten('Seite wird geholt');
  try {
    const m = u.hostname.match(/^([a-z-]{2,12})\.(m\.)?(wikipedia|wikisource|wikibooks)\.org$/i);
    const pfad = decodeURIComponent(u.pathname).match(/^\/wiki\/(.+)$/);
    let res;
    if (m && pfad) res = await frWiki(m[1], m[3], pfad[1].replace(/_/g, ' ').split('#')[0]);
    else res = await frSeite(u);
    warten.weg();
    if (!res.text || res.text.split(/\s+/).length < 25) {
      toast('Auf dieser Seite steckt kaum Fließtext – kopiere ihn lieber und füge ihn ein.', 5000);
      return;
    }
    frAnlegen(res.name || u.hostname, res.text, u.hostname);
  } catch (e) {
    warten.weg();
    console.warn(e);
    toast((e && e.message ? e.message : 'Die Seite war nicht erreichbar.') + ' Kopieren und Einfügen geht immer.', 5200);
  }
}
async function frHolen(url) {
  const anfrage = fetch(url).then(r => {
    if (!r.ok) throw new Error('Die Seite antwortet mit Fehler ' + r.status + '.');
    return r.text();
  });
  const uhr = new Promise((_, rej) => setTimeout(() => rej(new Error('Die Seite hat nicht geantwortet.')), 20000));
  return Promise.race([anfrage, uhr]);
}
async function frWiki(sprache, projekt, titel) {
  const q = new URLSearchParams({
    action: 'query', prop: 'extracts', explaintext: '1', exlimit: '1',
    redirects: '1', format: 'json', origin: '*', titles: titel
  });
  const r = await frHolen('https://' + sprache + '.' + projekt + '.org/w/api.php?' + q);
  const seiten = (JSON.parse(r).query || {}).pages || {};
  const seite = Object.values(seiten)[0];
  if (!seite || seite.missing !== undefined) throw new Error('Diesen Artikel gibt es dort nicht.');
  if (!seite.extract) throw new Error('Die Seite enthält keinen Fließtext.');
  const aus = [];
  for (const zeile of seite.extract.split('\n')) {
    const z = zeile.trim();
    if (!z) continue;
    const h = z.match(/^=+\s*(.+?)\s*=+$/);
    if (h) { if (FR_WIKI_STOP.test(h[1])) break; aus.push(h[1]); continue; }
    aus.push(z);
  }
  return { name: seite.title, text: aus.join('\n\n') };
}
async function frSeite(u) {
  const html = await frHolen(u.href);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,iframe,svg,button,figcaption,sup,[aria-hidden=true],[hidden]')
    .forEach(n => n.remove());
  const wurzel = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('[role=main]') || doc.body;
  const kandidaten = [...wurzel.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,dd')];
  const menge = new Set(kandidaten);
  const teile = [];
  for (const el of kandidaten) {
    let p = el.parentElement, drin = false;
    while (p && p !== wurzel) { if (menge.has(p)) { drin = true; break; } p = p.parentElement; }
    if (drin) continue;
    const t = el.textContent.replace(/\s+/g, ' ').trim();
    if (t.length > 2) teile.push(t);
  }
  const name = ((doc.querySelector('h1') || {}).textContent || doc.title || u.hostname).replace(/\s+/g, ' ').trim();
  return { name: name.slice(0, 120), text: teile.join('\n\n') };
}

function frAnlegen(name, text, quelle) {
  const marken = frZerlegen(text);
  const bekannt = FDB.dokumente.find(d => d.name === name && d.worte === marken.length);
  if (bekannt) {
    fAendern(() => { bekannt.text = text; bekannt.zuletzt = Date.now(); });
    frDokLaden(bekannt);
  } else {
    const d = { id: uid(), name: String(name).slice(0, 160), text, wort: 0, worte: marken.length, quelle: quelle || '', zuletzt: Date.now() };
    fAendern(() => FDB.dokumente.push(d));
    frDokLaden(d);
  }
  FStore.sichern(true);
  fTabWechseln('lesen');
}

/* ---------- Lesen ---------- */
function frDokLaden(d) {
  if (!d) return;
  frAnhalten();
  FS.doc = d;
  FS.marken = frZerlegen(d.text);
  FS.i = clamp(d.wort || 0, 0, Math.max(FS.marken.length - 1, 0));
  const summe = FS.marken.reduce((a, t) => a + frFaktor(t, FDB.einstellungen.pausen), 0);
  FS.norm = summe / Math.max(FS.marken.length, 1);
  FS.warmZaehler = 0;
}

function frLesenMalen(v) {
  if (!FS.doc) {
    const letzt = frLetztes();
    v.innerHTML = `<div class="empty" style="margin-top:40px"><strong>Kein Text offen</strong>
      ${letzt ? 'Weiter bei „' + esc(letzt.name) + '“ – oder wähle in der Bibliothek einen anderen.'
        : 'Lade zuerst in der Bibliothek einen Text.'}</div>
      <div style="max-width:320px;margin:16px auto 0">
        ${letzt ? '<button class="btn btn-primary btn-block" data-weiter>Weiterlesen</button>' : ''}
        <button class="btn btn-block" style="margin-top:8px" data-zurbib>Zur Bibliothek</button>
      </div>`;
    const w = $('[data-weiter]', v);
    if (w) w.onclick = () => { frDokLaden(letzt); fViewMalen(); };
    $('[data-zurbib]', v).onclick = () => fTabWechseln('bib');
    return;
  }
  const e = FDB.einstellungen;
  v.innerHTML = `
    <div class="frbuehne" data-buehne>
      <div class="frmarke" data-marke></div>
      <div class="frzeiger">
        <span class="frstrich"></span>
        <div class="frwort" data-wort style="font-size:${e.groesse}px">
          <span class="w-vor" data-vor></span><span class="w-punkt" data-punkt></span><span class="w-nach" data-nach></span>
        </div>
        <span class="frstrich unten"></span>
      </div>
      <div class="frkontext" data-kontext></div>
    </div>

    <div class="frpult">
      <div class="frbahn" data-bahn><i data-fuell></i></div>
      <div class="frreihe">
        <button class="icon-btn frspul" data-zurueck aria-label="Zehn Wörter zurück">${FICON.spulen}</button>
        <button class="frplay" data-play aria-label="Start und Pause">${FS.laeuft ? FICON.halt : FICON.start}</button>
        <button class="icon-btn frspul vor" data-vorwaerts aria-label="Zehn Wörter vor">${FICON.spulen}</button>
        <span class="frtempo">
          <span class="t-kopf"><b class="num" data-tempozahl>${e.tempo}</b><i>Wörter / Min</i>
            <span class="t-warm" data-warm>Aufwärmen</span></span>
          <input type="range" data-tempo min="100" max="1000" step="10" value="${e.tempo}" aria-label="Lesetempo">
        </span>
        <span class="frstand">
          <span class="num" data-stelle></span>
          <span class="s-k">Position</span>
        </span>
      </div>
    </div>`;

  const buehne = $('[data-buehne]', v);
  buehne.onclick = () => (FS.laeuft ? frAnhalten() : frLos());
  $('[data-play]', v).onclick = (ev) => { ev.stopPropagation(); FS.laeuft ? frAnhalten() : frLos(); };
  $('[data-zurueck]', v).onclick = () => frSpringen(-10);
  $('[data-vorwaerts]', v).onclick = () => frSpringen(10);
  const schieber = $('[data-tempo]', v);
  schieber.oninput = () => {
    FDB.einstellungen.tempo = clamp(+schieber.value, 100, 1000);
    $('[data-tempozahl]', v).textContent = FDB.einstellungen.tempo;
    frPultMalen();
  };
  schieber.onchange = () => fAendern();
  frBahnZiehen($('[data-bahn]', v));
  frWortMalen();
  frPultMalen();
  frKontext(!FS.laeuft);
  if (!FS.laeuft) frMarke('Antippen startet');
}

function frWortMalen() {
  const t = FS.marken[FS.i];
  if (!t) return;
  const wort = $('[data-wort]');
  const vor = $('[data-vor]'), punkt = $('[data-punkt]'), nach = $('[data-nach]');
  if (!wort || !vor) return;
  const k = frFixpunkt(t.w);
  vor.textContent = t.w.slice(0, k);
  punkt.textContent = t.w[k] || '';
  nach.textContent = t.w.slice(k + 1);
  wort.style.fontSize = FDB.einstellungen.groesse + 'px';
  /* Die beiden Striche stehen über und unter dem roten Buchstaben – sie
     wandern also mit ihm, während das Wort mittig bleibt. */
  const zeiger = wort.parentElement;
  if (zeiger) {
    const rz = zeiger.getBoundingClientRect();
    const rp = punkt.getBoundingClientRect();
    const x = rp.width ? (rp.left + rp.width / 2 - rz.left) : rz.width / 2;
    zeiger.style.setProperty('--fixx', clamp(x, 0, rz.width).toFixed(1) + 'px');
  }
}

function frPultMalen() {
  const n = FS.marken.length;
  const f = $('[data-fuell]');
  if (f) f.style.width = (FS.i / Math.max(n - 1, 1) * 100) + '%';
  const st = $('[data-stelle]');
  if (st) st.textContent = fmtZahl(FS.i) + ' / ' + fmtZahl(n);
  frBannerMalen();
}
function frKontext(zeigen) {
  const box = $('[data-kontext]');
  if (!box) return;
  if (!zeigen || !FDB.einstellungen.kontext || !FS.marken.length) { box.classList.remove('an'); return; }
  let a = FS.i, b = FS.i;
  while (a > 0 && !FS.marken[a - 1].satz && !FS.marken[a - 1].absatz && FS.i - a < 26) a--;
  while (b < FS.marken.length - 1 && !FS.marken[b].satz && !FS.marken[b].absatz && b - FS.i < 26) b++;
  box.innerHTML = '';
  for (let j = a; j <= b; j++) {
    const el = document.createElement(j === FS.i ? 'b' : 'span');
    el.textContent = FS.marken[j].w + ' ';
    box.appendChild(el);
  }
  box.classList.add('an');
}
function frMarke(text) {
  const m = $('[data-marke]');
  if (!m) return;
  m.textContent = text;
  m.classList.add('an');
  clearTimeout(m._t);
  m._t = setTimeout(() => m.classList.remove('an'), 1700);
}

/* Tempo: die ersten Wörter langsamer, damit das Auge hineinfindet. */
function frTempoJetzt() {
  const e = FDB.einstellungen;
  if (!e.aufwaermen || !FS.laeuft) return e.tempo;
  const p = Math.min(FS.warmZaehler / F_RAMPE, 1);
  return Math.round(e.tempo * (0.6 + 0.4 * p));
}
function frDauer() {
  const t = FS.marken[FS.i];
  return 60000 / frTempoJetzt() * frFaktor(t, FDB.einstellungen.pausen) / FS.norm;
}
function frTakt() {
  if (!FS.laeuft) return;
  frWortMalen(); frPultMalen();
  const w = $('[data-warm]');
  if (w) w.classList.toggle('an', FDB.einstellungen.aufwaermen && FS.warmZaehler < F_RAMPE);
  if (FS.i >= FS.marken.length - 1) { frFertig(); return; }
  /* Erst steht das Wort seine Zeit, dann kommt das nächste – so meint FS.i
     immer genau das, was zu sehen ist. */
  FS.uhr = setTimeout(() => {
    if (!FS.laeuft) return;
    FS.i++; FS.warmZaehler++; FS.sitzungWorte++;
    frTakt();
  }, frDauer());
}
/* Beim Lesen tritt alles zurück: Kopfzeile, Leisten, Striche und Kontext
   gehen langsam in den Grund über, bis nur noch das Wort dasteht. Beim
   Anhalten sind sie sofort wieder da. */
function frVertiefen(an) {
  const f = $('#fr');
  if (f) f.classList.toggle('vertieft', !!an);
}

function frLos() {
  if (FS.laeuft || !FS.marken.length) return;
  if (FS.i >= FS.marken.length - 1) FS.i = 0;
  const kalt = !FS.angehalten || Date.now() - FS.angehalten > 10000;
  FS.laeuft = true; FS.seit = Date.now();
  FS.warmZaehler = kalt ? 0 : F_RAMPE;
  const p = $('[data-play]');
  if (p) p.innerHTML = FICON.halt;
  frKontext(false);
  frVertiefen(true);
  frTakt();
}
function frAnhalten() {
  if (!FS.laeuft) return;
  clearTimeout(FS.uhr);
  FS.laeuft = false;
  FS.angehalten = Date.now();
  FS.sitzungMs += Date.now() - FS.seit;
  const p = $('[data-play]');
  if (p) p.innerHTML = FICON.start;
  const w = $('[data-warm]');
  if (w) w.classList.remove('an');
  frVertiefen(false);
  frKontext(true);
  frPultMalen();
  frMerken();
}
function frFertig() { frAnhalten(); frMarke('Ende erreicht'); frMerken(); }
function frSpringen(n) {
  if (!FS.marken.length) return;
  const lief = FS.laeuft;
  if (lief) clearTimeout(FS.uhr);
  FS.i = clamp(FS.i + n, 0, FS.marken.length - 1);
  frWortMalen(); frPultMalen();
  if (lief) { FS.warmZaehler = Math.max(FS.warmZaehler, F_RAMPE); FS.uhr = setTimeout(frTakt, frDauer()); }
  else frKontext(true);
}
function frSatzSprung(richtung) {
  let i = FS.i;
  if (richtung > 0) { while (i < FS.marken.length - 1 && !(FS.marken[i].satz || FS.marken[i].absatz)) i++; i++; }
  else { i--; while (i > 0 && !(FS.marken[i - 1].satz || FS.marken[i - 1].absatz)) i--; if (i === FS.i) i--; }
  frSpringen(clamp(i, 0, FS.marken.length - 1) - FS.i);
}
function frStelleSetzen(anteil) {
  if (!FS.marken.length) return;
  FS.i = clamp(Math.round(anteil * (FS.marken.length - 1)), 0, FS.marken.length - 1);
  frWortMalen(); frPultMalen();
}

/* Die Bahn folgt dem Finger, wie alles hier. */
function frBahnZiehen(bahn) {
  if (!bahn) return;
  let zieht = false;
  const anteil = ev => {
    const r = bahn.getBoundingClientRect();
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    return clamp(x / Math.max(r.width, 1), 0, 1);
  };
  const start = ev => {
    zieht = true; window.__zieht = true;
    if (FS.laeuft) frAnhalten();
    frStelleSetzen(anteil(ev));
    if (ev.pointerId != null && bahn.setPointerCapture) { try { bahn.setPointerCapture(ev.pointerId); } catch (e) { } }
  };
  const zug = ev => { if (!zieht) return; ev.preventDefault(); frStelleSetzen(anteil(ev)); };
  const los = () => {
    if (!zieht) return;
    zieht = false; window.__zieht = false;
    frKontext(true); frMerken();
  };
  bahn.addEventListener('pointerdown', start);
  bahn.addEventListener('pointermove', zug);
  bahn.addEventListener('pointerup', los);
  bahn.addEventListener('pointercancel', los);
  bahn.addEventListener('touchmove', ev => { if (zieht) ev.preventDefault(); }, { passive: false });
}

/* Stelle und Bilanz wegschreiben – gebündelt, nicht bei jedem Wort. */
let frMerkUhr = null;
function frMerken() {
  if (!FS.doc) return;
  FS.doc.wort = FS.i;
  FS.doc.zuletzt = Date.now();
  clearTimeout(frMerkUhr);
  frMerkUhr = setTimeout(() => {
    if (FS.sitzungWorte > 0) {
      FDB.bilanz.worte += FS.sitzungWorte;
      FDB.bilanz.ms += FS.sitzungMs;
      if (FS.sitzungMs > 4000) FDB.bilanz.proben.push(Math.round(FS.sitzungWorte / (FS.sitzungMs / 60000)));
      if (FDB.bilanz.proben.length > 200) FDB.bilanz.proben = FDB.bilanz.proben.slice(-200);
      FS.sitzungWorte = 0; FS.sitzungMs = 0;
    }
    fAendern();
  }, 400);
}

/* ---------- Bilanz ---------- */
function frBilanzMalen(v) {
  const b = FDB.bilanz;
  const min = Math.round(b.ms / 60000);
  const schnitt = b.ms > 1000 ? Math.round(b.worte / (b.ms / 60000)) : 0;
  const p = b.proben.slice(-40);
  const gelesen = FDB.dokumente.filter(d => d.worte && d.wort / d.worte > 0.98).length;
  v.innerHTML = `
    <div class="section-head" style="padding-top:14px"><h2>Bilanz</h2></div>
    <div class="tiles">
      <div class="tile"><div class="k">Wörter</div><div class="v">${fmtZahl(b.worte)}</div></div>
      <div class="tile"><div class="k">Lesezeit</div><div class="v">${min < 60 ? min + '<small> min</small>' : Math.floor(min / 60) + '<small> h </small>' + (min % 60)}</div></div>
      <div class="tile"><div class="k">ø Tempo</div><div class="v">${schnitt ? fmtZahl(schnitt) + '<small> WpM</small>' : '–'}</div></div>
    </div>
    <div class="section-head" style="margin-top:20px"><h2>Tempoverlauf</h2>
      ${p.length > 1 ? `<span class="eyebrow num">${Math.min.apply(null, p)}–${Math.max.apply(null, p)} WpM</span>` : ''}</div>
    ${p.length > 1 ? frKurve(p) : `<p class="hinweis" style="padding:0">Der Verlauf erscheint nach der ersten Sitzung von mehr als vier Sekunden.</p>`}

    <div class="section-head" style="margin-top:22px"><h2>Texte</h2>
      <span class="eyebrow">${gelesen} von ${FDB.dokumente.length} durch</span></div>
    ${FDB.dokumente.length ? `<div class="list-card">${FDB.dokumente.slice().sort((a, b2) => b2.zuletzt - a.zuletzt).map(d => {
      const pct = d.worte ? Math.round(d.wort / d.worte * 100) : 0;
      return `<div class="rowline">
        <span class="grow"><span class="rn">${esc(d.name)}</span>
          <span class="rm">${fmtZahl(d.worte)} Wörter · zuletzt ${esc(relZeit(d.zuletzt))}</span>
          <span class="frbalken"><i style="width:${pct}%"></i></span></span>
        <span class="frpct num">${pct}<small>%</small></span></div>`;
    }).join('')}</div>` : `<p class="hinweis" style="padding:0">Noch keine Texte in der Bibliothek.</p>`}
    <div style="height:26px"></div>`;
}
function frKurve(p) {
  const mx = Math.max.apply(null, p), mn = Math.min.apply(null, p);
  const spanne = Math.max(mx - mn, 40);
  const pts = p.map((v, i) => (i / (p.length - 1) * 100).toFixed(2) + ',' + (46 - (v - mn) / spanne * 42).toFixed(2)).join(' ');
  return `<div class="frkurve"><svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" y1="48" x2="100" y2="48" stroke="var(--border)" stroke-width=".5"/>
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
  </svg></div>`;
}

/* ---------- Mehr ---------- */
function frMehrMalen(v) {
  const e = FDB.einstellungen;
  const zeichen = FDB.dokumente.reduce((n, d) => n + d.text.length, 0);
  v.innerHTML = `
    <div class="section-head" style="padding-top:14px"><h2>Lesen</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Schriftgröße</span><span class="rm" data-groessewert>${e.groesse} px</span>
        <span class="rm">Gilt für jedes Wort gleich.</span></span></div>
      <div class="rowline" style="padding-top:0"><input type="range" data-groesse min="14" max="72" step="1" value="${e.groesse}" style="width:100%" aria-label="Schriftgröße"></div>
      <div class="rowline"><span class="grow"><span class="rn">Aufwärmen</span><span class="rm">Die ersten 45 Wörter langsamer</span></span>
        <button class="btn btn-sm" data-warm>${e.aufwaermen ? 'An' : 'Aus'}</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Pausen bei Satzzeichen</span><span class="rm">Komma, Punkt und Absatz halten auf</span></span>
        <button class="btn btn-sm" data-pausen>${e.pausen ? 'An' : 'Aus'}</button></div>
      <div class="rowline"><span class="grow"><span class="rn">Kontext beim Anhalten</span><span class="rm">Zeigt den Satz um das Wort</span></span>
        <button class="btn btn-sm" data-kontext>${e.kontext ? 'An' : 'Aus'}</button></div>
    </div>

    ${appDatenHtml(FRORT)}
    <div class="section-head" style="padding-top:14px"><h2>Inhalt</h2></div>
    <div class="list-card">
      <div class="rowline"><span class="grow"><span class="rn">Umfang</span><span class="rm">${pl(FDB.dokumente.length, 'Text', 'Texte')} · ${fmtZahl(Math.round(zeichen / 1000))} Tausend Zeichen</span></span></div>
      <div class="rowline"><span class="grow"><span class="rn">Alles löschen</span><span class="rm">Texte, Lesezeichen und Bilanz</span></span>
        <button class="btn btn-sm btn-danger" data-freset>Zurücksetzen</button></div>
    </div>

    ${huelleEinstellungenHtml()}
    <p class="hinweis" style="padding:16px 0 30px">Mit Tastatur: <b>Leertaste</b> startet und hält an,
      <b>↑ ↓</b> ändern das Tempo, <b>← →</b> springen zehn Wörter, mit <b>Umschalt</b> einen Satz.</p>`;

  const gr = $('[data-groesse]', v);
  gr.oninput = () => {
    FDB.einstellungen.groesse = clamp(+gr.value, 14, 72);
    $('[data-groessewert]', v).textContent = FDB.einstellungen.groesse + ' px';
  };
  gr.onchange = () => { fAendern(); };
  const um = (feld, knopf) => {
    $(knopf, v).onclick = () => { fAendern(() => { FDB.einstellungen[feld] = !FDB.einstellungen[feld]; }); fViewMalen(); };
  };
  um('aufwaermen', '[data-warm]');
  um('kontext', '[data-kontext]');
  $('[data-pausen]', v).onclick = () => {
    fAendern(() => { FDB.einstellungen.pausen = !FDB.einstellungen.pausen; });
    if (FS.marken.length) FS.norm = FS.marken.reduce((a, t) => a + frFaktor(t, FDB.einstellungen.pausen), 0) / FS.marken.length;
    fViewMalen();
  };
  appDatenBinden(FRORT, v, fViewMalen);
  huelleEinstellungenBinden(v, fViewMalen);
  $('[data-freset]', v).onclick = async () => {
    if (!await bestaetigen('Wirklich alles löschen?',
      FDB.dokumente.length + ' Texte samt Lesezeichen und Bilanz werden entfernt.', 'Alles löschen', true)) return;
    frAnhalten();
    FDB = leereFr();
    FS.doc = null; FS.marken = []; FS.i = 0;
    await FStore.sichern(true);
    fTabWechseln('bib');
    toast('Zurückgesetzt.');
  };
}


/* Tastatur – nur, solange der Leser offen ist. */
document.addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if ($('#fr').hidden || fTab !== 'lesen' || !FS.marken.length || Layers.length) return;
  const e2 = FDB.einstellungen;
  switch (e.key) {
    case ' ': e.preventDefault(); FS.laeuft ? frAnhalten() : frLos(); break;
    case 'ArrowUp': e.preventDefault(); fAendern(() => { e2.tempo = Math.min(1000, e2.tempo + 25); }); fViewMalen(); break;
    case 'ArrowDown': e.preventDefault(); fAendern(() => { e2.tempo = Math.max(100, e2.tempo - 25); }); fViewMalen(); break;
    case 'ArrowLeft': e.preventDefault(); e.shiftKey ? frSatzSprung(-1) : frSpringen(-10); break;
    case 'ArrowRight': e.preventDefault(); e.shiftKey ? frSatzSprung(1) : frSpringen(10); break;
  }
});
/* Wandert die Seite in den Hintergrund, läuft nichts weiter. */
document.addEventListener('visibilitychange', () => { if (document.hidden) frAnhalten(); });

