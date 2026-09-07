/* Dolmetscher - die Oberflaeche.
   Drei Flaechen (Anmelden, Chats, ein Chat), ein offener Strom vom Server.
   Nichts wird hier gerechnet: der Server sagt, was ist, und die Seite malt. */

'use strict';

const $ = (id) => document.getElementById(id);

const SPRACHEN = [
  ['de', 'Deutsch'], ['ro', 'Rumänisch'], ['en', 'Englisch'], ['tr', 'Türkisch'],
  ['ar', 'Arabisch'], ['ru', 'Russisch'], ['uk', 'Ukrainisch'], ['pl', 'Polnisch'],
  ['it', 'Italienisch'], ['es', 'Spanisch'], ['fr', 'Französisch'], ['pt', 'Portugiesisch'],
  ['nl', 'Niederländisch'], ['hu', 'Ungarisch'], ['bg', 'Bulgarisch'], ['sq', 'Albanisch'],
  ['sr', 'Serbisch'], ['hr', 'Kroatisch'], ['el', 'Griechisch'], ['cs', 'Tschechisch']
];
const spracheName = (k) => (SPRACHEN.find(s => s[0] === k) || [k, k])[1];

const stand = {
  zustand: { stand: 'aus' },
  chats: [],
  einstellungen: {},
  offen: '',
  verlauf: [],
  aufgeklappt: new Set()
};

/* --- Kleinkram ------------------------------------------------------ */

async function holen(weg, daten) {
  const optionen = daten
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(daten) }
    : {};
  const antwort = await fetch(weg, optionen);
  const wert = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw new Error(wert.fehler || ('Fehler ' + antwort.status));
  return wert;
}

let toastUhr = null;
function toast(text) {
  const k = $('toast');
  k.textContent = text;
  k.hidden = false;
  clearTimeout(toastUhr);
  toastUhr = setTimeout(() => { k.hidden = true; }, 3200);
}

const uhrzeit = (ms) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const datum = (ms) => new Date(ms).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

function flaeche(welche) {
  for (const name of ['anmelden', 'liste', 'chat']) $(name).hidden = (name !== welche);
}

/* --- Anmelden ------------------------------------------------------- */

const STANDTEXT = {
  aus: 'nicht verknüpft',
  verbindet: 'verbindet …',
  'offen-fuer-kopplung': 'bereit zum Verknüpfen',
  qr: 'wartet auf den QR-Code',
  kopplung: 'wartet auf den Code in WhatsApp',
  offen: 'verbunden'
};

function malenZustand() {
  const z = stand.zustand;
  $('anmeldeStand').textContent = (STANDTEXT[z.stand] || z.stand) + (z.grund ? ' – ' + z.grund : '');

  if (z.stand === 'offen') {
    $('ichBin').textContent = z.ich ? (z.ich.name ? z.ich.name + ' · ' : '') + (z.ich.jid || '').split('@')[0] : '';
    if ($('anmelden').hidden === false) flaeche('liste');
    return;
  }
  if (z.code) { $('codeFeld').textContent = z.code; $('codeFeld').hidden = false; $('codeHinweis').hidden = false; }
  if (z.qr) qrHolen();
  if (!$('chat').hidden || !$('liste').hidden) flaeche('anmelden');
}

async function qrHolen() {
  try {
    const antwort = await fetch('/api/qr');
    if (!antwort.ok) return;
    $('qrBild').innerHTML = await antwort.text();
    $('qrKarte').open = true;
  } catch { /* dann eben kein Bild */ }
}

$('codeHolen').addEventListener('click', async () => {
  const knopf = $('codeHolen');
  const fehler = $('kopplungFehler');
  fehler.hidden = true;
  knopf.disabled = true;
  knopf.textContent = 'Code wird geholt …';
  try {
    const { code } = await holen('/api/koppeln', { nummer: $('nummer').value });
    $('codeFeld').textContent = code;
    $('codeFeld').hidden = false;
    $('codeHinweis').hidden = false;
  } catch (e) {
    fehler.textContent = e.message;
    fehler.hidden = false;
  } finally {
    knopf.disabled = false;
    knopf.textContent = 'Code anfordern';
  }
});

/* --- Chatliste ------------------------------------------------------ */

