const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const { saeen } = require(__dirname + '/../saat.js');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };
const LINKS = [
  'https://shop.zeit.de/sortiment/buecher/zeit-buchempfehlungen/zeit-sachbuch-bestenliste/sachbuchbestenliste-2026',
  'https://shop.falter.at/sachbuecher-des-monats',
  'https://www.perlentaucher.de/stichwort/zeit-sachbuch-bestenliste-01-2026/buecher.html',
  'https://de.gegenstandpunkt.com/publikationen/buecher'
];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const f = [];
  page.on('pageerror', e => f.push(String(e)));
  await page.goto('file://' + require('path').join(__dirname, '..', '..', 'mylife.html'));
  await saeen(page, false);
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-app="leseliste"]'); await page.waitForTimeout(700);

  /* ---------- Adressen erkennen ---------- */
  const adr = await page.evaluate(() => ({
    ohneSchema: webAdressen('shop.falter.at/sachbuecher-des-monats').gut,
    doppelt: webAdressen('https://a.de/x\nhttps://a.de/x').gut.length,
    mist: webAdressen('blabla\nhttps://ok.de/1').schlecht,
    wirt: webWirt('https://www.perlentaucher.de/stichwort/x.html')
  }));
  P('Adresse ohne https wird ergänzt', adr.ohneSchema[0] === 'https://shop.falter.at/sachbuecher-des-monats', adr.ohneSchema[0]);
  P('gleiche Adresse nur einmal', adr.doppelt === 1);
  P('was keine Adresse ist, fällt auf', adr.mist.length === 1 && adr.mist[0] === 'blabla', adr.mist.join(','));
  P('Wirtsname ohne www', adr.wirt === 'perlentaucher.de', adr.wirt);

  /* ---------- Blatt ---------- */
  await page.click('[data-tab="mehr"]'); await page.waitForTimeout(500);
  P('Zeile steht im Mehr', await page.$$eval('[data-ki-web]', n => n.length) === 1);
  await page.click('[data-ki-web]'); await page.waitForTimeout(400);

  await page.fill('.sheet [data-web]', LINKS.join('\n') + '\nkeineadresse');
  await page.dispatchEvent('.sheet [data-web]', 'input');
  await page.waitForTimeout(200);
  const z = await page.$eval('.sheet [data-webzaehler]', n => n.textContent);
  P('Zähler nennt vier Wirte und den Ausreisser',
    /4 Adressen/.test(z) && /shop\.zeit\.de/.test(z) && /gegenstandpunkt\.com/.test(z) && /1 passt nicht/.test(z), z);

  P('Sachgebiete-Feld sichtbar', !(await page.$eval('.sheet [data-feldGebiete]', n => n.hidden)));
  await page.check('.sheet input[name=stowthema][value=quelle]');
  await page.waitForTimeout(150);
  P('nach Herkunft blendet Sachgebiete aus', await page.$eval('.sheet [data-feldGebiete]', n => n.hidden));
  await page.check('.sheet input[name=stowthema][value=sach]');
  await page.waitForTimeout(150);
  await page.fill('.sheet [data-gebiete]', '4');
  await page.fill('.sheet [data-anzahl]', '40');
  await page.dispatchEvent('.sheet [data-anzahl]', 'input');
  await page.waitForTimeout(150);
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(500);

  const prompt = await page.$eval('.sheet pre', n => n.textContent);
  P('alle vier Adressen im Prompt', LINKS.every(u => prompt.includes(u)));
  P('die Nicht-Adresse nicht', !prompt.includes('keineadresse'));
  P('Seiten sollen wirklich aufgerufen werden', /Ruf jede dieser Seiten wirklich auf/.test(prompt));
  P('nichts aus dem Gedächtnis', /Nichts aus dem Gedächtnis ergänzen/.test(prompt));
  P('Entdoppeln steht als eigener Abschnitt', /## Keine Dopplungen/.test(prompt));
  P('auch andere Ausgaben zählen als dasselbe Werk',
    /verschiedene Ausgaben, Auflagen oder Übersetzungen desselben Werks/.test(prompt));
  P('Mehrfachnennung wird vermerkt', /Gelistet bei:/.test(prompt));
  P('vier Sachgebiete verlangt', /\*\*4 Sachgebiete\*\*/.test(prompt));
  P('Obergrenze übernommen', /Höchstens 40 Werke/.test(prompt));
  P('Stöber-Schema, nicht Plan-Schema',
    prompt.includes('"format": "leseliste-stoebern"') && !prompt.includes('"lesepleane"'));
  P('Datei heisst stoebern.json', /stoebern\.json/.test(prompt));
  P('Shop-Adresse gehört nicht in link', /"link" bleibt leer/.test(prompt));
  P('kein Werbetext übernehmen', /Übernimm keinen Werbetext/.test(prompt));

  /* Sperrliste aus der eigenen leseliste */
  const meine = await page.evaluate(() => DB.buecher.map(x => x.titel));
  P('was ich schon habe, steht als Sperrliste drin',
    /## Was ich schon habe/.test(prompt) && meine.every(t => prompt.includes(t)),
    meine.join(', '));

  /* ohne Haken faellt die Sperrliste weg */
  await page.evaluate(() => alleLayerSchliessen()); await page.waitForTimeout(400);
  await page.click('[data-ki-web]'); await page.waitForTimeout(400);
  await page.fill('.sheet [data-web]', LINKS[0]);
  await page.uncheck('.sheet [data-ohnevorhanden]');
  await page.check('.sheet input[name=stowthema][value=quelle]');
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(400);
  const p2 = await page.$eval('.sheet pre', n => n.textContent);
  P('ohne Haken keine Sperrliste', !/## Was ich schon habe/.test(p2));
  P('nach Herkunft: je Adresse ein Thema', /Je Adresse \*\*ein Thema\*\*/.test(p2));

  /* ---------- Gegenprobe: so eine Datei muss ins Stöbern passen ---------- */
  const antwort = {
    format: 'leseliste-stoebern', version: 1,
    themen: ['Gesellschaft', 'Geschichte'],
    werke: [
      { titel: 'Erstes Sachbuch', thema: 'Gesellschaft', autor: 'A. Autorin',
        autoren: [{ name: 'A. Autorin', geb: 1970, gest: null, bio: 'Zwei Sätze.', einfluss: [] }],
        jahr: 2024, seiten: 320, seitenUnsicher: false, ausgabe: 'Suhrkamp 2024',
        link: '', beschreibung: 'Worum es geht. Gelistet bei: ZEIT, Perlentaucher.',
        kurz: 'Kurz gesagt.', schwierigkeit: 3, besitz: 'fehlt' },
      { titel: 'Zweites Sachbuch', thema: 'Geschichte', autor: 'B. Autor',
        autoren: [{ name: 'B. Autor', geb: 1955, gest: null, bio: 'Auch zwei.', einfluss: [] }],
        jahr: 2023, seiten: 480, seitenUnsicher: false, ausgabe: 'Hanser 2023',
        link: '', beschreibung: 'Worum es geht. Gelistet bei: Falter.',
        kurz: 'Auch kurz.', schwierigkeit: 4, besitz: 'fehlt' }
    ]
  };
  const geladen = await page.evaluate(a => {
    const w = stoWerkeAus(a);
    return { n: w.length, themen: [...new Set(w.map(x => x.thema))], titel: w.map(x => x.titel),
             autor: w[0].autoren[0].name, jahr: w[0].jahr, besch: w[0].beschreibung };
  }, antwort);
  P('Stöbern liest die Datei', geladen.n === 2 && geladen.titel.length === 2, geladen.titel.join(', '));
  P('Themen kommen an', geladen.themen.join(',') === 'Gesellschaft,Geschichte', geladen.themen.join(','));
  P('Autor und Jahr kommen an', geladen.autor === 'A. Autorin' && geladen.jahr === 2024);
  P('der Herkunftsvermerk bleibt erhalten', /Gelistet bei: ZEIT, Perlentaucher\./.test(geladen.besch));

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
