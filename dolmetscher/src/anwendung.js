/**
 * Die Anwendung - alle Teile zusammengesteckt und ein HTTP-Server darum.
 *
 * Hier steht kein Baileys und kein fetch: die Verbindung zu WhatsApp und der
 * Weg ins Netz kommen als Fabrik herein. Im Betrieb sind das die echten, beim
 * Pruefen Attrappen - so laesst sich der ganze Ablauf ohne Handy durchspielen.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import QRCode from 'qrcode';

import { macheSpeicher } from './speicher.js';
import { macheUebersetzer } from './uebersetzen.js';
import { macheKern } from './kern.js';

const ARTEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

function schicken(antwort, nummer, inhalt, art = 'application/json; charset=utf-8') {
  antwort.writeHead(nummer, {
    'content-type': art,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  antwort.end(inhalt);
}
const jsonRaus = (antwort, wert, nummer = 200) => schicken(antwort, nummer, JSON.stringify(wert));

async function koerper(anfrage) {
  const teile = [];
  let laenge = 0;
  for await (const stueck of anfrage) {
    laenge += stueck.length;
    if (laenge > 256 * 1024) throw new Error('Zu viel auf einmal');
    teile.push(stueck);
  }
  if (!teile.length) return {};
  try { return JSON.parse(Buffer.concat(teile).toString('utf8')); } catch { throw new Error('Kein gueltiges JSON'); }
}

/**
 * @param opt.datenOrdner   wohin Verlauf und Anmeldung kommen
 * @param opt.webOrdner     wo die Oberflaeche liegt
 * @param opt.waFabrik      ({ ordner, melden }) => Verbindung
 * @param opt.holen         optional: ersetzt fetch beim Uebersetzen
 * @param opt.schluessel    '' = jeder darf, sonst noetig
 * @param opt.speicherVerzug  nur zum Pruefen
 */
export function macheAnwendung(opt) {
  const datenOrdner = opt.datenOrdner;
  const webOrdner = opt.webOrdner;
  const schluessel = opt.schluessel || '';

  const speicher = macheSpeicher(datenOrdner, { verzug: opt.speicherVerzug });
  const uebersetzer = macheUebersetzer(speicher.daten.einstellungen, { holen: opt.holen });

  const hoerer = new Set();
  const melden = (art, inhalt) => {
    const zeile = 'data: ' + JSON.stringify({ art, inhalt }) + '\n\n';
    for (const antwort of hoerer) {
      try { antwort.write(zeile); } catch { hoerer.delete(antwort); }
    }
  };

  const kern = macheKern({ uebersetzer, speicher, melden });
  const wa = opt.waFabrik({
    ordner: path.join(datenOrdner, 'anmeldung'),
    melden: (art, inhalt) => kern.aufnehmen(art, inhalt),
    holeNachricht: async () => undefined
  });
  kern.anschliessen(wa);

  const darfHerein = (anfrage, adresse) => {
    if (!schluessel) return true;
    if (adresse.searchParams.get('schluessel') === schluessel) return true;
    return (anfrage.headers.cookie || '').split(';').some(k => k.trim() === 'schluessel=' + schluessel);
  };

  const server = http.createServer(async (anfrage, antwort) => {
    const adresse = new URL(anfrage.url, 'http://x');
    const weg = adresse.pathname;

    if (!darfHerein(anfrage, adresse)) {
      return schicken(antwort, 401, 'Schluessel fehlt. Adresse mit ?schluessel=... aufrufen.\n', 'text/plain; charset=utf-8');
    }
    if (schluessel && adresse.searchParams.get('schluessel') === schluessel) {
      antwort.setHeader('set-cookie', 'schluessel=' + schluessel + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000');
    }

    try {
      if (weg === '/api/strom') {
        antwort.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-store',
          'connection': 'keep-alive'
        });
        antwort.write('retry: 2000\n\n');
        antwort.write('data: ' + JSON.stringify({ art: 'zustand', inhalt: wa.zustand() }) + '\n\n');
        hoerer.add(antwort);
        /* Lebenszeichen, sonst schlaeft die Verbindung auf dem Handy ein. */
        const puls = setInterval(() => { try { antwort.write(': puls\n\n'); } catch { /* weg */ } }, 25000);
        if (puls.unref) puls.unref();
        anfrage.on('close', () => { clearInterval(puls); hoerer.delete(antwort); });
        return;
      }

      if (weg === '/api/stand') {
        return jsonRaus(antwort, {
          zustand: wa.zustand(),
          chats: kern.chats(),
          einstellungen: kern.einstellungen(),
          dienst: uebersetzer.dienst()
        });
      }

      if (weg === '/api/verlauf') {
        return jsonRaus(antwort, kern.verlauf(adresse.searchParams.get('jid') || ''));
      }

      if (weg === '/api/qr') {
        const zustand = wa.zustand();
        if (!zustand.qr) return schicken(antwort, 404, '', 'text/plain');
        const svg = await QRCode.toString(zustand.qr, { type: 'svg', margin: 1, width: 320 });
        return schicken(antwort, 200, svg, ARTEN['.svg']);
      }

      if (anfrage.method === 'POST') {
        const daten = await koerper(anfrage);
        if (weg === '/api/senden') return jsonRaus(antwort, await kern.senden(daten.jid, daten.text));
        if (weg === '/api/vorschau') return jsonRaus(antwort, await kern.vorschau(daten.jid, daten.text));
        if (weg === '/api/chat') return jsonRaus(antwort, kern.einstellen(daten.jid, daten));
        if (weg === '/api/gelesen') { kern.gelesen(daten.jid); return jsonRaus(antwort, { ok: true }); }
        if (weg === '/api/einstellungen') return jsonRaus(antwort, kern.einstellungenSetzen(daten));
        if (weg === '/api/koppeln') return jsonRaus(antwort, { code: await wa.koppeln(daten.nummer) });
        if (weg === '/api/abmelden') { await wa.abmelden(); return jsonRaus(antwort, { ok: true }); }
      }

      /* Alles andere ist die Oberflaeche. */
      const name = weg === '/' ? 'index.html' : weg.replace(/^\/+/, '');
      const datei = path.join(webOrdner, name);
      if (!datei.startsWith(webOrdner) || !fs.existsSync(datei) || !fs.statSync(datei).isFile()) {
        return schicken(antwort, 404, 'Nicht da\n', 'text/plain; charset=utf-8');
      }
      return schicken(antwort, 200, fs.readFileSync(datei), ARTEN[path.extname(datei)] || 'application/octet-stream');
    } catch (e) {
      return jsonRaus(antwort, { fehler: String(e.message || e) }, 400);
    }
  });

  return {
    server, kern, wa, speicher, uebersetzer, melden,
    async schliessen() {
      for (const h of hoerer) { try { h.end(); } catch { /* weg */ } }
      hoerer.clear();
      speicher.sichern();
      if (wa.schliessen) await wa.schliessen();
      await new Promise(r => server.close(r));
    }
  };
}

/** Legt einen Schluessel an, sobald der Server nicht nur oertlich horcht. */
export function schluesselHolen(ordner) {
  const datei = path.join(ordner, 'schluessel.txt');
  fs.mkdirSync(ordner, { recursive: true });
  if (fs.existsSync(datei)) return fs.readFileSync(datei, 'utf8').trim();
  const neu = crypto.randomBytes(12).toString('base64url');
  fs.writeFileSync(datei, neu + '\n', { mode: 0o600 });
  return neu;
}
