/* ============================================================
   Datenmodell
   ============================================================ */
const ART_FARBEN = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
const STD_ARTEN = ['Zitat', 'Gedanke', 'Frage', 'Widerspruch', 'Begriff', 'Querverweis', 'Aufgabe'];
const STATUS = { offen: 'Offen', lese: 'Lese ich', gelesen: 'Gelesen' };
/* Besitz: getrennt vom Lesestatus – man kann ein Buch haben, ohne es zu lesen. */
const BESITZ = {
  fehlt: { name: 'Fehlt', kurz: 'fehlt', farbe: 'var(--text-3)' },
  bestellt: { name: 'Bestellt', kurz: 'bestellt', farbe: 'var(--s4)' },
  habe: { name: 'Habe ich', kurz: '', farbe: 'var(--good)' },
  bibliothek: { name: 'Bibliothek', kurz: 'Bibliothek', farbe: 'var(--s1)' }
};

function leereDb() {
  return {
    format: 'leseplan',
    version: 2,
    erstellt: Date.now(),
    geaendert: Date.now(),
    einstellungen: { theme: 'dark', akzent: 'messing', vollbildStart: true, zielSeiten: null, einfuehrung: false, weckerMin: 45, timerFragen: true, autosaveSek: 60, aktiverPlanId: null },
    arten: STD_ARTEN.map((n, i) => ({ id: uid(), name: n, farbe: ART_FARBEN[i % 8] })),
    themen: [],
    lesepleane: [],
    bloecke: [],
    buecher: [],
    /* Der angefangene Stöber-Durchgang, damit man ihn später fortsetzen kann. */
    stoebern: null
  };
}

/* Ein Buch kann mehrere Autoren haben. Jeder trägt eigene Lebensdaten,
   Biographie und Einflüsse; b.autor bleibt die Anzeigezeile. */
function normAutoren(b) {
  const roh = Array.isArray(b.autoren) ? b.autoren : null;
  if (roh && roh.length) {
    const l = roh.map(a => ({
      name: String((a && a.name) || '').trim(),
      geb: a && a.geb != null ? a.geb : null,
      gest: a && a.gest != null ? a.gest : null,
      bio: (a && a.bio) || '',
      einfluss: Array.isArray(a && a.einfluss) ? a.einfluss.map(x => String(x).trim()).filter(Boolean) : []
    })).filter(a => a.name);
    if (l.length) return l;
  }
  const name = String(b.autor || '').trim();
  if (!name) return [];
  return [{
    name,
    geb: b.autorGeb == null ? null : b.autorGeb,
    gest: b.autorGest == null ? null : b.autorGest,
    bio: b.autorBio || '',
    einfluss: Array.isArray(b.autorEinfluss) ? b.autorEinfluss.map(x => String(x).trim()).filter(Boolean) : []
  }];
}
/* Freitext in Namen zerlegen – nur wenn keine Klammer im Spiel ist. */
function autorenAusText(text, alt) {
  const t = String(text || '').trim();
  if (!t) return [];
  const teile = /[()]/.test(t) ? [t] : t.split(/\s*,\s*|\s+und\s+/).map(x => x.trim()).filter(Boolean);
  return teile.map(n => (alt || []).find(a => a.name === n) || { name: n, geb: null, gest: null, bio: '', einfluss: [] });
}
const buchAutoren = b => (b.autoren && b.autoren.length) ? b.autoren : normAutoren(b);

/* Notiz-Seiten dürfen Text sein ("35-36"); zum Sortieren zählt die erste Zahl. */
function seiteZahl(s) {
  if (s == null || s === '') return Infinity;
  const m = String(s).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : Infinity;
}
function seiteText(s) { return (s == null || s === '') ? '' : String(s); }

