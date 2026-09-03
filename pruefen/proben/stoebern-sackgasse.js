const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const { saeen } = require(__dirname + '/../saat.js');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };
const werk = (t, th) => ({ titel: t, thema: th || 'Alpha', autor: 'A. B.',
  autoren: [{ name: 'A. B.', geb: 1970, gest: null, bio: 'B', einfluss: [] }],
  jahr: 2020, seiten: 200, ausgabe: 'V', link: '', beschreibung: 'T', kurz: 'K',
  schwierigkeit: 3, besitz: 'fehlt' });
const A = JSON.stringify({ format: 'leseliste-stoebern', werke: [werk('Eins'), werk('Zwei'), werk('Drei')] });
const B = JSON.stringify({ format: 'leseliste-stoebern', werke: [werk('Vier', 'Gamma')] });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const f = [];
  page.on('pageerror', e => f.push(String(e)));
  await page.goto('file://' + require('path').join(__dirname, '..', '..', 'mylife.html'));
  await saeen(page, false);
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-app="leseliste"]'); await page.waitForTimeout(600);

  const lage = () => page.evaluate(() => ({
    kopf: (document.querySelector('.sto [data-t]') || {}).textContent,
    unter: (document.querySelector('.sto [data-u]') || {}).textContent,
    zurueck: [...document.querySelectorAll('.sto .sto-zurueck')].map(x => x.textContent.trim()),
    datei: !!document.querySelector('.sto [data-file]'),
    knoepfe: [...document.querySelectorAll('.sto .sto-fuss button')].map(x => x.textContent.trim().slice(0, 30))
  }));

  await page.evaluate(() => stoebernOeffnen()); await page.waitForTimeout(600);
  await page.setInputFiles('.sto [data-file]', { name: 'a.json', mimeType: 'application/json', buffer: Buffer.from(A) });
  await page.waitForTimeout(600);
  await page.click('.sto [data-los]'); await page.waitForTimeout(600);

  /* Alles wegwischen: Sammlung bleibt leer, Stapel ist durch – der Fall aus dem Bild. */
  for (let i = 0; i < 3; i++) { await page.click('.sto [data-nein]'); await page.waitForTimeout(750); }
  let d = await lage();
  P('leere Sammlung nach durchgewischtem Stapel', d.kopf === 'Gemerkt' && d.unter === '0 Werke',
    d.kopf + ' / ' + d.unter);
  P('genau ein Zurück-Knopf', d.zurueck.length === 1, JSON.stringify(d.zurueck));
  P('kein wirkungsloses „Weiter stöbern"', !d.knoepfe.some(x => /Weiter stöbern/.test(x)), d.knoepfe.join(' | '));
  P('stattdessen der Weg zur neuen Sammlung', d.knoepfe.some(x => /Andere Sammlung/.test(x)), d.knoepfe.join(' | '));

  /* Der Knopf muss auch wirken */
  await page.click('.sto [data-andereszeug]'); await page.waitForTimeout(600);
  d = await lage();
  P('er führt zum Ladeschritt', d.datei, d.kopf);
  P('dort kein Zurück-Knopf mehr', d.zurueck.length === 0, JSON.stringify(d.zurueck));

  await page.setInputFiles('.sto [data-file]', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(B) });
  await page.waitForTimeout(700);
  P('neue Sammlung geladen', await page.evaluate(() => DB.stoebern.werke.length) === 1);

  /* --- Gegenprobe: mit Gemerktem bleibt „Weiter stöbern" solange etwas offen ist --- */
  await page.click('.sto [data-los]'); await page.waitForTimeout(600);
  await page.click('.sto [data-ja]'); await page.waitForTimeout(750);
  d = await lage();
  P('ein gemerktes Werk führt in die Sammlung', /Gemerkt/.test(d.kopf), d.kopf + ' / ' + d.unter);
  P('auch dort genau ein Zurück-Knopf', d.zurueck.length === 1, JSON.stringify(d.zurueck));
  P('bei durchem Stapel kein „Weiter stöbern"', !d.knoepfe.some(x => /Weiter stöbern/.test(x)), d.knoepfe.join(' | '));

  /* --- Mit Rest im Stapel muss „Weiter stöbern" dastehen und wirken --- */
  await page.click('.sto [data-andere]'); await page.waitForTimeout(500);
  await page.setInputFiles('.sto [data-file]', { name: 'a.json', mimeType: 'application/json', buffer: Buffer.from(A) });
  await page.waitForTimeout(700);
  /* Die Rueckfrage bestaetigen - es liegt ein gemerktes Werk vor. */
  const jaBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.sheet button, .dialog button')]
      .find(x => /Neue Sammlung/i.test(x.textContent)) || null);
  if (await jaBtn.evaluate(n => !!n)) { await jaBtn.asElement().click(); await page.waitForTimeout(700); }
  await page.click('.sto [data-los]'); await page.waitForTimeout(600);
  await page.click('.sto [data-ja]'); await page.waitForTimeout(750);
  const fertigKnopf = await page.$('.sto [data-fertig]');
  if (fertigKnopf) { await fertigKnopf.click(); await page.waitForTimeout(600); }
  d = await lage();
  P('mit Rest im Stapel steht „Weiter stöbern" da',
    d.knoepfe.some(x => /Weiter stöbern/.test(x)), d.knoepfe.join(' | '));
  P('und wieder nur ein Zurück-Knopf', d.zurueck.length === 1, JSON.stringify(d.zurueck));
  const weiter = await page.$('.sto [data-weiter]');
  if (weiter) { await weiter.click(); await page.waitForTimeout(600); }
  d = await lage();
  P('„Weiter stöbern" bringt die Karte zurück', d.kopf === 'Stöbern' && /von/.test(d.unter || ''),
    d.kopf + ' / ' + d.unter);
  P('immer noch ein Zurück-Knopf', d.zurueck.length === 1, JSON.stringify(d.zurueck));

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
