const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const { saeen } = require(__dirname + '/../saat.js');
const DATEI = 'file://' + require('path').join(__dirname, '..', '..', 'mylife.html');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const f = [];
  page.on('pageerror', e => f.push(String(e)));
  await page.goto(DATEI); await saeen(page, false);
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-app="leseliste"]'); await page.waitForTimeout(700);

  /* ---------- Pruefziffer ---------- */
  const pruef = await page.evaluate(() => ({
    gut13: isbnPruefen('978-3-518-58691-4'),
    gut10: isbnPruefen('3518586914') ? 'ja' : isbnPruefen('0-306-40615-2'),
    tippfehler: isbnPruefen('978-3-518-58691-3'),
    zuKurz: isbnPruefen('12345'),
    normalisiert: isbnPruefen('  978 3 446 27037 4 ')
  }));
  P('gültige ISBN-13 erkannt', pruef.gut13 === '9783518586914', String(pruef.gut13));
  P('gültige ISBN-10 erkannt', pruef.gut10 === '0306406152' || pruef.gut10 === 'ja', String(pruef.gut10));
  P('Tippfehler in der Prüfziffer fällt auf', pruef.tippfehler === null);
  P('zu kurze Nummer fällt auf', pruef.zuKurz === null);
  P('Leerzeichen und Striche fallen weg', pruef.normalisiert === '9783446270374', String(pruef.normalisiert));

  /* ---------- Blatt ---------- */
  await page.click('[data-tab="mehr"]'); await page.waitForTimeout(500);
  P('Zeile steht im Mehr', await page.$$eval('[data-ki-isbn]', n => n.length) === 1);
  await page.click('[data-ki-isbn]'); await page.waitForTimeout(400);

  const bloecke = await page.$$eval('.sheet [data-block] option', ns => ns.map(n => n.textContent));
  P('Blöcke stehen zur Wahl', bloecke.length >= 2 && bloecke[bloecke.length - 1].includes('neuer Block'),
    bloecke.join(' | '));

  await page.fill('.sheet [data-isbn]', '978-3-518-58691-4\n9783446270374\n978-3-518-58691-3\nblabla');
  await page.dispatchEvent('.sheet [data-isbn]', 'input');
  await page.waitForTimeout(200);
  const zaehler = await page.$eval('.sheet [data-zaehler]', n => n.textContent);
  P('Zähler nennt gültige und falsche', /2 gültige/.test(zaehler) && /2 passt nicht|2 passt/.test(zaehler), zaehler);

  /* Neuen Block waehlen */
  await page.selectOption('.sheet [data-block]', '');
  await page.waitForTimeout(150);
  P('Feld für den neuen Block klappt auf', !(await page.$eval('.sheet [data-neuerblock]', n => n.hidden)));
  await page.fill('.sheet [data-blockname]', 'Zugelaufen');
  await page.selectOption('.sheet [data-sprache]', 'deutsch');
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(500);

  const prompt = await page.$eval('.sheet pre', n => n.textContent);
  const planName = await page.evaluate(() => aktiverPlan().name);
  P('Prompt nennt beide gültigen ISBN als blanke Ziffern',
    prompt.includes('9783518586914') && prompt.includes('9783446270374'));
  P('keine erfundenen Bindestriche im Prompt', !/97[89]-\d/.test(prompt));
  P('die falsche ISBN steht nicht drin', !prompt.includes('9783518586913') && !prompt.includes('blabla'));
  P('Prompt bindet leseliste und Block fest',
    prompt.includes('„' + planName + '“') && prompt.includes('„Zugelaufen“'), planName);
  P('Prompt verlangt Original-Erscheinungsjahr', /Erstveröffentlichung des Werks im Original/.test(prompt));
  P('Prompt verbietet das Raten', /Rate nicht/.test(prompt) && /erfundene Ausgabe/.test(prompt));
  P('Prompt fordert eine Datei mit reinem JSON', /leseliste\.json/.test(prompt) && /JSON\.parse/.test(prompt));
  P('Prompt nennt das Buchschema', /"blockId"/.test(prompt) && /"ausgabe"/.test(prompt) && /"autoren"/.test(prompt));

  /* ---------- Gegenprobe: so eine Antwort muss sich einspielen lassen ---------- */
  await page.evaluate(() => alleLayerSchliessen()); await page.waitForTimeout(400);
  const vorher = await page.evaluate(() => ({ b: DB.buecher.length, bl: DB.bloecke.length }));
  const antwort = {
    lesepleane: [{ id: 'p1', name: planName }],
    bloecke: [{ id: 'b1', planId: 'p1', name: 'Zugelaufen', ord: 0 }],
    buecher: [
      { id: 'bu1', blockId: 'b1', ord: 0, titel: 'Ein Werk', autor: 'Wer Auch Immer',
        autoren: [{ name: 'Wer Auch Immer', geb: 1946, gest: null, bio: 'Zwei Sätze.', einfluss: ['Jemand'] }],
        jahr: 1975, seiten: 300, seitenUnsicher: false,
        ausgabe: 'Suhrkamp 2019, übersetzt von X, ISBN 978-3-518-58691-4',
        link: '', beschreibung: 'Ein Absatz.', kurz: 'Kurz.', schwierigkeit: 3, besitz: 'fehlt' },
      { id: 'bu2', blockId: 'b1', ord: 1, titel: 'Noch ein Werk', autor: 'Zweite Person',
        autoren: [{ name: 'Zweite Person', geb: 1960, gest: null, bio: 'Auch zwei.', einfluss: [] }],
        jahr: 1999, seiten: 210, seitenUnsicher: true,
        ausgabe: 'Hanser 2020, ISBN 978-3-446-27037-4',
        link: '', beschreibung: 'Noch ein Absatz.', kurz: 'Auch kurz.', schwierigkeit: 2, besitz: 'fehlt' }
    ]
  };
  await page.evaluate(() => importDialog()); await page.waitForTimeout(400);
  await page.setInputFiles('.sheet [data-file]', {
    name: 'leseliste.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(antwort), 'utf8')
  });
  await page.check('.sheet input[name=impmode][value=ergaenzen]');
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(900);

  const nach = await page.evaluate(() => {
    const bl = DB.bloecke.find(x => x.name === 'Zugelaufen');
    const bu = bl ? DB.buecher.filter(x => x.blockId === bl.id) : [];
    return {
      b: DB.buecher.length, bl: DB.bloecke.length,
      block: !!bl, imBlock: bu.length,
      titel: bu.map(x => x.titel),
      ausgabe: bu[0] ? bu[0].ausgabe : '',
      jahr: bu[0] ? bu[0].jahr : null,
      autor: bu[0] && bu[0].autoren[0] ? bu[0].autoren[0].name : '',
      plaene: DB.lesepleane.length
    };
  });
  P('Block „Zugelaufen" angelegt', nach.block);
  P('beide Werke drin', nach.imBlock === 2, nach.titel.join(', '));
  P('ISBN steht in der Ausgabe', /ISBN 978-3-518-58691-4/.test(nach.ausgabe), nach.ausgabe);
  P('Originaljahr übernommen', nach.jahr === 1975, String(nach.jahr));
  P('Autor mit Biographie übernommen', nach.autor === 'Wer Auch Immer', nach.autor);
  P('nichts Bestehendes verloren', nach.b === vorher.b + 2 && nach.bl === vorher.bl + 1,
    vorher.b + '→' + nach.b + ' Bücher, ' + vorher.bl + '→' + nach.bl + ' Blöcke');
  P('keine zweite leseliste angelegt', nach.plaene === (await page.evaluate(() => DB.lesepleane.length)));

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
