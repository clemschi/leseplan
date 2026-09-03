const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const http = require('http'), fs = require('fs'), path = require('path');
const { saeen } = require(__dirname + '/../saat.js');
const WURZEL = require('path').join(__dirname, '..', '..');
const TYP = { '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json' };
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

/* Ein Server wie GitHub Pages: Dateien aus dem Wurzelverzeichnis. */
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const datei = path.join(WURZEL, p);
  if (!fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.writeHead(404); res.end('nix'); return; }
  res.writeHead(200, { 'content-type': TYP[path.extname(datei)] || 'application/octet-stream' });
  res.end(fs.readFileSync(datei));
});

(async () => {
  await new Promise(r => srv.listen(8731, r));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

  /* --- 1. unter einer Adresse: Weiche, Manifest, App --- */
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const f = [];
  page.on('pageerror', e => f.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') f.push(m.text()); });

  await page.goto('http://127.0.0.1:8731/');
  await page.waitForTimeout(600);
  P('kurze Adresse landet auf mylife.html', page.url().endsWith('/mylife.html'), page.url());
  P('Startbildschirm ist da', await page.$eval('#setup', n => !n.hidden));
  const apps = await page.$$eval('#setup .app', n => n.map(x => x.textContent));
  P('alle sechs Apps', apps.length === 6, apps.join(', '));

  const man = await page.evaluate(() => {
    const l = document.querySelector('link[rel="manifest"]');
    return l ? l.getAttribute('href') : null;
  });
  P('Manifest ist angemeldet', man === 'mylife.webmanifest', String(man));
  const mres = await page.evaluate(async () => {
    const r = await fetch('mylife.webmanifest');
    const j = await r.json();
    return { ok: r.ok, name: j.name, display: j.display, start: j.start_url };
  });
  P('Manifest laesst sich laden', mres.ok && mres.name === 'mylife' && mres.display === 'standalone',
    JSON.stringify(mres));

  /* Die App laeuft dort genauso */
  await saeen(page, false);
  await page.reload(); await page.waitForTimeout(600);
  await page.click('[data-app="cash"]'); await page.waitForTimeout(600);
  P('cashflow oeffnet unter der Adresse', await page.$eval('#ca', n => !n.hidden));
  await page.evaluate(() => zumStartbildschirm()); await page.waitForTimeout(300);
  await page.click('[data-app="kalender"]'); await page.waitForTimeout(600);
  P('Kalender oeffnet unter der Adresse', await page.$$eval('[data-sortheute]', n => n.length) > 0);

  const echt1 = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler unter der Adresse', echt1.length === 0, echt1.slice(0, 3).join(' | '));

  /* --- 2. als Datei: kein Manifest, nichts kaputt --- */
  const ctx2 = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const p2 = await ctx2.newPage();
  const f2 = [];
  p2.on('pageerror', e => f2.push(String(e)));
  p2.on('console', m => { if (m.type() === 'error') f2.push(m.text()); });
  await p2.goto('file://' + WURZEL + '/mylife.html');
  await p2.waitForTimeout(600);
  P('als Datei kein Manifest-Verweis', await p2.evaluate(() => !document.querySelector('link[rel="manifest"]')));
  P('als Datei laeuft sie weiter', await p2.$eval('#setup', n => !n.hidden));
  const echt2 = f2.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler als Datei', echt2.length === 0, echt2.slice(0, 3).join(' | '));

  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close(); srv.close();
  process.exit(fehl ? 1 : 0);
})();
