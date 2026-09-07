/* Probe: der Kern. Was kommt an, was geht raus, und in welcher Sprache. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { macheKern } from '../src/kern.js';
import { macheSpeicher } from '../src/speicher.js';
import { macheUebersetzer } from '../src/uebersetzen.js';
import { macheHolen, macheWaAttrappe } from './attrappe.js';
import { macheProbe, bis } from './hilfe.js';

const IHR = '40712345678@s.whatsapp.net';

/** Baut einen frischen Kern samt Attrappe in einem eigenen Ordner. */
function aufbauen(einstellungen = {}, uebersetzerErsatz = null) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'dolmetscher-'));
  const speicher = macheSpeicher(ordner, { verzug: 5 });
  Object.assign(speicher.daten.einstellungen, einstellungen);
  const uebersetzer = uebersetzerErsatz
    || macheUebersetzer(speicher.daten.einstellungen, { holen: macheHolen() });
  const gemeldet = [];
  const kern = macheKern({
    uebersetzer,
    speicher,
    melden: (art, inhalt) => gemeldet.push({ art, inhalt })
  });
  const wa = macheWaAttrappe({ melden: (art, inhalt) => kern.aufnehmen(art, inhalt) });
  kern.anschliessen(wa);
  return { kern, wa, speicher, gemeldet, ordner };
}

const letzte = (kern, jid) => {
  const { nachrichten } = kern.verlauf(jid);
  return nachrichten[nachrichten.length - 1];
};

