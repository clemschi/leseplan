const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const path = require('path');
const { saeen } = require(__dirname + '/../saat.js');
const DATEI = 'file://' + path.join(__dirname, '..', '..', 'mylife.html');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }]
  });

  await page.goto(DATEI);
  await saeen(page, false);
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-app="cash"]'); await page.waitForTimeout(500);

  const box = await (await page.$('.cabahn')).boundingBox();
  const y = box.y + box.height / 2;

  // Ziehen mit dem Finger quer über die Bahn
  await tp('touchStart', box.x + 20, y);
  for (let i = 1; i <= 10; i++) { await tp('touchMove', box.x + 20 + (box.width - 60) * i / 10, y); await page.waitForTimeout(16); }
  await tp('touchEnd', 0, 0);
  await page.waitForTimeout(250);
  const z = await page.evaluate(() => ({ ziel: caZiel, ende: caEnde, zieht: !!window.__zieht,
    heim: getComputedStyle(document.body).getPropertyValue('--heimzug') }));
  P('Finger zieht den Zeiger bis fast ans Ende', z.ziel > '2027-06', z.ziel + ' (Ende ' + z.ende + ')');
  P('Zug wieder freigegeben', z.zieht === false);
  P('App ist nicht heimgewandert', await page.$eval('#ca', n => !n.hidden));
  P('kein body.heimzug hängen geblieben', !(await page.evaluate(() => document.body.classList.contains('heimzug'))));

  // heimZiehen vom linken Rand muss weiter gehen
  await page.evaluate(() => window.scrollTo(0, 0));
  await tp('touchStart', 8, 300);
  for (let i = 1; i <= 12; i++) { await tp('touchMove', 8 + 330 * i / 12, 300); await page.waitForTimeout(16); }
  await tp('touchEnd', 0, 0);
  await page.waitForTimeout(700);
  P('vom Rand geht es heim', await page.$eval('#setup', n => !n.hidden));

  // Leerer Zustand
  /* Eigener Kontext: eine zweite Seite im selben teilte sich die Datenbank,
     der „leere" Fall wäre dann gar nicht leer. */
  const ctx2 = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const p2 = await ctx2.newPage();
  await p2.goto(DATEI);
  await saeen(p2, true);
  await p2.reload(); await p2.waitForTimeout(500);
  const f2 = [];
  p2.on('pageerror', e => f2.push(String(e)));
  await p2.click('[data-app="cash"]'); await p2.waitForTimeout(600);
  const leer = await p2.evaluate(() => ({
    offen: !document.querySelector('#ca').hidden,
    zahl: (document.querySelector('.cazahl b') || {}).textContent,
    bahn: !!document.querySelector('.cabahn')
  }));
  P('leer: App öffnet, Zahl und Bahn da', leer.offen && leer.bahn && /0,00/.test(leer.zahl || ''), JSON.stringify(leer));
  for (const t of ['routinen', 'posten', 'camehr', 'stand']) {
    await p2.click('[data-catab="' + t + '"]'); await p2.waitForTimeout(200);
  }
  P('leer: alle Reiter ohne Fehler', f2.length === 0, f2.slice(0, 2).join(' | '));

  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
