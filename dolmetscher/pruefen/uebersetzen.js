/* Probe: die drei Dienste, das Zerlegen langer Texte, das Merken. */
import { macheUebersetzer, stuecke, kuerzel } from '../src/uebersetzen.js';
import { macheHolen } from './attrappe.js';
import { macheProbe } from './hilfe.js';

export default async function laufen() {
  const p = macheProbe('Uebersetzen');

  p.ist('Kuerzel wird vereinheitlicht', [kuerzel('DE'), kuerzel('pt-BR'), kuerzel('')], ['de', 'pt', '']);

  /* Zerlegen: der Schnitt liegt am Satzende, nichts geht verloren. */
  const lang = ('Ein Satz mit Punkt. ').repeat(200);
  const teile = stuecke(lang, 300);
  p.wahr('lange Texte werden zerlegt', teile.length > 1, teile.length + ' Stuecke');
  p.ist('beim Zerlegen geht nichts verloren', teile.join(''), lang);
  p.wahr('kein Stueck ueber der Grenze', teile.every(t => t.length <= 300));
  p.ist('kurzer Text bleibt ein Stueck', stuecke('kurz', 300), ['kurz']);

  /* Google */
  const protokoll = [];
  const g = macheUebersetzer({ dienst: 'google' }, { holen: macheHolen(protokoll) });
  const a = await g.uebersetze('Guten Morgen', 'ro');
  p.ist('Google uebersetzt de -> ro', a.text, 'Bună dimineața');
  p.ist('Google erkennt die Ausgangssprache', a.quelle, 'de');
  p.wahr('Google meldet: nicht gleich', a.gleich === false);
  p.enthaelt('Google wurde gefragt', protokoll[0], 'translate.googleapis.com');

  /* Kommt es schon in der Zielsprache, bleibt der Urtext stehen. */
  const b = await g.uebersetze('Guten Morgen', 'de');
  p.ist('gleiche Sprache bleibt unangetastet', b.text, 'Guten Morgen');
  p.wahr('gleiche Sprache wird gemeldet', b.gleich === true);

  /* Gemerktes wird nicht zweimal geholt. */
  const vorher = protokoll.length;
  await g.uebersetze('Guten Morgen', 'ro');
  p.ist('Gemerktes kostet keine Anfrage', protokoll.length, vorher);

  /* DeepL */
  const d = macheUebersetzer({ dienst: 'deepl', deeplSchluessel: 'abc:fx' }, { holen: macheHolen(protokoll) });
  const c = await d.uebersetze('Danke', 'ro');
  p.ist('DeepL uebersetzt', c.text, 'Mulțumesc');
  p.ist('DeepL erkennt die Ausgangssprache', c.quelle, 'de');
  await p.wirft('DeepL ohne Schluessel sagt es', async () => {
    await macheUebersetzer({ dienst: 'deepl' }, { holen: macheHolen() }).uebersetze('Danke', 'ro');
  }, 'Schluessel');

  /* LibreTranslate */
  const l = macheUebersetzer({ dienst: 'libre', libreAdresse: 'http://127.0.0.1:5000/' }, { holen: macheHolen(protokoll) });
  const e = await l.uebersetze('Ce mai faci?', 'de');
  p.ist('LibreTranslate uebersetzt ro -> de', e.text, 'Wie geht es dir?');
  p.ist('LibreTranslate erkennt die Ausgangssprache', e.quelle, 'ro');
  await p.wirft('LibreTranslate ohne Adresse sagt es', async () => {
    await macheUebersetzer({ dienst: 'libre' }, { holen: macheHolen() }).uebersetze('Danke', 'ro');
  }, 'Adresse');

  /* Wahl des Dienstes */
  p.ist('ohne alles: Google', macheUebersetzer({}).dienst(), 'google');
  p.ist('mit DeepL-Schluessel: DeepL', macheUebersetzer({ deeplSchluessel: 'x:fx' }).dienst(), 'deepl');
  p.ist('mit Libre-Adresse: Libre', macheUebersetzer({ libreAdresse: 'http://a' }).dienst(), 'libre');
  p.ist('ausdrueckliche Wahl schlaegt alles', macheUebersetzer({ dienst: 'google', deeplSchluessel: 'x:fx' }).dienst(), 'google');

  /* Leeres bleibt leer, ohne dass jemand gefragt wird. */
  const nachher = protokoll.length;
  const leer = await g.uebersetze('   ', 'ro');
  p.ist('Leeres kostet keine Anfrage', protokoll.length, nachher);
  p.ist('Leeres bleibt leer', leer.text, '   ');

  return p.ende();
}