/* Fehlende Felder ergänzen, damit auch fremde oder ältere Dateien laufen. */
function normalisiere(raw) {
  const d = Object.assign(leereDb(), raw || {});
  d.einstellungen = Object.assign(
    { theme: 'dark', akzent: 'messing', vollbildStart: true, zielSeiten: null, einfuehrung: false, weckerMin: 45, timerFragen: true, autosaveSek: 60, aktiverPlanId: null },
    raw && raw.einstellungen);
  d.arten = (Array.isArray(d.arten) ? d.arten : []).map((a, i) => ({
    id: a.id || uid(), name: String(a.name || 'Art'), farbe: a.farbe || ART_FARBEN[i % 8]
  }));
  if (!d.arten.length) d.arten = leereDb().arten;
  d.themen = (Array.isArray(d.themen) ? d.themen : []).map(t =>
    typeof t === 'string' ? { id: uid(), name: t } : { id: t.id || uid(), name: String(t.name || '') }
  ).filter(t => t.name);
  d.lesepleane = (Array.isArray(d.lesepleane) ? d.lesepleane : []).map((p, i) => ({
    id: p.id || uid(), name: String(p.name || 'leseliste'), ord: p.ord != null ? p.ord : i
  }));
  d.bloecke = (Array.isArray(d.bloecke) ? d.bloecke : []).map((b, i) => ({
    id: b.id || uid(), planId: b.planId || null, name: String(b.name || 'Block'),
    ord: b.ord != null ? b.ord : i, notiz: b.notiz || ''
  }));
  /* Ältere Dateien kannten noch keine Lesepläne: alles wandert in einen. */
  if (!d.lesepleane.length && d.bloecke.length) {
    d.lesepleane = [{ id: uid(), name: 'Lesestart', ord: 0 }];
  }
  const ersterPlan = d.lesepleane[0];
  const planIds = new Set(d.lesepleane.map(p => p.id));
  d.bloecke.forEach(b => { if (!b.planId || !planIds.has(b.planId)) b.planId = ersterPlan ? ersterPlan.id : null; });
  if (!d.einstellungen.aktiverPlanId || !planIds.has(d.einstellungen.aktiverPlanId)) {
    d.einstellungen.aktiverPlanId = ersterPlan ? ersterPlan.id : null;
  }
  d.stoebern = (raw && raw.stoebern && Array.isArray(raw.stoebern.werke) && raw.stoebern.werke.length)
    ? raw.stoebern : null;
  d.buecher = (Array.isArray(d.buecher) ? d.buecher : []).map((b, i) => ({
    id: b.id || uid(),
    blockId: b.blockId || (d.bloecke[0] && d.bloecke[0].id) || null,
    ord: b.ord != null ? b.ord : i,
    titel: String(b.titel || 'Ohne Titel'),
    autor: String(b.autor || ''),
    autorGeb: b.autorGeb == null ? null : b.autorGeb,
    autorGest: b.autorGest == null ? null : b.autorGest,
    autorBio: b.autorBio || '',
    autorEinfluss: Array.isArray(b.autorEinfluss) ? b.autorEinfluss.map(x => String(x).trim()).filter(Boolean) : [],
    autoren: normAutoren(b),
    schwierigkeit: (b.schwierigkeit >= 1 && b.schwierigkeit <= 5) ? +b.schwierigkeit : null,
    jahr: b.jahr == null ? null : b.jahr,
    seiten: b.seiten == null ? null : b.seiten,
    seitenUnsicher: !!b.seitenUnsicher,
    ausgabe: b.ausgabe || '',
    link: String(b.link || b.doi || b.url || '').trim(),
    beschreibung: b.beschreibung || '',
    kurz: b.kurz || '',
    preis: b.preis == null ? null : b.preis,
    status: STATUS[b.status] ? b.status : 'offen',
    besitz: BESITZ[b.besitz] ? b.besitz : 'fehlt',
    einkauf: !!b.einkauf,
    sessions: (b.sessions || []).map(s => ({
      id: s.id || uid(), datum: s.datum || heute(), minuten: +s.minuten || 0,
      von: s.von == null ? null : s.von, bis: s.bis == null ? null : s.bis, notiz: s.notiz || ''
    })),
    notizen: (b.notizen || []).map(n => ({
      id: n.id || uid(), seite: (n.seite == null || n.seite === '') ? null : String(n.seite).trim(),
      themaId: n.themaId || null, artId: n.artId || null,
      text: n.text || '', bilder: (n.bilder || []).map(x => typeof x === 'string' ? { id: uid(), src: x, ts: Date.now() } : { id: x.id || uid(), src: x.src, ts: x.ts || Date.now() }).filter(x => x.src),
      erstellt: n.erstellt || Date.now(), geaendert: n.geaendert || Date.now()
    }))
  }));
  return d;
}