function malenListe() {
  const wo = $('chatliste');
  wo.textContent = '';
  if (!stand.chats.length) {
    const leer = document.createElement('div');
    leer.className = 'leerlauf';
    leer.textContent = 'Noch keine Chats. Sie erscheinen, sobald eine Nachricht kommt oder du eine schreibst.';
    wo.append(leer);
    return;
  }
  for (const chat of stand.chats) {
    const zeile = document.createElement('div');
    zeile.className = 'zeile';

    const mitte = document.createElement('div');
    mitte.className = 'mitteText';

    const name = document.createElement('div');
    name.className = 'name';
    const b = document.createElement('b');
    b.textContent = chat.name;
    name.append(b);
    if (chat.uebersetzen) {
      const marke = document.createElement('span');
      marke.className = 'marke an';
      marke.textContent = stand.einstellungen.meine + ' → ' + chat.gegenueber;
      name.append(marke);
    }
    const vorschau = document.createElement('div');
    vorschau.className = 'vorschau';
    vorschau.textContent = chat.vorschau || 'noch nichts';
    mitte.append(name, vorschau);
    zeile.append(mitte);

    if (chat.ungelesen) {
      const zahl = document.createElement('div');
      zahl.className = 'zahl';
      zahl.textContent = chat.ungelesen > 99 ? '99+' : String(chat.ungelesen);
      zeile.append(zahl);
    }
    zeile.addEventListener('click', () => chatOeffnen(chat.jid));
    wo.append(zeile);
  }
}

/* --- Ein Chat ------------------------------------------------------- */

const chatVon = (jid) => stand.chats.find(c => c.jid === jid);

async function chatOeffnen(jid) {
  stand.offen = jid;
  stand.aufgeklappt.clear();
  const { chat, nachrichten } = await holen('/api/verlauf?jid=' + encodeURIComponent(jid));
  stand.verlauf = nachrichten || [];
  if (chat) {
    const alt = stand.chats.findIndex(c => c.jid === jid);
    if (alt >= 0) stand.chats[alt] = chat; else stand.chats.unshift(chat);
  }
  flaeche('chat');
  malenChatkopf();
  malenVerlauf(true);
  $('vorschauZeile').hidden = true;
  holen('/api/gelesen', { jid }).catch(() => {});
}

function malenChatkopf() {
  const chat = chatVon(stand.offen);
  if (!chat) return;
  $('chatName').textContent = chat.name;
  $('chatUnter').textContent = chat.uebersetzen
    ? 'du schreibst ' + spracheName(stand.einstellungen.meine) + ', es geht als ' + spracheName(chat.gegenueber) + ' raus'
    : 'Übersetzen aus – es geht raus, wie du tippst';
}

/** Eine Blase. Ein Tipp darauf klappt das Original auf. */
function blase(n) {
  const el = document.createElement('div');
  el.className = 'blase' + (n.vonMir ? ' meine' : '');
  el.dataset.id = n.id;

  const text = document.createElement('div');
  if (n.art !== 'text' && !n.text) {
    text.textContent = '[' + n.art + ']';
    text.style.color = 'var(--leise)';
  } else {
    text.textContent = n.text;
  }
  el.append(text);

  const fuss = document.createElement('div');
  fuss.className = 'fuss';
  const zeit = document.createElement('span');
  zeit.textContent = uhrzeit(n.zeit);
  fuss.append(zeit);

  if (n.wartet) {
    const w = document.createElement('span');
    w.className = 'wartet';
    w.textContent = 'wird übersetzt …';
    fuss.append(w);
  } else if (n.fehler) {
    const f = document.createElement('span');
    f.className = 'fehlerZeile';
    f.textContent = 'nicht übersetzt: ' + n.fehler;
    fuss.append(f);
  } else if (n.uebersetzt) {
    const m = document.createElement('span');
    m.textContent = n.vonMir
      ? (stand.einstellungen.meine + ' → ' + (n.zielSprache || chatVon(stand.offen)?.gegenueber || ''))
      : ((n.sprache || '?') + ' → ' + stand.einstellungen.meine);
    fuss.append(m);
    const tipp = document.createElement('span');
    tipp.textContent = '· tippen für das Original';
    fuss.append(tipp);
  }
  el.append(fuss);

  if (stand.aufgeklappt.has(n.id) && n.fremd && n.fremd !== n.text) {
    const original = document.createElement('div');
    original.className = 'original';
    original.textContent = n.fremd;
    el.append(original);
  }

  el.addEventListener('click', () => {
    if (!n.fremd || n.fremd === n.text) { toast('Diese Nachricht wurde nicht übersetzt.'); return; }
    if (stand.aufgeklappt.has(n.id)) stand.aufgeklappt.delete(n.id);
    else stand.aufgeklappt.add(n.id);
    malenVerlauf(false);
  });
  return el;
}

function malenVerlauf(nachUnten) {
  const wo = $('verlauf');
  const warUnten = wo.scrollHeight - wo.scrollTop - wo.clientHeight < 80;
  wo.textContent = '';
  let letzterTag = '';
  for (const n of stand.verlauf) {
    const tag = datum(n.zeit);
    if (tag !== letzterTag) {
      letzterTag = tag;
      const marke = document.createElement('div');
      marke.className = 'tag';
      marke.textContent = tag;
      wo.append(marke);
    }
    wo.append(blase(n));
  }
  if (nachUnten || warUnten) wo.scrollTop = wo.scrollHeight;
}

