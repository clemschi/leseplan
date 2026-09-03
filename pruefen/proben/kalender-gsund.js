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
  const cdp = await ctx.newCDPSession(page);
  const tp = (t, x, y) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: t === 'touchEnd' ? [] : [{ x, y }] });
  const f = [];
  page.on('pageerror', e => f.push(String(e)));
  await page.goto(DATEI); await saeen(page, false);
  await page.reload(); await page.waitForTimeout(500);

  /* ---------- 1. Startbildschirm im Wischgrund ---------- */
  await page.click('[data-app="minimal"]'); await page.waitForTimeout(500);
  await tp('touchStart', 8, 420);
  for (let i = 1; i <= 5; i++) { await tp('touchMove', 8 + 90 * i / 5, 420); await page.waitForTimeout(16); }
  const grund = await page.$$eval('.heimgrund .app', n => n.map(x => x.textContent));
  P('Wischgrund zeigt alle Apps', grund.length === 6 && grund[5] === 'cashflow', grund.join(', '));
  await tp('touchEnd', 0, 0); await page.waitForTimeout(800);
  await page.evaluate(() => zumStartbildschirm()); await page.waitForTimeout(300);

  /* ---------- 2. Kalender: Heute fällig flach, mit Gruppe ---------- */
  await page.click('[data-app="kalender"]'); await page.waitForTimeout(600);
  const zeilen = await page.$$eval('[data-sortheute]', ns => ns.map(n => ({
    text: n.querySelector('.rn').textContent,
    gruppe: n.querySelector('.kgruppe').textContent,
    dauer: (n.querySelector('.kdauer') || {}).textContent || ''
  })));
  P('Heute fällig ist flach', zeilen.length === 5, zeilen.length + ' Zeilen');
  P('jede Zeile trägt ihre Gruppe', zeilen.every(z => z.gruppe),
    zeilen.map(z => z.text + ' [' + z.gruppe + ' ' + z.dauer + ']').join(' | '));
  P('Tag ohne Tätigkeit steht als eigene Zeile', zeilen.some(z => z.text === 'Frist' && z.gruppe === 'Rechnung'));
  P('Routine steht mit dabei', zeilen.some(z => z.text === 'lesen' && z.gruppe === 'Routine'));
  P('ruhende Routine fehlt', !zeilen.some(z => z.text === 'Wohnung putzen'));
  const eyebrow = await page.$eval('.section-head .eyebrow ~ *, .section-head', () => 0).catch(() => 0);
  const kopf = await page.evaluate(() => {
    const hs = [...document.querySelectorAll('#kview .section-head')].find(h => h.textContent.includes('Heute fällig'));
    return hs ? hs.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  P('Summe der geplanten Dauer im Kopf', /min|h/.test(kopf), kopf);

  /* Abhaken einer Routine */
  const vorher = zeilen.length;
  await page.click('[data-fertig][data-art="routine"]');
  await page.waitForTimeout(300);
  const nachher = await page.$$eval('[data-sortheute]', n => n.length);
  P('Routine abhaken nimmt sie für heute weg', nachher === vorher - 1, vorher + ' → ' + nachher);
  P('das Abhaken steht in den Daten', await page.evaluate(() =>
    Object.keys(KDB.routinen.find(r => r.text === 'Spaziergang' || r.text === 'lesen').erledigt).length > 0
    || KDB.routinen.some(r => Object.keys(r.erledigt).length > 0)));

  /* Sortieren per langem Druck */
  const boxen = await page.$$eval('[data-sortheute]', ns => ns.map(n => {
    const r = n.getBoundingClientRect();
    return { id: n.dataset.sortheute, x: r.x + r.width / 2, y: r.y + r.height / 2, h: r.height };
  }));
  const erste = boxen[0], letzte = boxen[boxen.length - 1];
  await tp('touchStart', erste.x, erste.y);
  await page.waitForTimeout(600);                        // langer Druck
  const ziel = letzte.y + letzte.h * 0.6;
  for (let i = 1; i <= 12; i++) { await tp('touchMove', erste.x, erste.y + (ziel - erste.y) * i / 12); await page.waitForTimeout(24); }
  await tp('touchEnd', 0, 0);
  await page.waitForTimeout(500);
  const reihe = await page.evaluate(() => KDB.reihen[heute()] || []);
  const jetzt = await page.$$eval('[data-sortheute]', n => n.map(x => x.dataset.sortheute));
  P('lange drücken und schieben ordnet neu', reihe.length > 0 && jetzt[jetzt.length - 1] === erste.id,
    'gemerkt: ' + reihe.length + ' · zuletzt ' + jetzt[jetzt.length - 1] + ' / bewegt ' + erste.id);
  P('quer über die Gruppen hinweg', reihe.length > 0 && jetzt[0] !== erste.id, jetzt.join(' '));

  /* Abstand oben */
  const pad = await page.$eval('#kview', n => getComputedStyle(n).paddingTop);
  P('oberste Box hat Luft', parseFloat(pad) >= 28, pad);

  /* ---------- 3. To-Do: Platzhalter auf dem nächsten Tag ---------- */
  await page.click('[data-ktab="todo"]'); await page.waitForTimeout(400);
  const datumsfeld = await page.evaluate(() => {
    const el = document.querySelector('[data-tneu="a1"]');
    const vh = KDB.aufgaben.find(x => x.id === 'a1');
    const letzt = vh.tage.map(t => t.datum).filter(Boolean).sort().pop();
    return { wert: el.value, letzt, erwartet: kPlus(letzt, 1) };
  });
  P('Platzhalter steht auf dem Tag nach dem letzten',
    datumsfeld.wert === datumsfeld.erwartet, datumsfeld.letzt + ' → ' + datumsfeld.wert);

  /* Dauer einer Tätigkeit */
  await page.click('[data-sedit="h1"]'); await page.waitForTimeout(350);
  P('Blatt hat ein Dauerfeld', await page.$eval('.sheet [data-dauer]', n => n.value) === '45',
    await page.$eval('.sheet [data-dauer]', n => n.value));
  await page.click('.sheet [data-schnell="90"]');
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(400);
  P('Dauer übernommen', await page.evaluate(() =>
    KDB.aufgaben.find(v => v.id === 'a1').tage.find(t => t.id === 'ta1').taetigkeiten.find(x => x.id === 'h1').dauer === 90));
  const marke = await page.evaluate(() => {
    const n = [...document.querySelectorAll('.kt-marke')].find(x => x.textContent.includes('·'));
    return n ? n.textContent : '';
  });
  P('Summe steht über dem Tag', /min|h/.test(marke), marke);

  /* Routine anlegen */
  await page.click('[data-redit="ro1"]'); await page.waitForTimeout(350);
  const wt = await page.$$eval('.sheet [data-wt]', ns => ns.map(n => n.getAttribute('aria-pressed')));
  P('Routine zeigt Mo–Fr', wt.join(',') === 'true,true,true,true,true,false,false', wt.join(','));
  await page.click('.sheet [data-preset="alle"]'); await page.waitForTimeout(120);
  await page.fill('.sheet [data-dauer]', '20');
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(400);
  P('Routine geändert', await page.evaluate(() => {
    const r = KDB.routinen.find(x => x.id === 'ro1');
    return r.wochentage.length === 7 && r.dauer === 20;
  }));
  const takt = await page.$eval('[data-redit="ro1"] .rm', n => n.textContent);
  P('Takt steht als Text', takt === 'täglich', takt);

  /* ---------- 4. g'sund: Rückseite ---------- */
  await page.evaluate(() => zumStartbildschirm()); await page.waitForTimeout(300);
  await page.click('[data-app="gsund"]'); await page.waitForTimeout(700);
  const notizen = await page.$$eval('.gseite.hinten .gnotiz', ns => ns.map(n => ({
    text: n.querySelector('.gn-text').textContent,
    art: n.querySelector('.gn-art').textContent,
    treff: n.querySelector('.gn-treff').textContent
  })));
  P('drei Notizen auf der Rückseite', notizen.length === 3, JSON.stringify(notizen.map(n => n.art + '/' + n.treff)));
  P('Befürchtung und Kritik getrennt von eingetroffen',
    notizen.some(n => n.art === 'Befürchtung' && n.treff === 'nicht eingetroffen')
    && notizen.some(n => n.art === 'Kritik' && n.treff === 'eingetroffen')
    && notizen.some(n => n.treff === 'offen'));

  await page.evaluate(() => gKarteBearbeiten()); await page.waitForTimeout(400);
  const felder = await page.$$eval('.sheet .gn-feld', n => n.length);
  P('Blatt zeigt je Notiz ein Feld', felder === 3, felder + ' Felder');
  await page.click('.sheet [data-nneu]'); await page.waitForTimeout(200);
  const felder2 = await page.$$eval('.sheet .gn-feld', n => n.length);
  P('neue Notiz kommt dazu', felder2 === 4, felder2 + ' Felder');
  const letztes = await page.$$('.sheet .gn-feld textarea');
  await letztes[3].fill('Niemand kommt mit.');
  await page.click('.sheet .gn-feld[data-i="3"] [data-nart="kritik"]');
  await page.waitForTimeout(150);
  await page.click('.sheet .gn-feld[data-i="3"] [data-ntreff="ein"]');
  await page.waitForTimeout(150);
  const behalten = await page.$eval('.sheet .gn-feld[data-i="3"] textarea', n => n.value);
  P('Text überlebt das Umschalten der Marken', behalten === 'Niemand kommt mit.', behalten);
  await page.click('.sheet [data-ok]'); await page.waitForTimeout(500);
  P('vier Notizen gesichert', await page.evaluate(() => {
    const n = GDB.karte.notizen;
    return n.length === 4 && n[3].art === 'kritik' && n[3].treffer === 'ein';
  }), await page.evaluate(() => JSON.stringify(GDB.karte.notizen.map(n => n.art + '/' + n.treffer))));

  /* ---------- 5. Puzzle: Sätze ohne Grund ---------- */
  const spruch = await page.evaluate(() => {
    const d = document.createElement('div');
    d.className = 'pzspruch';
    d.innerHTML = '<span>Warum?</span>';
    document.body.appendChild(d);
    const vor = getComputedStyle(d, '::before');
    const r = { content: vor.content, bg: vor.backgroundImage, anim: vor.animationName };
    d.remove();
    return r;
  });
  P('kein Grund hinter dem Satz', spruch.content === 'none' || spruch.bg === 'none',
    'content ' + spruch.content + ', bg ' + spruch.bg);

  /* ---------- 6. Neuladen ---------- */
  await page.evaluate(() => GStore.sichern(true));
  await page.waitForTimeout(400);
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-app="kalender"]'); await page.waitForTimeout(600);
  const wieder = await page.evaluate(() => ({
    routinen: KDB.routinen.length, reihe: (KDB.reihen[heute()] || []).length,
    dauer: KDB.aufgaben.find(v => v.id === 'a1').tage.find(t => t.id === 'ta1').taetigkeiten.find(x => x.id === 'h1').dauer
  }));
  P('nach Neuladen alles da', wieder.routinen === 3 && wieder.reihe > 0 && wieder.dauer === 90, JSON.stringify(wieder));

  const echt = f.filter(x => !/ERR_|net::|google/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