let DB = leereDb();

/* --- Zugriffe --- */
const plaeneSortiert = () => DB.lesepleane.slice().sort((a, b) => a.ord - b.ord);
const aktiverPlan = () => DB.lesepleane.find(p => p.id === DB.einstellungen.aktiverPlanId) || plaeneSortiert()[0] || null;
const bloeckeVonPlan = id => DB.bloecke.filter(b => b.planId === id).sort((a, b) => a.ord - b.ord);
const alleBloeckeSortiert = () => DB.bloecke.slice().sort((a, b) => a.ord - b.ord);
/* Ohne Angabe immer der Leseplan, in dem gerade gearbeitet wird. */
const bloeckeSortiert = () => { const p = aktiverPlan(); return p ? bloeckeVonPlan(p.id) : []; };
const buecherImPlan = id => {
  const ids = new Set(DB.bloecke.filter(b => b.planId === id).map(b => b.id));
  return DB.buecher.filter(b => ids.has(b.blockId));
};
const buecherAktiv = () => { const p = aktiverPlan(); return p ? buecherImPlan(p.id) : DB.buecher; };
/* Alle Bücher in der Reihenfolge der Listen, Blöcke und Plätze. */
function buecherNachPlan() {
  const out = [];
  plaeneSortiert().forEach(p => bloeckeVonPlan(p.id).forEach(bl => buecherIn(bl.id).forEach(b => out.push(b))));
  DB.buecher.forEach(b => { if (!out.includes(b)) out.push(b); });
  return out;
}
const buecherIn = id => DB.buecher.filter(b => b.blockId === id).sort((a, b) => a.ord - b.ord);
const buchById = id => DB.buecher.find(b => b.id === id);
const blockById = id => DB.bloecke.find(b => b.id === id);
const artById = id => DB.arten.find(a => a.id === id);
const themaById = id => DB.themen.find(t => t.id === id);
const artFarbe = id => { const a = artById(id); return a ? 'var(--' + a.farbe + ')' : 'var(--text-3)'; };
const artName = id => { const a = artById(id); return a ? a.name : 'Ohne Art'; };
const themaName = id => { const t = themaById(id); return t ? t.name : 'Ohne Themenfeld'; };

function themaFindenOderAnlegen(name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const vorhanden = DB.themen.find(t => t.name.toLowerCase() === n.toLowerCase());
  if (vorhanden) return vorhanden.id;
  const t = { id: uid(), name: n };
  DB.themen.push(t);
  return t.id;
}
function buchMinuten(b) { return b.sessions.reduce((s, x) => s + (+x.minuten || 0), 0); }
function buchSeitenGelesen(b) {
  return b.sessions.reduce((s, x) => (x.von != null && x.bis != null && x.bis > x.von) ? s + (x.bis - x.von) : s, 0);
}
function buchTempo(b) { const m = buchMinuten(b), s = buchSeitenGelesen(b); return (m > 5 && s > 0) ? s / (m / 60) : null; }
/* Was an einem Tag gelesen wurde – aus den Sitzungen. */
function tagStatistik(datum) {
  let seiten = 0, minuten = 0;
  const buecher = new Set();
  DB.buecher.forEach(b => b.sessions.forEach(x => {
    if (x.datum !== datum) return;
    minuten += +x.minuten || 0;
    if (x.von != null && x.bis != null && x.bis > x.von) seiten += x.bis - x.von;
    buecher.add(b.id);
  }));
  return { datum, seiten, minuten, buecher: buecher.size };
}
/* Alle Tage mit Sitzungen, neueste zuerst. */
function tageMitSitzungen() {
  const tage = new Set();
  DB.buecher.forEach(b => b.sessions.forEach(x => tage.add(x.datum)));
  return Array.from(tage).sort().reverse().map(tagStatistik);
}
function zielHeute() {
  const ziel = +DB.einstellungen.zielSeiten || 0;
  const t = tagStatistik(heute());
  return { ziel, gelesen: t.seiten, minuten: t.minuten, geschafft: ziel > 0 && t.seiten >= ziel };
}

function alleNotizen() {
  const out = [];
  DB.buecher.forEach(b => b.notizen.forEach(n => out.push({ buch: b, notiz: n })));
  return out;
}

