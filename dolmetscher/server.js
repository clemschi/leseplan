#!/usr/bin/env node
/**
 * Start. Mehr steht hier nicht - die Anwendung selbst liegt in
 * src/anwendung.js, die Verbindung zu WhatsApp in src/whatsapp.js.
 *
 *   node server.js
 *   PORT=8080 node server.js
 *   HOST=0.0.0.0 node server.js      (dann mit Schluessel, siehe README)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { macheAnwendung, schluesselHolen } from './src/anwendung.js';
import { macheWhatsApp } from './src/whatsapp.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8080);
const DATEN = process.env.DATEN || path.join(HIER, 'daten');
const OERTLICH = HOST === '127.0.0.1' || HOST === 'localhost' || HOST === '::1';

const schluessel = OERTLICH ? '' : schluesselHolen(DATEN);

const anwendung = macheAnwendung({
  datenOrdner: DATEN,
  webOrdner: path.join(HIER, 'web'),
  waFabrik: macheWhatsApp,
  schluessel
});

anwendung.server.listen(PORT, HOST, () => {
  const adresse = 'http://' + (OERTLICH ? 'localhost' : HOST) + ':' + PORT + '/'
    + (schluessel ? '?schluessel=' + schluessel : '');
  console.log('Dolmetscher laeuft.');
  console.log('  ' + adresse);
  if (anwendung.speicher.ladefehler) {
    console.log('  Hinweis: der alte Verlauf war unlesbar (' + anwendung.speicher.ladefehler + '), er liegt daneben.');
  }
  anwendung.wa.starten().catch(e => console.log('  WhatsApp: ' + e.message));
});

const aufhoeren = async () => {
  console.log('\nDolmetscher haelt an.');
  await anwendung.schliessen();
  process.exit(0);
};
process.on('SIGINT', aufhoeren);
process.on('SIGTERM', aufhoeren);
