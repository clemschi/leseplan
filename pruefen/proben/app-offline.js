/* Probe: mylife muss sich als App ablegen lassen und ohne Netz starten.
   Geprüft wird unter einer Adresse (localhost zählt dem Browser als sichere
   Herkunft): Manifest angemeldet, Dienst-Arbeiter übernimmt, und nach dem
   Abschalten des Netzes lädt die Seite weiter aus dem Zwischenspeicher. */
const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const http = require('http'), fs = require('fs'), path = require('path');
const WURZEL = path.join(__dirname, '..', '..');
const TYP = {
  '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.js': 'text/javascript; charset=utf-8'
};
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

/* Ein Server wie GitHub Pages. Nur die Dateien, die auch dort liegen. */
const ERLAUBT = ['/index.html', '/mylife.html', '/mylife.webmanifest', '/mylife-sw.js', '/puzzle.html'];
let abrufe = 0;
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  if (!ERLAUBT.includes(p)) { res.writeHead(404); res.end('nix'); return; }
  abrufe++;
  res.writeHead(200, {
    'content-type': TYP[path.extname(p)] || 'application/octet-stream',
    'cache-control': 'no-cache'
  });
  res.end(fs.readFileSync(path.join(WURZEL, p)));
});

(async () => {
  await new Promise(r => srv.listen(8732, r));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8732/');
  await page.waitForTimeout(700);
  P('kurze Adresse landet auf mylife.html', page.url().endsWith('/mylife.html'), page.url());
  P('Manifest ist angemeldet',
    await page.$eval('link[rel="manifest"]', n => n.getAttribute('href')) === 'mylife.webmanifest');

  const man = await page.evaluate(async () => (await fetch('mylife.webmanifest')).json());
  P('Manifest startet in der App', man.display === 'standalone' && man.start_url === './mylife.html',
    man.display + ' ' + man.start_url);
  P('Manifest bringt ein Zeichen mit', Array.isArray(man.icons) && man.icons.length > 0);

  /* Der Dienst-Arbeiter braucht einen Augenblick, bis er übernimmt. */
  const dienst = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    for (let i = 0; i < 60 && !navigator.serviceWorker.controller; i++) {
      await new Promise(x => setTimeout(x, 100));
    }
    return {
      da: !!r.active, steuert: !!navigator.serviceWorker.controller,
      quelle: r.active ? r.active.scriptURL : '',
      speicher: await caches.keys()
    };
  });
  P('Dienst-Arbeiter ist aktiv', dienst.da, dienst.quelle);
  P('Dienst-Arbeiter steuert die Seite', dienst.steuert);
  P('genau ein Zwischenspeicher, nach Fassung benannt',
    dienst.speicher.length === 1 && /^mylife-[0-9a-f]{12}$/.test(dienst.speicher[0]),
    dienst.speicher.join(', '));

  const drin = await page.evaluate(async () => {
    const c = await caches.open((await caches.keys())[0]);
    const k = await c.keys();
    return k.map(r => r.url.replace(location.origin, ''));
  });
  P('Seite liegt im Zwischenspeicher', drin.some(u => u.endsWith('/mylife.html')), drin.join(' '));
  P('Weiche liegt im Zwischenspeicher', drin.some(u => u.endsWith('/index.html') || u === '/'));

  /* Jetzt den Server ganz abschalten. Nur so ist es eindeutig: was danach
     noch lädt, kommt aus dem Zwischenspeicher und von nirgendwo sonst. */
  await new Promise(r => srv.close(r));
  const tot = await fetch('http://localhost:8732/mylife.html').then(() => true).catch(() => false);
  P('Server ist wirklich aus', tot === false);

  await page.goto('http://localhost:8732/mylife.html');
  await page.waitForTimeout(900);
  const ohneNetz = await page.evaluate(() => ({
    setup: !!document.getElementById('setup'),
    apps: [...document.querySelectorAll('#setup .app')].map(x => x.textContent),
    titel: document.title,
    leiste: !!document.querySelector('#setup .leiste')
  }));
  P('ohne Server: Seite lädt', ohneNetz.titel === 'mylife' && ohneNetz.setup, ohneNetz.titel);
  P('ohne Server: alle sieben Apps da', ohneNetz.apps.length === 7, ohneNetz.apps.join(', '));
  P('ohne Server: Startbildschirm vollständig', ohneNetz.leiste);

  /* Eine frische Herkunft hat noch keinen Speicherort - die App fragt danach.
     Genau das muss auch ohne Server gehen. */
  await page.click('[data-app="laufen"]');
  await page.waitForTimeout(600);
  const auf = await page.evaluate(() => {
    const s = document.getElementById('setup');
    return { setupOffen: s && !s.hidden, text: (s ? s.textContent : '').slice(0, 60) };
  });
  P('ohne Server: laufen fragt nach dem Speicherort',
    auf.setupOffen && /laufen|Speicher|Ort|Datei/i.test(auf.text), auf.text.trim());
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
