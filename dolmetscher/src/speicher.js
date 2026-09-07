/**
 * Speicher - eine JSON-Datei, sicher geschrieben.
 *
 * Alles, was die Bruecke behalten muss, steht in daten/verlauf.json:
 * die Einstellungen und je Chat der Verlauf. Geschrieben wird verzoegert
 * (aendern) oder sofort (sichern) und immer ueber eine Nebendatei, damit
 * ein Absturz mitten im Schreiben nicht den ganzen Stand frisst.
 */
import fs from 'node:fs';
import path from 'node:path';

const VERZUG = 1500;      /* so lange wird gesammelt, bevor geschrieben wird */

export const LEER = () => ({
  fassung: 1,
  einstellungen: {
    meine: 'de',
    gegenueber: 'ro',
    dienst: '',
    deeplSchluessel: '',
    libreAdresse: '',
    libreSchluessel: ''
  },
  chats: {}
});

/** Ergaenzt fehlende Felder, ohne vorhandene anzufassen. */
export function normalisiere(daten) {
  const heraus = LEER();
  if (!daten || typeof daten !== 'object') return heraus;
  heraus.einstellungen = { ...heraus.einstellungen, ...(daten.einstellungen || {}) };
  const chats = daten.chats && typeof daten.chats === 'object' ? daten.chats : {};
  for (const [jid, chat] of Object.entries(chats)) {
    if (!chat || typeof chat !== 'object') continue;
    heraus.chats[jid] = {
      jid,
      name: chat.name || '',
      uebersetzen: chat.uebersetzen === true,
      gegenueber: chat.gegenueber || '',
      gruppe: chat.gruppe === true,
      zuletzt: Number(chat.zuletzt) || 0,
      ungelesen: Number(chat.ungelesen) || 0,
      nachrichten: Array.isArray(chat.nachrichten) ? chat.nachrichten : []
    };
  }
  return heraus;
}

export function macheSpeicher(ordner, werkzeug = {}) {
  const verzug = werkzeug.verzug == null ? VERZUG : werkzeug.verzug;
  const datei = path.join(ordner, 'verlauf.json');
  fs.mkdirSync(ordner, { recursive: true });

  let daten = LEER();
  let fehler = '';
  if (fs.existsSync(datei)) {
    try {
      daten = normalisiere(JSON.parse(fs.readFileSync(datei, 'utf8')));
    } catch (e) {
      /* Lieber mit leerem Stand weiterlaufen als gar nicht starten - die
         kaputte Datei bleibt daneben liegen, damit nichts verloren geht. */
      fehler = e.message;
      const beiseite = datei + '.kaputt-' + Date.now();
      try { fs.renameSync(datei, beiseite); } catch { /* dann eben nicht */ }
    }
  }

  let uhr = null;
  let schreibt = false;
  let nochmal = false;

  const schreiben = () => {
    if (schreibt) { nochmal = true; return; }
    schreibt = true;
    const neben = datei + '.neu';
    try {
      fs.writeFileSync(neben, JSON.stringify(daten));
      fs.renameSync(neben, datei);
    } finally {
      schreibt = false;
      if (nochmal) { nochmal = false; schreiben(); }
    }
  };

  return {
    daten,
    datei,
    ladefehler: fehler,

    /** Merkt vor: geschrieben wird nach VERZUG, gesammelt. */
    aendern() {
      if (uhr) return;
      uhr = setTimeout(() => { uhr = null; schreiben(); }, verzug);
      if (uhr.unref) uhr.unref();
    },

    /** Schreibt sofort - beim Beenden und nach allem, was zaehlt. */
    sichern() {
      if (uhr) { clearTimeout(uhr); uhr = null; }
      schreiben();
    },

    schliessen() {
      this.sichern();
    }
  };
}
