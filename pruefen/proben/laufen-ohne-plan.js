/* Probe: laufen wird leer ausgeliefert.
   Der Plan steht nicht im Code, sondern in der eigenen Datei. Ohne Datei
   darf nichts abstürzen, jeder Reiter muss sagen, was fehlt – und im
   ausgelieferten Bau darf kein Renntermin und keine Strecke stehen. */
const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const fs = require('fs'), path = require('path');
const { saeen, SAAT } = require(__dirname + '/../saat.js');
const WURZEL = path.join(__dirname, '..', '..');
const DATEI = 'file://' + path.join(WURZEL, 'mylife.html');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

/* Was nie im ausgelieferten Bau stehen darf. */
const TABU = ['daheim \u2192 Eltern', 'Sacher', 'Urstein', 'Schönbrunn',
  'Wings for Life', 'Salzburg', 'Halbmarathon Wien', '4:30:00', '19,33',
  '2026-09-21', '16.09.2027'];

(async () => {
  const seite = fs.readFileSync(path.join(WURZEL, 'mylife.html'), 'utf8');
  TABU.forEach(t => P('nicht im Bau: ' + t, !seite.includes(t)));
  P('auch die Saat bleibt neutral',
    !TABU.some(t => JSON.stringify(SAAT['daten-laufen']).includes(t)));

  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

  /* --- 1. ganz ohne Datenbasis: nur der Speicherort ist gesetzt --- */
  const ctx = await b.newContext({ viewport: { width: 390, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const f = [];
  page.on('pageerror', e => f.push(String(e)));
  /* Fehlende Schriften sind ein Problem des Netzes, nicht der Seite. */
  const netzrauschen = t => /Failed to load resource|ERR_CERT|ERR_NAME|net::/.test(t);
  page.on('console', m => { if (m.type() === 'error' && !netzrauschen(m.text())) f.push(m.text()); });
  await page.goto(DATEI);
  await saeen(page, true);              /* nurMeta: Ort ja, Daten nein */
  await page.reload(); await page.waitForTimeout(400);
  await page.click('[data-app="laufen"]'); await page.waitForTimeout(500);
  P('App öffnet sich auch ohne Plan', await page.$eval('#lf', n => !n.hidden));

  for (const tab of ['lfheute', 'lfplan', 'lfziele', 'lfmehr']) {
    await page.click('[data-lftab="' + tab + '"]'); await page.waitForTimeout(200);
    const t = await page.$eval('#lfview', n => n.textContent);
    if (tab === 'lfmehr') {
      P(tab + ': sagt, dass kein Plan da ist', /noch keiner geladen/.test(t));
    } else {
      P(tab + ': sagt, dass kein Plan da ist', /Kein Plan geladen/.test(t), t.slice(0, 50).trim());
    }
  }
  const leer = await page.evaluate(() => ({
    wochen: lfPlan().wochen.length, rennen: lfPlan().rennen.length,
    strecken: LFDB.strecken.length, tage: lfTage().length
  }));
  P('Plan ist wirklich leer', leer.wochen === 0 && leer.rennen === 0
    && leer.strecken === 0 && leer.tage === 0, JSON.stringify(leer));
  const banner = await page.$eval('#lfBanner', n => n.textContent.trim());
  P('Kopfzeile nennt den fehlenden Plan', /Kein Plan/.test(banner), banner);
  P('Vorhang öffnet ohne Plan keine leere Ebene',
    await page.evaluate(() => lfLeistungOeffnen(false) === null));
  P('kein Fehler in der Konsole', f.length === 0, f.slice(0, 2).join(' | '));

  /* --- 2. mit Plan aus der Datenbasis: alles da --- */
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 860 }, hasTouch: true });
  const p2 = await ctx2.newPage();
  const f2 = [];
  p2.on('pageerror', e => f2.push(String(e)));
  await p2.goto(DATEI);
  await saeen(p2, false);
  await p2.reload(); await p2.waitForTimeout(400);
  await p2.click('[data-app="laufen"]'); await p2.waitForTimeout(500);
  const voll = await p2.evaluate(() => ({
    wochen: lfPlan().wochen.length, rennen: lfPlan().rennen.length,
    tests: lfPlan().tests.length, tage: lfTage().length,
    strecken: LFDB.strecken.length
  }));
  P('Plan kommt aus der Datei', voll.wochen === 3 && voll.rennen === 1
    && voll.tests === 1 && voll.tage === 9, JSON.stringify(voll));
  for (const tab of ['lfplan', 'lfziele', 'lfheute']) {
    await p2.click('[data-lftab="' + tab + '"]'); await p2.waitForTimeout(200);
  }
  P('mit Plan kein Fehler in der Konsole', f2.length === 0, f2.slice(0, 2).join(' | '));

  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
