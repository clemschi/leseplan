const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const { saeen } = require(__dirname + '/../saat.js');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };
const werk = (t, th) => ({ titel: t, thema: th || 'Alpha', autor: 'A. B.',
  autoren: [{ name: 'A. B.', geb: 1970, gest: null, bio: 'Bio.', einfluss: [] }],
  jahr: 2020, seiten: 200, ausgabe: 'Verlag', link: '', beschreibung: 'Text.',
  kurz: 'Kurz.', schwierigkeit: 3, besitz: 'fehlt' });
const A = JSON.stringify({ format: 'leseliste-stoebern', werke: [werk('Eins'), werk('Zwei'), werk('Drei')] });
const B = JSON.stringify({ format: 'leseliste-stoebern', werke: [werk('Vier', 'Gamma'), werk('Fuenf', 'Gamma')] });

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

  const stand = () => page.evaluate(() => ({
    kopf: (document.querySelector('.sto [data-t]') || {}).textContent,
    datei: !!document.querySelector('.sto [data-file]'),
    andereSichtbar: !!document.querySelector('.sto [data-andere]:not([hidden])'),
    db: DB.stoebern ? { schritt: DB.stoebern.schritt, werke: DB.stoebern.werke.length } : null
  }));

  /* ---------- Durchgang 1: laden, alles merken, Liste anlegen ---------- */
  await page.evaluate(() => stoebernOeffnen()); await page.waitForTimeout(600);
  P('Knopf „Andere Sammlung" fehlt im Ladeschritt', !(await stand()).andereSichtbar);
  await page.setInputFiles('.sto [data-file]', { name: 'a.json', mimeType: 'application/json', buffer: Buffer.from(A) });
  await page.waitForTimeout(600);
  P('Knopf erscheint, sobald etwas geladen ist', (await stand()).andereSichtbar);

  await page.click('.sto [data-los]'); await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) { await page.click('.sto [data-ja]'); await page.waitForTimeout(700); }
  const fertig = await page.$('.sto [data-fertig]');
  if (fertig) { await fertig.click(); await page.waitForTimeout(600); }
  const zuBloecken = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.sto button')].find(x => /Zu Blöcken ordnen/.test(x.textContent)) || null);
  await zuBloecken.asElement().click(); await page.waitForTimeout(700);
  const anlegen = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.sto button')].find(x => /leseliste anlegen/.test(x.textContent)) || null);
  P('Knopf „leseliste anlegen" da', await anlegen.evaluate(n => !!n));
  const plaeneVor = await page.evaluate(() => DB.lesepleane.length);
  await anlegen.asElement().click(); await page.waitForTimeout(1200);
  const nachAnlegen = await page.evaluate(() => ({
    plaene: DB.lesepleane.length, offen: !!document.querySelector('.sto'),
    schritt: DB.stoebern ? DB.stoebern.schritt : null
  }));
  P('leseliste wurde angelegt', nachAnlegen.plaene === plaeneVor + 1, plaeneVor + ' → ' + nachAnlegen.plaene);
  P('Stöbern hat sich geschlossen', !nachAnlegen.offen);
  P('der Durchgang steht wieder auf „laden"', nachAnlegen.schritt === 'laden', String(nachAnlegen.schritt));

  /* ---------- Genau der gemeldete Fall: wieder rein, neue Sammlung ---------- */
  await page.evaluate(() => stoebernOeffnen()); await page.waitForTimeout(800);
  const wieder = await stand();
  P('nach fertigem Stöbern steht das Dateifeld gleich da', wieder.datei,
    'Kopf: ' + wieder.kopf + ', schritt: ' + (wieder.db || {}).schritt);
  P('„Angefangenes fortsetzen" wird trotzdem angeboten',
    await page.$$eval('.sto [data-weiter]', n => n.length) === 1);

  await page.setInputFiles('.sto [data-file]', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(B) });
  await page.waitForTimeout(700);
  const neu = await page.evaluate(() => ({
    werke: DB.stoebern.werke.length, titel: DB.stoebern.werke.map(w => w.titel),
    themen: DB.stoebern.themen
  }));
  P('die neue Sammlung ist geladen', neu.werke === 2 && neu.titel.join(',') === 'Vier,Fuenf',
    neu.titel.join(', ') + ' · ' + neu.themen.join(', '));

  /* ---------- Der Kopfknopf führt aus jedem Schritt zum Laden ---------- */
  await page.click('.sto [data-los]'); await page.waitForTimeout(600);
  P('im Wischen ist der Knopf sichtbar', (await stand()).andereSichtbar);
  await page.click('.sto [data-andere]'); await page.waitForTimeout(600);
  P('ein Tipp genügt zum Ladeschritt', (await stand()).datei);

  /* ---------- Mittendrin unterbrechen: da soll die Karte zurückkommen ---------- */
  await page.setInputFiles('.sto [data-file]', { name: 'a.json', mimeType: 'application/json', buffer: Buffer.from(A) });
  await page.waitForTimeout(600);
  await page.click('.sto [data-los]'); await page.waitForTimeout(600);
  await page.click('.sto [data-ja]'); await page.waitForTimeout(700);
  await page.evaluate(() => layerSchliessen()); await page.waitForTimeout(600);
  await page.evaluate(() => stoebernOeffnen()); await page.waitForTimeout(800);
  const mitten = await stand();
  P('mitten im Stapel kommt man an die Karte zurück', !mitten.datei && mitten.kopf === 'Stöbern',
    'Kopf: ' + mitten.kopf + ', schritt: ' + (mitten.db || {}).schritt);

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
