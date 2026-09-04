/**
 * g'sund, Rückseite: kein Freitextfeld mehr, nur noch Notizen – jede mit
 * ihrem Tag, klein und ganz oben. Vorder- und Rückseite haben getrennte
 * Masken; ein Tipp öffnet die, die man gerade vor sich hat.
 */
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
  await page.click('[data-app="gsund"]'); await page.waitForTimeout(800);

  /* ---------- Der alte Freitext ist zur Notiz geworden ---------- */
  const k = await page.evaluate(() => ({
    hatFreitext: 'rueckseite' in GDB.karte,
    n: GDB.karte.notizen.length,
    erste: GDB.karte.notizen[0],
    alleMitDatum: GDB.karte.notizen.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x.datum))
  }));
  P('kein Freitextfeld mehr im Modell', !k.hatFreitext);
  P('der alte Freitext steht als Notiz da', k.n === 4 && /dreimal die Woche/.test(k.erste.text),
    k.n + ' Notizen, erste: ' + (k.erste || {}).text);
  P('jede Notiz trägt ein Datum', k.alleMitDatum);

  /* ---------- Auf der Karte: Datum oben, klein ---------- */
  const auf = await page.evaluate(() => {
    const n = document.querySelector('.gseite.hinten .gnotiz');
    if (!n) return null;
    const d = n.querySelector('.gn-datum'), t = n.querySelector('.gn-text');
    const gr = el => parseFloat(getComputedStyle(el).fontSize);
    return {
      hatDatum: !!d, datumText: d ? d.textContent.trim() : '',
      datumOben: d && t ? d.getBoundingClientRect().top <= t.getBoundingClientRect().top : false,
      gDatum: d ? gr(d) : 0, gText: t ? gr(t) : 0,
      gMarke: gr(n.querySelector('.gn-art')),
      freitext: !!document.querySelector('.gseite.hinten .g-frei')
    };
  });
  P('die Notiz auf der Karte trägt ihr Datum', auf && auf.hatDatum, auf ? auf.datumText : '-');
  P('das Datum steht über dem Text', auf && auf.datumOben);
  P('das Datum ist das Kleinste', auf && auf.gDatum < auf.gText && auf.gDatum <= auf.gMarke,
    auf ? auf.gDatum + ' px Datum, ' + auf.gText + ' px Text, ' + auf.gMarke + ' px Marke' : '-');
  P('alles klein gehalten', auf && auf.gText <= 13 && auf.gDatum <= 9,
    auf ? 'Text ' + auf.gText + ' px, Datum ' + auf.gDatum + ' px' : '-');
  P('kein Freitext-Absatz mehr auf der Karte', auf && !auf.freitext);

  /* ---------- Getrennte Masken ---------- */
  await page.evaluate(() => { gGedreht = false; });
  await page.click('.gkarte'); await page.waitForTimeout(400);
  let m = await page.evaluate(() => ({
    titel: (document.querySelector('.sheet .ovl-head .t, .sheet h2, .sheet .sheet-titel') || {}).textContent || document.querySelector('.sheet').textContent.slice(0, 40),
    hatTitelFeld: !!document.querySelector('.sheet [data-t]'),
    hatNotizen: !!document.querySelector('.sheet [data-notizen]'),
    hatFreitext: !!document.querySelector('.sheet [data-r]')
  }));
  P('vorne: nur die Vorderseite', m.hatTitelFeld && !m.hatNotizen, JSON.stringify(m));
  P('vorne: kein Freitextfeld', !m.hatFreitext);

  /* Der Weg auf die andere Seite */
  await page.click('.sheet [data-zurueck]'); await page.waitForTimeout(500);
  m = await page.evaluate(() => ({
    hatTitelFeld: !!document.querySelector('.sheet [data-t]'),
    hatNotizen: !!document.querySelector('.sheet [data-notizen]'),
    felder: document.querySelectorAll('.sheet .gn-feld').length
  }));
  P('hinten: nur die Notizen', m.hatNotizen && !m.hatTitelFeld, JSON.stringify(m));
  P('je Notiz ein Kasten', m.felder === 4, m.felder + ' Kästen');

  /* ---------- Neue Notiz bekommt das heutige Datum ---------- */
  await page.click('.sheet [data-nneu]'); await page.waitForTimeout(300);
  const neuesDatum = await page.evaluate(() => {
    const f = document.querySelectorAll('.sheet .gn-feld');
    const letzt = f[f.length - 1];
    return { text: letzt.querySelector('.gn-datum').textContent.trim(), n: f.length };
  });
  P('die neue Notiz zeigt schon ihren Tag', neuesDatum.n === 5 && !!neuesDatum.text, neuesDatum.text);

  await page.fill('.sheet .gn-feld[data-i="4"] textarea', 'Frisch notiert.');
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(600);
  const gesichert = await page.evaluate(() => {
    const n = GDB.karte.notizen[GDB.karte.notizen.length - 1];
    return { text: n.text, datum: n.datum, heute: heute(), n: GDB.karte.notizen.length };
  });
  P('sie ist mit dem heutigen Datum gesichert',
    gesichert.n === 5 && gesichert.text === 'Frisch notiert.' && gesichert.datum === gesichert.heute,
    JSON.stringify(gesichert));

  /* ---------- Gedreht öffnet die Rückseite ---------- */
  await page.evaluate(() => { gGedreht = true; });
  await page.click('.gkarte'); await page.waitForTimeout(500);
  const gedreht = await page.evaluate(() => ({
    hatNotizen: !!document.querySelector('.sheet [data-notizen]'),
    hatTitelFeld: !!document.querySelector('.sheet [data-t]')
  }));
  P('gedreht führt der Tipp auf die Rückseite', gedreht.hatNotizen && !gedreht.hatTitelFeld,
    JSON.stringify(gedreht));

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