/* --- Senden --------------------------------------------------------- */

async function senden() {
  const feld = $('text');
  const text = feld.value.trim();
  if (!text || !stand.offen) return;
  const knopf = $('senden');
  knopf.disabled = true;
  try {
    await holen('/api/senden', { jid: stand.offen, text });
    feld.value = '';
    feld.style.height = 'auto';
    $('vorschauZeile').hidden = true;
  } catch (e) {
    toast('Nicht gesendet: ' + e.message);
  } finally {
    knopf.disabled = false;
  }
}

$('senden').addEventListener('click', senden);
$('zurueck').addEventListener('click', () => { stand.offen = ''; flaeche('liste'); malenListe(); });

$('text').addEventListener('input', (e) => {
  const feld = e.target;
  feld.style.height = 'auto';
  feld.style.height = Math.min(feld.scrollHeight, window.innerHeight * 0.4) + 'px';
});
$('text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); senden(); }
});

$('vorschauKnopf').addEventListener('click', async () => {
  const text = $('text').value.trim();
  if (!text || !stand.offen) return;
  const zeile = $('vorschauZeile');
  zeile.textContent = 'einen Moment …';
  zeile.hidden = false;
  try {
    const v = await holen('/api/vorschau', { jid: stand.offen, text });
    zeile.textContent = v.uebersetzt ? 'So geht es raus (' + spracheName(v.ziel) + '): ' + v.text
      : 'Es geht unverändert raus.';
  } catch (e) {
    zeile.textContent = 'Vorschau ging nicht: ' + e.message;
  }
});

/* --- Blaetter ------------------------------------------------------- */

function blattZu() { $('blatt').hidden = true; $('blattInhalt').textContent = ''; }
$('blatt').addEventListener('click', (e) => { if (e.target === $('blatt')) blattZu(); });

function blattAuf(bauen) {
  const inhalt = $('blattInhalt');
  inhalt.textContent = '';
  bauen(inhalt);
  $('blatt').hidden = false;
}

function spracheWahl(wert) {
  const auswahl = document.createElement('select');
  for (const [k, name] of SPRACHEN) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = name;
    if (k === wert) o.selected = true;
    auswahl.append(o);
  }
  return auswahl;
}

function feldMit(beschriftung, element) {
  const label = document.createElement('label');
  label.className = 'feld';
  const s = document.createElement('span');
  s.textContent = beschriftung;
  label.append(s, element);
  return label;
}

$('chatMehr').addEventListener('click', () => {
  const chat = chatVon(stand.offen);
  if (!chat) return;
  blattAuf((wo) => {
    const h = document.createElement('h2');
    h.textContent = chat.name;
    wo.append(h);

    const schalter = document.createElement('div');
    schalter.className = 'schalter';
    const beschriftung = document.createElement('div');
    beschriftung.innerHTML = '<b>Übersetzen</b><div class="klein">Was du tippst, geht in der Sprache des Gegenübers raus.</div>';
    const haken = document.createElement('input');
    haken.type = 'checkbox';
    haken.checked = chat.uebersetzen;
    schalter.append(beschriftung, haken);
    wo.append(schalter);

    const sprache = spracheWahl(chat.gegenueber);
    wo.append(feldMit('Sprache des Gegenübers', sprache));

    const name = document.createElement('input');
    name.type = 'text';
    name.value = chat.name;
    wo.append(feldMit('Name in dieser Liste', name));

    const reihe = document.createElement('div');
    reihe.className = 'reihe';
    const abbrechen = document.createElement('button');
    abbrechen.className = 'knopf';
    abbrechen.textContent = 'Zurück';
    abbrechen.addEventListener('click', blattZu);
    const sichern = document.createElement('button');
    sichern.className = 'knopf gross';
    sichern.textContent = 'Übernehmen';
    sichern.addEventListener('click', async () => {
      try {
        const neu = await holen('/api/chat', {
          jid: chat.jid,
          uebersetzen: haken.checked,
          gegenueber: sprache.value,
          name: name.value
        });
        const i = stand.chats.findIndex(c => c.jid === neu.jid);
        if (i >= 0) stand.chats[i] = neu;
        malenChatkopf();
        malenListe();
        blattZu();
      } catch (e) { toast(e.message); }
    });
    reihe.append(abbrechen, sichern);
    wo.append(reihe);
  });
});

