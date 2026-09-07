/* Probe: der Server. Schluessel, Wege, und dass niemand aus dem
   Web-Ordner herausspaziert. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { macheAnwendung } from '../src/anwendung.js';
import { macheHolen, macheWaAttrappe } from './attrappe.js';
import { macheProbe, bis } from './hilfe.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));

async function aufbauen(schluessel = '') {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'dolmetscher-srv-'));
  const anwendung = macheAnwendung({
    datenOrdner: ordner,
    webOrdner: path.join(HIER, '..', 'web'),
    waFabrik: macheWaAttrappe,
    holen: macheHolen(),
    schluessel,
    speicherVerzug: 5
  });
  await new Promise(r => anwendung.server.listen(0, '127.0.0.1', r));
  const wurzel = 'http://127.0.0.1:' + anwendung.server.address().port;
  return { anwendung, wurzel, ordner };
}

export default async function laufen() {
  const p = macheProbe('Server');

  /* --- ohne Schluessel: alles offen (nur oertlich gedacht) ----------- */
  {
    const { anwendung, wurzel, ordner } = await aufbauen('');
    const stand = await (await fetch(wurzel + '/api/stand')).json();
    p.ist('Stand nennt die Verbindung', stand.zustand.stand, 'offen');
    p.ist('Stand nennt den Dienst', stand.dienst, 'google');
    p.ist('Stand nennt die Sprachen', [stand.einstellungen.meine, stand.einstellungen.gegenueber], ['de', 'ro']);

    const seite = await fetch(wurzel + '/');
    p.ist('die Oberflaeche wird ausgeliefert', seite.status, 200);
    p.enthaelt('als HTML', seite.headers.get('content-type'), 'text/html');
    p.enthaelt('mit dem richtigen Titel', await seite.text(), '<title>Dolmetscher</title>');

    /* Der Weg nach draussen ist zu. */
    const raus = await fetch(wurzel + '/../server.js');
    p.wahr('aus dem Web-Ordner kommt niemand heraus', raus.status === 404 || raus.status === 400, 'Status ' + raus.status);

    /* Senden ueber die Schnittstelle. */
    const jid = '40712345678@s.whatsapp.net';
    await fetch(wurzel + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jid, uebersetzen: true, gegenueber: 'ro' })
    });
    const gesendet = await (await fetch(wurzel + '/api/senden', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jid, text: 'Danke' })
    })).json();
    p.ist('gesendet wird das Rumaenische', anwendung.wa.gesendet[0].text, 'Mulțumesc');
    p.ist('zurueck kommt das Deutsche', gesendet.text, 'Danke');

    /* Kaputte Anfragen enden mit einer Meldung, nicht mit einem Absturz. */
    const leer = await fetch(wurzel + '/api/senden', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jid, text: '  ' })
    });
    p.ist('leere Nachricht wird abgewiesen', leer.status, 400);
    p.enthaelt('mit Begruendung', (await leer.json()).fehler, 'Leere');

    const murks = await fetch(wurzel + '/api/senden', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: 'kein json'
    });
    p.ist('kaputtes JSON wird abgewiesen', murks.status, 400);

    /* Der Strom meldet den Zustand sofort. */
    const strom = await fetch(wurzel + '/api/strom');
    const leser = strom.body.getReader();
    const stueck = new TextDecoder().decode((await leser.read()).value);
    p.enthaelt('der Strom beginnt mit dem Zustand', stueck, '"art":"zustand"');
    await leser.cancel();

    await anwendung.schliessen();
    fs.rmSync(ordner, { recursive: true, force: true });
  }

  /* --- mit Schluessel: ohne ihn geht nichts -------------------------- */
  {
    const { anwendung, wurzel, ordner } = await aufbauen('geheim123');
    p.ist('ohne Schluessel: abgewiesen', (await fetch(wurzel + '/api/stand')).status, 401);
    p.ist('mit falschem Schluessel: abgewiesen', (await fetch(wurzel + '/api/stand?schluessel=falsch')).status, 401);

    const gut = await fetch(wurzel + '/api/stand?schluessel=geheim123');
    p.ist('mit Schluessel: herein', gut.status, 200);
    p.enthaelt('und der Schluessel wird als Keks gemerkt', gut.headers.get('set-cookie') || '', 'schluessel=geheim123');

    const mitKeks = await fetch(wurzel + '/api/stand', { headers: { cookie: 'schluessel=geheim123' } });
    p.ist('mit Keks: herein', mitKeks.status, 200);

    await anwendung.schliessen();
    fs.rmSync(ordner, { recursive: true, force: true });
  }

  /* --- eingehende Nachricht wandert bis in den Verlauf --------------- */
  {
    const { anwendung, wurzel, ordner } = await aufbauen('');
    const jid = '40712345678@s.whatsapp.net';
    anwendung.wa.hereinkommen(jid, 'Ce mai faci?', { name: 'Ana' });
    await bis(async () => {
      const v = await (await fetch(wurzel + '/api/verlauf?jid=' + encodeURIComponent(jid))).json();
      return v.nachrichten.length === 1 && v.nachrichten[0].wartet === false;
    }, 5000);
    const v = await (await fetch(wurzel + '/api/verlauf?jid=' + encodeURIComponent(jid))).json();
    p.ist('der Verlauf zeigt Deutsch', v.nachrichten[0].text, 'Wie geht es dir?');
    p.ist('und haelt das Original', v.nachrichten[0].fremd, 'Ce mai faci?');
    p.ist('ein unbekannter Chat gibt nichts zurueck',
      (await (await fetch(wurzel + '/api/verlauf?jid=gibtsnicht')).json()).nachrichten, []);

    await anwendung.schliessen();
    fs.rmSync(ordner, { recursive: true, force: true });
  }

  return p.ende();
}
