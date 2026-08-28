/* Daten für alle vier Apps in die IndexedDB legen, bevor die Seite lädt. */
const heute = new Date();
const iso = d => new Date(d).toISOString().slice(0, 10);
const tag = n => iso(heute.getTime() + n * 86400000);

const PLAN = 'p1', B1 = 'bl1', B2 = 'bl2';
const SAAT = {
  meta: { modus: 'geraet', handle: null, dateiname: 'leseplan.json' },
  daten: {
    format: 'leseplan', version: 2, erstellt: Date.now(), geaendert: Date.now(),
    einstellungen: { theme: 'dark', akzent: 'messing', einfuehrung: true, aktiverPlanId: PLAN, zielSeiten: 3000 },
    themen: [{ id: 't1', name: 'Erkenntnis' }, { id: 't2', name: 'Sprache' }],
    lesepleane: [{ id: PLAN, name: 'Grundlagen', ord: 0 }, { id: 'p2', name: 'Nebenbei', ord: 1 }],
    bloecke: [{ id: B1, planId: PLAN, name: 'Antike', ord: 0, notiz: 'Anfang' },
              { id: B2, planId: PLAN, name: 'Neuzeit', ord: 1, notiz: '' }],
    buecher: [
      { id: 'b1', blockId: B1, ord: 0, titel: 'Nikomachische Ethik', autor: 'Aristoteles',
        autorGeb: -384, autorGest: -322, autorBio: 'Schüler Platons.', autorEinfluss: ['Platon'],
        jahr: -340, seiten: 380, preis: 14.9, status: 'lese', besitz: 'habe', schwierigkeit: 4,
        beschreibung: 'Über das gute Leben.', kurz: 'Tugend als Mitte.',
        sessions: [{ id: 's1', datum: tag(-3), minuten: 45, von: 1, bis: 30, notiz: 'gut' },
                   { id: 's2', datum: tag(-1), minuten: 30, von: 30, bis: 52, notiz: '' }],
        notizen: [{ id: 'n1', seite: '12', themaId: 't1', artId: null, text: 'Mitte zwischen Extremen.' },
                  { id: 'n2', seite: '40', themaId: 't2', artId: null, text: 'Begriff der Hexis.' }] },
      { id: 'b2', blockId: B1, ord: 1, titel: 'Politeia', autor: 'Platon',
        autorGeb: -428, autorGest: -348, jahr: -375, seiten: 500, status: 'offen', besitz: 'fehlt',
        einkauf: true, preis: 18, beschreibung: 'Der gerechte Staat.', sessions: [], notizen: [] },
      { id: 'b3', blockId: B2, ord: 0, titel: 'Kritik der reinen Vernunft', autor: 'Immanuel Kant',
        autorGeb: 1724, autorGest: 1804, autorEinfluss: ['Hume', 'Leibniz'],
        jahr: 1781, seiten: 900, status: 'gelesen', besitz: 'bibliothek',
        sessions: [{ id: 's3', datum: tag(-10), minuten: 90, von: 1, bis: 60, notiz: '' }],
        notizen: [{ id: 'n3', seite: '3', themaId: 't1', artId: null, text: 'Ding an sich.' }] }
    ]
  },
  'meta-kalender': { modus: 'geraet', handle: null, dateiname: 'kalender.json' },
  'daten-kalender': {
    format: 'mylife-kalender', version: 1, erstellt: Date.now(),
    termine: [
      { id: 'k1', titel: 'Zahnarzt', datum: tag(0), zeit: '09:30', dauer: 60, ort: 'Stadt', notiz: 'Karte mit', farbe: 'accent', wdh: 'keine' },
      { id: 'k2', titel: 'Lauftraining', datum: tag(1), zeit: '18:00', dauer: 45, wdh: 'woechentlich', farbe: 'good' },
      { id: 'k3', titel: 'Geburtstag', datum: tag(-2), wdh: 'jaehrlich', farbe: 'bad' }
    ],
    aufgaben: [
      { id: 'a1', text: 'Umzug', done: false, tage: [
        { id: 'ta1', datum: tag(2), notiz: 'Kisten', done: false,
          taetigkeiten: [{ id: 'h1', text: 'Karton kaufen', done: false }, { id: 'h2', text: 'Packen', done: true }] },
        { id: 'ta2', datum: tag(5), notiz: '', done: false, taetigkeiten: [] } ] },
      { id: 'a2', text: 'Steuer', done: true, tage: [] }
    ]
  },
  'meta-fastreader': { modus: 'geraet', handle: null, dateiname: 'fastreader.json' },
  'daten-fastreader': {
    format: 'mylife-fastreader', version: 1, erstellt: Date.now(),
    einstellungen: { tempo: 400, groesse: 34 },
    dokumente: [
      { id: 'd1', name: 'Kurzer Text', text: 'Ein Satz nach dem anderen läuft an einem festen Punkt vorbei. '.repeat(20), wort: 12, worte: 240, quelle: 'Hand', zuletzt: Date.now() },
      { id: 'd2', name: 'Zweiter Text', text: 'Wort für Wort und Zeile für Zeile. '.repeat(30), wort: 0, worte: 210, quelle: '', zuletzt: Date.now() - 8e7 }
    ],
    bilanz: { worte: 1200, ms: 300000, proben: [320, 355, 401, 380] }
  },
  'meta-minimal': { modus: 'geraet', handle: null, dateiname: 'minimal.json' },
  'daten-minimal': {
    format: 'mylife-minimal', version: 1, erstellt: Date.now(),
    einstellungen: { autosaveSek: 60, ziel: 120 },
    bereiche: ['Wohnen', 'Kueche', 'Kleidung', 'Arbeit', 'Draussen', 'Sonstiges'],
    dinge: [
      { id: 'd1', name: 'Winterjacke', bereich: 'Kleidung', anzahl: 1, rein: tag(-140), weg: 'gekauft', raus: '', wohin: '', notiz: '' },
      { id: 'd2', name: 'Teller', bereich: 'Kueche', anzahl: 6, rein: tag(-420), weg: 'geerbt', raus: '', wohin: '', notiz: 'von der Oma' },
      { id: 'd3', name: 'Schreibtischlampe', bereich: 'Arbeit', anzahl: 1, rein: tag(-38), weg: 'gekauft', raus: '', wohin: '', notiz: '' },
      { id: 'd4', name: 'Kaffeemaschine', bereich: 'Kueche', anzahl: 1, rein: tag(-900), weg: 'gekauft', raus: tag(-30), wohin: 'verschenkt', notiz: '' },
      { id: 'd5', name: 'Zelt', bereich: 'Draussen', anzahl: 1, rein: tag(-260), weg: 'geschenkt', raus: '', wohin: '', notiz: '' },
      /* Der Normalfall: weder Datum noch Herkunft bekannt. */
      { id: 'd6', name: 'Buecherregal', bereich: 'Wohnen', anzahl: 1, rein: '', weg: 'ka', raus: '', wohin: '', notiz: '' }
    ]
  },
  'meta-gsund': { modus: 'geraet', handle: null, dateiname: 'gsund.json' },
  'daten-gsund': {
    format: 'mylife-gsund', version: 1, erstellt: Date.now(),
    karte: { titel: 'Halbmarathon', datum: tag(30), zeit: '10:00', rueckseite: 'Plan: dreimal die Woche.' },
    vergangen: [
      { id: 'v1', titel: 'Zahnarzt', datum: tag(-20), zeit: '08:00', rueckseite: '', abgelegt: Date.now() - 9e8 },
      { id: 'v2', titel: 'Prüfung', datum: tag(-60), zeit: '', rueckseite: 'bestanden', abgelegt: Date.now() - 5e9 }
    ],
    /* Das Puzzle baut sich Bild und Teilung beim ersten Oeffnen selbst. */
    puzzle: {}
  }
};

/* nurMeta: nur den Speicherort setzen, keine Daten – so laufen die Apps in
   ihren leeren Zustand, und der ist es, wo Nullwerte auffallen. */
async function saeen(page, nurMeta) {
  const saat = {};
  for (const [k, v] of Object.entries(SAAT)) if (!nurMeta || k.startsWith('meta')) saat[k] = v;
  await page.evaluate(async (saat) => {
    await new Promise((res, rej) => {
      const r = indexedDB.open('leseplan', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
      r.onsuccess = () => {
        const db = r.result, t = db.transaction('kv', 'readwrite'), st = t.objectStore('kv');
        for (const [k, v] of Object.entries(saat)) st.put(v, k);
        t.oncomplete = () => res(); t.onerror = () => rej(t.error);
      };
      r.onerror = () => rej(r.error);
    });
  }, saat);
}
module.exports = { saeen, SAAT, tag };