$('zuEinstellungen').addEventListener('click', () => {
  const e = stand.einstellungen;
  blattAuf((wo) => {
    const h = document.createElement('h2');
    h.textContent = 'Einstellungen';
    wo.append(h);

    const meine = spracheWahl(e.meine);
    wo.append(feldMit('Meine Sprache – so siehst du alles', meine));
    const gegen = spracheWahl(e.gegenueber);
    wo.append(feldMit('Voreinstellung für neue Chats', gegen));

    const dienst = document.createElement('select');
    for (const [k, name] of [['', 'automatisch'], ['google', 'Google (ohne Schlüssel)'], ['deepl', 'DeepL'], ['libre', 'LibreTranslate']]) {
      const o = document.createElement('option');
      o.value = k; o.textContent = name;
      if (k === (e.dienst || '')) o.selected = true;
      dienst.append(o);
    }
    wo.append(feldMit('Übersetzungsdienst', dienst));

    const deepl = document.createElement('input');
    deepl.type = 'password';
    deepl.value = e.deeplSchluessel || '';
    deepl.placeholder = 'nur nötig für DeepL';
    wo.append(feldMit('DeepL-Schlüssel', deepl));

    const libre = document.createElement('input');
    libre.type = 'url';
    libre.value = e.libreAdresse || '';
    libre.placeholder = 'https://…';
    wo.append(feldMit('LibreTranslate-Adresse', libre));

    const schalter = document.createElement('div');
    schalter.className = 'schalter';
    const beschriftung = document.createElement('div');
    beschriftung.innerHTML = '<b>Nur markierte Chats übersetzen</b><div class="klein">Sonst wird alles Eingehende in deine Sprache gebracht.</div>';
    const haken = document.createElement('input');
    haken.type = 'checkbox';
    haken.checked = !!e.nurMarkierte;
    schalter.append(beschriftung, haken);
    wo.append(schalter);

    const reihe = document.createElement('div');
    reihe.className = 'reihe';
    const abmelden = document.createElement('button');
    abmelden.className = 'knopf';
    abmelden.textContent = 'Abmelden';
    abmelden.addEventListener('click', async () => {
      if (!confirm('WhatsApp wirklich trennen? Danach muss neu verknüpft werden.')) return;
      await holen('/api/abmelden', {});
      blattZu();
    });
    const sichern = document.createElement('button');
    sichern.className = 'knopf gross';
    sichern.textContent = 'Übernehmen';
    sichern.addEventListener('click', async () => {
      try {
        stand.einstellungen = await holen('/api/einstellungen', {
          meine: meine.value,
          gegenueber: gegen.value,
          dienst: dienst.value,
          deeplSchluessel: deepl.value,
          libreAdresse: libre.value,
          nurMarkierte: haken.checked
        });
        malenListe();
        blattZu();
        toast('Übernommen.');
      } catch (er) { toast(er.message); }
    });
    reihe.append(abmelden, sichern);
    wo.append(reihe);
  });
});

/* --- Der Strom vom Server ------------------------------------------- */

function strom() {
  const quelle = new EventSource('/api/strom');
  quelle.onmessage = (e) => {
    let nachricht;
    try { nachricht = JSON.parse(e.data); } catch { return; }
    const { art, inhalt } = nachricht;

    if (art === 'zustand') { stand.zustand = inhalt; malenZustand(); return; }
    if (art === 'einstellungen') { stand.einstellungen = inhalt; malenListe(); malenChatkopf(); return; }

    if (art === 'chat') {
      const i = stand.chats.findIndex(c => c.jid === inhalt.jid);
      if (i >= 0) stand.chats[i] = inhalt; else stand.chats.push(inhalt);
      stand.chats.sort((a, b) => b.zuletzt - a.zuletzt);
      if (stand.offen === inhalt.jid) malenChatkopf();
      if ($('liste').hidden === false) malenListe();
      return;
    }

    if (art === 'nachricht') {
      if (inhalt.jid !== stand.offen) return;
      const i = stand.verlauf.findIndex(n => n.id === inhalt.nachricht.id);
      if (i >= 0) stand.verlauf[i] = inhalt.nachricht;
      else stand.verlauf.push(inhalt.nachricht);
      malenVerlauf(false);
      holen('/api/gelesen', { jid: inhalt.jid }).catch(() => {});
    }
  };
  quelle.onerror = () => { /* der Browser versucht es von selbst wieder */ };
}

/* --- Los ------------------------------------------------------------ */

(async function start() {
  try {
    const alles = await holen('/api/stand');
    stand.zustand = alles.zustand;
    stand.chats = alles.chats;
    stand.einstellungen = alles.einstellungen;
  } catch (e) {
    toast('Server antwortet nicht: ' + e.message);
  }
  malenZustand();
  malenListe();
  strom();
}());