export default async function laufen() {
  const p = macheProbe('Kern');

  /* --- Eingehend: rumaenisch kommt an, deutsch steht da --------------- */
  {
    const { kern, wa } = aufbauen();
    wa.hereinkommen(IHR, 'Ce mai faci?', { name: 'Ana' });

    const sofort = letzte(kern, IHR);
    p.ist('Eingehendes steht sofort da', sofort.fremd, 'Ce mai faci?');
    p.wahr('und ist als "wird uebersetzt" markiert', sofort.wartet === true);

    await bis(() => letzte(kern, IHR).wartet === false);
    const fertig = letzte(kern, IHR);
    p.ist('danach steht es auf Deutsch', fertig.text, 'Wie geht es dir?');
    p.ist('das Original bleibt erhalten', fertig.fremd, 'Ce mai faci?');
    p.ist('die erkannte Sprache steht dabei', fertig.sprache, 'ro');
    p.wahr('als uebersetzt markiert', fertig.uebersetzt === true);
    p.ist('der Name kommt in die Liste', kern.chats()[0].name, 'Ana');
    p.ist('ungelesen zaehlt', kern.chats()[0].ungelesen, 1);

    kern.gelesen(IHR);
    p.ist('gelesen setzt zurueck', kern.chats()[0].ungelesen, 0);
  }

  /* --- Eingehend auf Deutsch bleibt, wie es ist ----------------------- */
  {
    const { kern, wa } = aufbauen();
    wa.hereinkommen(IHR, 'Guten Morgen');
    await bis(() => letzte(kern, IHR).wartet === false);
    const n = letzte(kern, IHR);
    p.ist('Deutsches bleibt unangetastet', n.text, 'Guten Morgen');
    p.wahr('und gilt nicht als uebersetzt', n.uebersetzt === false);
  }

  /* --- Ausgehend: deutsch getippt, rumaenisch gesendet ---------------- */
  {
    const { kern, wa } = aufbauen();
    kern.einstellen(IHR, { uebersetzen: true, gegenueber: 'ro' });
    await kern.senden(IHR, 'Ich komme später');

    p.ist('genau eine Nachricht ging raus', wa.gesendet.length, 1);
    p.ist('rumaenisch ging ueber WhatsApp', wa.gesendet[0].text, 'Vin mai târziu');
    const n = letzte(kern, IHR);
    p.ist('im Verlauf steht Deutsch', n.text, 'Ich komme später');
    p.ist('das Gesendete haengt daran', n.fremd, 'Vin mai târziu');
    p.wahr('als uebersetzt markiert', n.uebersetzt === true);

    /* Das Echo von WhatsApp darf keine zweite Zeile anlegen. */
    await bis(() => false, 60);
    p.ist('das eigene Echo legt nichts doppelt an', kern.verlauf(IHR).nachrichten.length, 1);
  }

  /* --- Ohne Schalter geht der Text unveraendert raus ------------------ */
  {
    const { kern, wa } = aufbauen();
    await kern.senden(IHR, 'Ich komme später');
    p.ist('ohne Schalter bleibt der Text stehen', wa.gesendet[0].text, 'Ich komme später');
    p.wahr('und gilt nicht als uebersetzt', letzte(kern, IHR).uebersetzt === false);
  }

  /* --- Vorschau sendet nichts ---------------------------------------- */
  {
    const { kern, wa } = aufbauen();
    kern.einstellen(IHR, { uebersetzen: true, gegenueber: 'ro' });
    const v = await kern.vorschau(IHR, 'Danke');
    p.ist('die Vorschau zeigt, was rausginge', v.text, 'Mulțumesc');
    p.ist('die Vorschau sendet nichts', wa.gesendet.length, 0);
  }

  /* --- Haengt der Dienst, geht nichts raus ---------------------------- */
  {
    const kaputt = {
      einstellen() {},
      dienst: () => 'kaputt',
      async uebersetze() { throw new Error('Dienst nicht erreichbar'); }
    };
    const { kern, wa } = aufbauen({}, kaputt);
    kern.einstellen(IHR, { uebersetzen: true });
    await p.wirft('ohne Uebersetzung wird nicht gesendet',
      () => kern.senden(IHR, 'Danke'), 'nicht erreichbar');
    p.ist('es ging wirklich nichts raus', wa.gesendet.length, 0);

    /* Eingehendes dagegen bleibt sichtbar - mit Hinweis. */
    wa.hereinkommen(IHR, 'Ce mai faci?');
    await bis(() => letzte(kern, IHR).wartet === false);
    const n = letzte(kern, IHR);
    p.ist('Eingehendes bleibt im Urtext stehen', n.text, 'Ce mai faci?');
    p.enthaelt('und sagt, warum', n.fehler, 'nicht erreichbar');
  }

  /* --- Nur markierte Chats uebersetzen -------------------------------- */
  {
    const { kern, wa } = aufbauen({ nurMarkierte: true });
    wa.hereinkommen(IHR, 'Ce mai faci?');
    await bis(() => false, 80);
    p.ist('unmarkiert bleibt unuebersetzt', letzte(kern, IHR).text, 'Ce mai faci?');

    kern.einstellen(IHR, { uebersetzen: true });
    wa.hereinkommen(IHR, 'Danke sehr');
    wa.hereinkommen(IHR, 'Pe curând', { id: 'zwei' });
    await bis(() => letzte(kern, IHR).wartet === false);
    p.ist('markiert wird uebersetzt', letzte(kern, IHR).text, 'Bis gleich');
  }

  /* --- Was kein Text ist, wird nicht uebersetzt ----------------------- */
  {
    const { kern, wa } = aufbauen();
    wa.hereinkommen(IHR, '', { art: 'sprachnachricht' });
    await bis(() => false, 60);
    const n = letzte(kern, IHR);
    p.ist('Sprachnachricht bleibt, was sie ist', n.art, 'sprachnachricht');
    p.wahr('und wartet nicht auf eine Uebersetzung', n.wartet === false);
  }

  /* --- Der Verlauf ueberlebt einen Neustart --------------------------- */
  {
    const { kern, wa, speicher, ordner } = aufbauen();
    kern.einstellen(IHR, { uebersetzen: true, gegenueber: 'ro' });
    await kern.senden(IHR, 'Danke');
    wa.hereinkommen(IHR, 'Pe curând');
    await bis(() => letzte(kern, IHR).wartet === false);
    speicher.sichern();

    const zweiter = macheSpeicher(ordner, { verzug: 5 });
    const kern2 = macheKern({
      uebersetzer: macheUebersetzer(zweiter.daten.einstellungen, { holen: macheHolen() }),
      speicher: zweiter,
      melden: () => {}
    });
    const { chat, nachrichten } = kern2.verlauf(IHR);
    p.ist('nach dem Neustart sind beide Nachrichten da', nachrichten.length, 2);
    p.ist('der Schalter des Chats bleibt', chat.uebersetzen, true);
    p.ist('das Gesendete bleibt zugeordnet', nachrichten[0].fremd, 'Mulțumesc');
    p.ist('das Empfangene steht auf Deutsch', nachrichten[1].text, 'Bis gleich');
  }

  /* --- Leeres senden geht nicht --------------------------------------- */
  {
    const { kern } = aufbauen();
    await p.wirft('leere Nachricht wird abgelehnt', () => kern.senden(IHR, '   '), 'Leere');
  }

  return p.ende();
}
