const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const { saeen } = require(__dirname + '/../saat.js');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };
const werk = (t, th) => ({ titel: t, thema: th || 'Alpha', autor: 'A. B.',
  autoren: [{ name: 'A. B.', geb: 1970, gest: null, bio: 'Bio.', einfluss: [] }],
  jahr: 2020, seiten: 200, seitenUnsicher: false, ausgabe: 'Verlag 2020',
  link: '', beschreibung: 'Text.', kurz: 'Kurz.', schwierigkeit: 3, besitz: 'fehlt' });
const SAMM = { format: 'leseliste-stoebern', version: 1, themen: ['Alpha'],
  werke: [werk('Eins'), werk('Zwei'), werk('Drei')] };
const GUT = JSON.stringify(SAMM);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const f = [];
  page.on('pageerror', e => f.push(String(e)));

  /* ---------- jsonLesen für sich ---------- */
  await page.goto('file://' + require('path').join(__dirname, '..', '..', 'mylife.html'));
  await saeen(page, false);
  await page.reload(); await page.waitForTimeout(500);

  const j = await page.evaluate(g => ({
    blank: jsonLesen(g).ok,
    zaun: jsonLesen('```json\n' + g + '\n```').ok,
    zaunOhneWort: jsonLesen('```\n' + g + '\n```').ok,
    drumherum: jsonLesen('Hier ist sie:\n' + g + '\nBitte sehr!').ok,
    bom: jsonLesen('﻿' + g).ok,
    array: jsonLesen('```json\n[{"titel":"X"}]\n```').ok,
    leer: jsonLesen('   ').ok,
    mist: jsonLesen('{ kaputt').ok,
    text: jsonFehlerText('Unexpected token k in JSON at position 2')
  }), GUT);
  P('blankes JSON', j.blank);
  P('JSON in ```json-Zäunen', j.zaun);
  P('JSON in nackten Zäunen', j.zaunOhneWort);
  P('JSON mit Text davor und danach', j.drumherum);
  P('JSON mit Byte-Marke', j.bom);
  P('Array in Zäunen', j.array);
  P('leere Datei fällt durch', !j.leer);
  P('kaputtes JSON fällt durch', !j.mist);
  P('Fehlermeldung nennt die Stelle', /Zeichen 2/.test(j.text), j.text);

  /* ---------- Stöbern ---------- */
  await page.click('[data-app="leseliste"]'); await page.waitForTimeout(600);
  await page.evaluate(() => stoebernOeffnen()); await page.waitForTimeout(600);
  const zumLaden = async () => {
    for (let i = 0; i < 4; i++) {
      if (await page.$('.sto [data-file]')) return true;
      const z = await page.$('.sto .sto-zurueck');
      if (!z) return false;
      await z.click(); await page.waitForTimeout(400);
    }
    return !!(await page.$('.sto [data-file]'));
  };
  const legen = async (name, inhalt) => {
    await zumLaden();
    await page.setInputFiles('.sto [data-file]', { name, mimeType: 'application/json', buffer: Buffer.from(inhalt) });
    await page.waitForTimeout(600);
  };
  const werkeJetzt = () => page.evaluate(() => DB.stoebern ? DB.stoebern.werke.length : 0);
  const toastJetzt = () => page.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.textContent : ''; });

  const acc = await page.$eval('.sto [data-file]', n => n.getAttribute('accept'));
  P('Dateifeld nimmt auch .txt an', /\.txt/.test(acc) && /\.json/.test(acc), acc);

  await legen('zaun.json', '```json\n' + GUT + '\n```');
  P('Stöbern lädt JSON aus Zäunen', await werkeJetzt() === 3, (await werkeJetzt()) + ' Werke');

  await legen('drum.json', 'Bitte sehr:\n' + GUT + '\nViel Freude!');
  P('Stöbern lädt JSON mit Text drumherum', await werkeJetzt() === 3);

  await legen('leer.json', JSON.stringify({ format: 'leseliste-stoebern', werke: [] }));
  P('leere Liste sagt, dass sie leer ist', /Liste in der Datei ist leer/.test(await toastJetzt()), await toastJetzt());

  await legen('nix.json', JSON.stringify({ irgendwas: 1 }));
  P('Datei ohne Werke nennt die erwarteten Felder', /werke|buecher/.test(await toastJetzt()), await toastJetzt());

  await legen('kaputt.json', '{ kaputt');
  P('kaputte Datei nennt die Stelle', /kein gültiges JSON \(/.test(await toastJetzt()), await toastJetzt());
  P('Dateifeld ist nach einem Fehlschlag wieder leer',
    await page.$eval('.sto [data-file]', n => n.value) === '');

  /* ---------- Rückfrage, wenn Gemerktes verloren ginge ---------- */
  await legen('gut.json', GUT);
  const los = await page.$('.sto [data-los]');
  if (los) { await los.click(); await page.waitForTimeout(600); }
  /* Eine Karte merken */
  await page.click('.sto [data-ja]');
  await page.waitForTimeout(700);
  const merkKnopf = await page.$$eval('.sto button', n => n.map(x => x.textContent.trim().slice(0, 20)));
  const gemerkt = await page.evaluate(() => DB.stoebern ? (DB.stoebern.gemerkt || []).length : 0);
  console.log('     (gemerkt: ' + gemerkt + ' · Knöpfe: ' + merkKnopf.join(' / ') + ')');

  if (gemerkt) {
    await zumLaden();
    await page.setInputFiles('.sto [data-file]', { name: 'neu.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ werke: [werk('Neu', 'Gamma')] })) });
    await page.waitForTimeout(600);
    const frage = await page.evaluate(() => {
      const d = document.querySelector('.sheet, .dialog, .bestaetigen');
      return d ? d.textContent.replace(/\s+/g, ' ').slice(0, 90) : '';
    });
    P('Rückfrage, bevor Gemerktes verloren geht', /verwerfen|verloren/i.test(frage), frage || '(keine)');
    /* Abbrechen lässt alles stehen */
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.sheet button, .dialog button')]
        .find(x => /Abbrechen|Zurück|Nein/i.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(500);
    P('Abbrechen behält die alte Sammlung', await werkeJetzt() === 3, (await werkeJetzt()) + ' Werke');
  } else {
    P('Rückfrage, bevor Gemerktes verloren geht', false, 'konnte nichts merken');
  }

  /* ---------- leseliste-Import geht denselben Weg ---------- */
  await page.evaluate(() => alleLayerSchliessen()); await page.waitForTimeout(500);
  const vorher = await page.evaluate(() => DB.buecher.length);
  await page.evaluate(() => importDialog()); await page.waitForTimeout(400);
  const acc2 = await page.$eval('.sheet [data-file]', n => n.getAttribute('accept'));
  P('auch dort .txt erlaubt', /\.txt/.test(acc2), acc2);
  await page.setInputFiles('.sheet [data-file]', {
    name: 'liste.json', mimeType: 'application/json',
    buffer: Buffer.from('```json\n' + JSON.stringify({
      lesepleane: [{ id: 'p1', name: 'Aus Zaeunen' }],
      bloecke: [{ id: 'b1', planId: 'p1', name: 'Block', ord: 0 }],
      buecher: [{ id: 'x1', blockId: 'b1', ord: 0, titel: 'Gezaeunt', autor: 'C. D.', jahr: 2001 }]
    }) + '\n```')
  });
  await page.check('.sheet input[name=impmode][value=ergaenzen]');
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(900);
  const nach = await page.evaluate(() => ({ n: DB.buecher.length, hat: DB.buecher.some(x => x.titel === 'Gezaeunt') }));
  P('leseliste-Import verdaut Zäune auch', nach.hat && nach.n === vorher + 1,
    vorher + ' → ' + nach.n + ' Bücher');

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
