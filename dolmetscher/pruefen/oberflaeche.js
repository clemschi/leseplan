/* Probe: die Oberflaeche im echten Browser, gegen einen echten Server -
   nur WhatsApp und das Netz sind Attrappen. Gemessen wird mit Text und
   Zahlen, nie mit Bildern. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { macheAnwendung } from '../src/anwendung.js';
import { macheHolen, macheWaAttrappe } from './attrappe.js';
import { macheProbe, bis } from './hilfe.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const IHR = '40712345678@s.whatsapp.net';

process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const verlange = createRequire(import.meta.url);

export default async function laufen() {
  const p = macheProbe('Oberflaeche');

  let playwright;
  try {
    playwright = verlange('/opt/node22/lib/node_modules/playwright');
  } catch {
    try { playwright = verlange('playwright'); } catch { /* nicht da */ }
  }
  if (!playwright) {
    console.log('  (uebersprungen - Playwright ist hier nicht installiert)');
    return p.ende();
  }

  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'dolmetscher-web-'));
  const anwendung = macheAnwendung({
    datenOrdner: ordner,
    webOrdner: path.join(HIER, '..', 'web'),
    waFabrik: macheWaAttrappe,
    holen: macheHolen(),
    speicherVerzug: 5
  });
  await new Promise(r => anwendung.server.listen(0, '127.0.0.1', r));
  const adresse = 'http://127.0.0.1:' + anwendung.server.address().port + '/';
  const wa = anwendung.wa;

  const browser = await playwright.chromium.launch();
  const zusammenhang = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: 'de-DE'
  });
  const seite = await zusammenhang.newPage();
  const fehlerImBrowser = [];
  seite.on('pageerror', e => fehlerImBrowser.push(String(e.message)));
  /* Abgewiesene Anfragen sind hier Absicht (unbrauchbare Nummer) - die
     zaehlen nicht als Fehler, unerwartete Ausnahmen im Skript schon. */
  seite.on('console', e => {
    if (e.type() !== 'error') return;
    if (e.text().includes('Failed to load resource')) return;
    fehlerImBrowser.push(e.text());
  });

  try {
    await seite.goto(adresse, { waitUntil: 'domcontentloaded' });

    /* Verbunden: die Chatliste liegt oben auf, nicht das Anmelden. */
    await seite.waitForSelector('#liste:not([hidden])', { timeout: 8000 });
    p.wahr('verbunden zeigt die Chatliste', await seite.isHidden('#anmelden'));
    p.enthaelt('die eigene Nummer steht im Kopf', await seite.textContent('#ichBin'), '4915100000000');
    p.enthaelt('leere Liste sagt, dass sie leer ist', await seite.textContent('#chatliste'), 'Noch keine Chats');

    /* Eine Nachricht kommt herein - ohne Neuladen. */
    wa.hereinkommen(IHR, 'Ce mai faci?', { name: 'Ana' });
    await seite.waitForSelector('#chatliste .zeile', { timeout: 5000 });
    p.enthaelt('der Chat erscheint von selbst', await seite.textContent('#chatliste'), 'Ana');
    await bis(async () => (await seite.textContent('#chatliste')).includes('Wie geht es dir'), 5000);
    p.enthaelt('die Vorschau steht auf Deutsch', await seite.textContent('#chatliste'), 'Wie geht es dir');
    p.ist('ungelesen wird gezaehlt', await seite.textContent('#chatliste .zahl'), '1');

    /* Hinein in den Chat. */
    await seite.click('#chatliste .zeile');
    await seite.waitForSelector('#chat:not([hidden])');
    p.ist('der Name steht im Kopf', await seite.textContent('#chatName'), 'Ana');
    const ersteBlase = await seite.textContent('.blase');
    p.enthaelt('die Blase zeigt Deutsch', ersteBlase, 'Wie geht es dir?');
    p.wahr('das Original steht nicht offen da', !ersteBlase.includes('Ce mai faci'));
    p.enthaelt('die Fusszeile nennt die Richtung', ersteBlase, 'ro → de');

    /* Antippen zeigt das Original. */
    await seite.click('.blase');
    await seite.waitForSelector('.blase .original', { timeout: 3000 });
    p.enthaelt('Antippen zeigt das Original', await seite.textContent('.blase .original'), 'Ce mai faci?');
    await seite.click('.blase');
    p.ist('nochmal Antippen klappt es wieder zu', await seite.locator('.blase .original').count(), 0);

    /* Uebersetzen fuer diesen Chat einschalten. */
    p.enthaelt('vorher steht da: Uebersetzen aus', await seite.textContent('#chatUnter'), 'Übersetzen aus');
    await seite.click('#chatMehr');
    await seite.waitForSelector('#blatt:not([hidden])');
    await seite.check('#blattInhalt input[type=checkbox]');
    await seite.selectOption('#blattInhalt select', 'ro');
    await seite.click('#blattInhalt .knopf.gross');
    await seite.waitForSelector('#blatt', { state: 'hidden' });
    p.enthaelt('danach steht die Richtung im Kopf', await seite.textContent('#chatUnter'), 'Rumänisch');

    /* Vorschau: zeigen, was rausginge. */
    await seite.fill('#text', 'Ich komme später');
    await seite.click('#vorschauKnopf');
    await bis(async () => (await seite.textContent('#vorschauZeile')).includes('Vin mai'), 5000);
    p.enthaelt('die Vorschau zeigt das Rumaenische', await seite.textContent('#vorschauZeile'), 'Vin mai târziu');
    p.ist('die Vorschau hat nichts gesendet', wa.gesendet.length, 0);

    /* Senden. */
    await seite.click('#senden');
    await bis(() => wa.gesendet.length === 1, 5000);
    p.ist('genau eine Nachricht ging raus', wa.gesendet.length, 1);
    p.ist('rumaenisch ging ueber WhatsApp', wa.gesendet[0].text, 'Vin mai târziu');
    await bis(async () => (await seite.inputValue('#text')) === '', 5000);
    p.ist('das Feld ist danach leer', await seite.inputValue('#text'), '');

    await bis(async () => (await seite.locator('.blase.meine').count()) > 0, 5000);
    const meine = await seite.textContent('.blase.meine');
    p.enthaelt('die eigene Blase zeigt Deutsch', meine, 'Ich komme später');
    p.wahr('nicht das Rumaenische', !meine.includes('Vin mai'));
    await seite.click('.blase.meine');
    await seite.waitForSelector('.blase.meine .original', { timeout: 3000 });
    p.enthaelt('Antippen zeigt das Gesendete', await seite.textContent('.blase.meine .original'), 'Vin mai târziu');

    /* Das Echo von WhatsApp darf keine zweite Blase machen. */
    await bis(() => false, 300);
    p.ist('das eigene Echo legt nichts doppelt an', await seite.locator('.blase.meine').count(), 1);

    /* Noch eine Nachricht herein, waehrend der Chat offen ist. */
    wa.hereinkommen(IHR, 'Mulțumesc');
    await bis(async () => (await seite.locator('.blase').count()) === 3, 5000);
    const alle = await seite.locator('.blase').allTextContents();
    p.enthaelt('die neue Blase steht auf Deutsch', alle[2], 'Danke');

    /* Zurueck in die Liste. */
    await seite.click('#zurueck');
    await seite.waitForSelector('#liste:not([hidden])');
    p.enthaelt('die Marke zeigt die Richtung', await seite.textContent('#chatliste .marke'), 'de → ro');
    p.ist('ungelesen ist weg', await seite.locator('#chatliste .zahl').count(), 0);

    /* Einstellungen: Sprache umstellen und sichern. */
    await seite.click('#zuEinstellungen');
    await seite.waitForSelector('#blatt:not([hidden])');
    await seite.click('#blattInhalt .knopf.gross');
    await seite.waitForSelector('#blatt', { state: 'hidden' });
    p.wahr('Einstellungen lassen sich uebernehmen', true);

    /* Der Verlauf ueberlebt das Neuladen. */
    await seite.reload({ waitUntil: 'domcontentloaded' });
    await seite.waitForSelector('#chatliste .zeile', { timeout: 8000 });
    await seite.click('#chatliste .zeile');
    await bis(async () => (await seite.locator('.blase').count()) === 3, 5000);
    p.ist('nach dem Neuladen sind alle drei Blasen da', await seite.locator('.blase').count(), 3);

    /* Abgemeldet: die Oberflaeche geht zurueck aufs Anmelden. */
    await wa.abmelden();
    await seite.waitForSelector('#anmelden:not([hidden])', { timeout: 5000 });
    p.wahr('nach dem Abmelden steht das Anmelden da', await seite.isHidden('#liste'));

    /* Kopplungscode anfordern. */
    await seite.fill('#nummer', '491701234567');
    await seite.click('#codeHolen');
    await seite.waitForSelector('#codeFeld:not([hidden])', { timeout: 5000 });
    p.ist('der Kopplungscode steht da', await seite.textContent('#codeFeld'), 'ABCD-1234');

    await seite.fill('#nummer', '12');
    await seite.click('#codeHolen');
    await seite.waitForSelector('#kopplungFehler:not([hidden])', { timeout: 5000 });
    p.enthaelt('eine unbrauchbare Nummer wird abgewiesen',
      await seite.textContent('#kopplungFehler'), 'international');

    p.ist('kein Fehler im Browser', fehlerImBrowser, []);
  } finally {
    await browser.close();
    await anwendung.schliessen();
    fs.rmSync(ordner, { recursive: true, force: true });
  }

  return p.ende();
}
