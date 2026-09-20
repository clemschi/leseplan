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

/* Was nie im ausgelieferten Bau stehen darf.
   Die Woerter stehen absichtlich NICHT hier: dieses Verzeichnis ist
   oeffentlich, und eine Wache, die ihr Geheimnis aufschreibt, ist keine.
   Sie kommen aus marathonplan/tabu.txt, das .gitignore draussen haelt.
   Fehlt die Datei, faellt dieser Teil weg - die allgemeine Pruefung
   darunter laeuft immer. */
const tabuDatei = path.join(WURZEL, 'marathonplan', 'tabu.txt');
const TABU_ROH = fs.existsSync(tabuDatei)
  ? fs.readFileSync(tabuDatei, 'utf8').split('\n')
    .map(z => z.trim()).filter(z => z && !z.startsWith('#'))
  : [];
/* Ohne Tilde: ueberall verboten. Mit Tilde: nur im Bau. */
const TABU = TABU_ROH.map(z => z.replace(/^~/, ''));
const TABU_HART = TABU_ROH.filter(z => !z.startsWith('~'));

(async () => {
  const seite = fs.readFileSync(path.join(WURZEL, 'mylife.html'), 'utf8');

  /* Nicht nur der Bau, sondern jede versionierte Datei: einmal stand ein
     Streckenname als Testwert in einer Probe - der Bau war sauber, das
     oeffentliche Verzeichnis nicht. */
  const versioniert = require('child_process')
    .execSync('git ls-files', { cwd: WURZEL, encoding: 'utf8' })
    .split('\n').map(z => z.trim()).filter(Boolean);

  /* Immer: der Bau darf ueberhaupt keinen Plan mitbringen - egal wessen. */
  P('kein Plan-Baustein im Bau', !/LPLAN/.test(seite));
  P('keine Wochenliste im Bau', !/"wochen"\s*:\s*\[\s*\{/.test(seite)
    && !/wochen:\s*\[\s*\{/.test(seite));
  P('keine Rennliste im Bau', !/"rennen"\s*:\s*\[\s*\{/.test(seite)
    && !/rennen:\s*\[\s*\{/.test(seite));
  P('keine Streckenliste im Bau', !/strecken:\s*\[\s*\{/.test(seite));

  /* Und, wenn die Liste da ist, Wort fuer Wort. Der Zaehler steht im
     Ergebnis, damit ein stilles Ueberspringen auffaellt. */
  P('Tabu-Liste gefunden', TABU.length > 0,
    TABU.length ? TABU.length + ' Wörter' : 'marathonplan/tabu.txt fehlt – Teil übersprungen');
  TABU.forEach((t, i) => P('nicht im Bau: Wort ' + (i + 1), !seite.includes(t)));

  /* Und dasselbe über alle versionierten Dateien. */
  const dreckig = [];
  versioniert.forEach(datei => {
    let inhalt = '';
    try { inhalt = fs.readFileSync(path.join(WURZEL, datei), 'latin1'); } catch (e) { return; }
    TABU_HART.forEach(t => {
      if (inhalt.includes(t) || inhalt.includes(Buffer.from(t, 'utf8').toString('latin1'))) {
        dreckig.push(datei + ' · ' + t);
      }
    });
  });
  P('kein hartes Tabuwort in den versionierten Dateien', dreckig.length === 0,
    dreckig.length ? dreckig.slice(0, 4).join(', ')
      : versioniert.length + ' Dateien × ' + TABU_HART.length + ' Wörter geprüft');
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

  /* Einmal war das kaputt: in der Wochen-Ebene stand "0 km" auf jeder
     Karte, weil dort noch die alte Feldbezeichnung stand. Der Umfang steht
     an drei Stellen - Kopfzeile, Wochenliste, Karte - und muss überall
     dieselbe Zahl sein. */
  await p2.evaluate(() => lfWocheOeffnen(1));
  await p2.waitForTimeout(400);
  const karten = await p2.evaluate(() => {
    const soll = lfPlan().wochen[0].t.filter(Boolean).map(tg => lfKm(tg.A));
    const ist = [...document.querySelectorAll('.overlay .lfkarte-km')]
      .map(n => parseFloat(n.textContent.replace(',', '.')));
    return { soll: soll, ist: ist };
  });
  P('jede Karte zeigt ihre Kilometer', karten.ist.length === karten.soll.length
    && karten.ist.every((x, i) => Math.abs(x - karten.soll[i]) < 0.05)
    && karten.ist.every(x => x > 0),
    JSON.stringify(karten));

  /* --- 3. Plan ueber "Mehr -> Daten laden" hereinholen ---
     Einmal war das kaputt: die Daten waren da, aber lfTage() hatte seine
     Liste gemerkt und gab weiter die leere zurueck - "Heute" blieb leer,
     obwohl 52 Wochen geladen waren. */
  const tmp = path.join(require('os').tmpdir(), 'probe-laufen.json');
  const mo = new Date(); mo.setDate(mo.getDate() - ((mo.getDay() + 6) % 7));
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
  fs.writeFileSync(tmp, JSON.stringify({
    format: 'mylife-laufen', version: 1,
    plan: {
      start: iso(mo), rennen: [], tests: [],
      wochen: [{
        n: 1, p: 'Aufbau', e: 0, b: 0, t: [
          { d: 'Montag', o: 0, E: 'Locker', k: 'mo', min: 56,
            A: [{ v: 0, b: 8, w: 'locker', p: '7:00', z: 2 }],
            V: ['1:30 h vorher · Banane 120 g'], W: ['unterwegs nichts nötig'],
            N: ['0:20 h danach · Clear Protein 30 g'], S: ['B12 250 µg'] },
          null, null, null
        ]
      }]
    },
    eintraege: {}, strecken: [{ name: 'Runde', km: 8, art: 'einfach' }]
  }));

  const ctx3 = await b.newContext({ viewport: { width: 390, height: 860 }, hasTouch: true });
  const p3 = await ctx3.newPage();
  await p3.goto(DATEI);
  await saeen(p3, true);                 /* nur der Ort, kein Plan */
  await p3.reload(); await p3.waitForTimeout(400);
  await p3.click('[data-app="laufen"]'); await p3.waitForTimeout(400);
  P('vor dem Laden ist nichts da', await p3.evaluate(() => lfTage().length === 0));

  await p3.click('[data-lftab="lfmehr"]'); await p3.waitForTimeout(250);
  await p3.click('[data-dimport]'); await p3.waitForTimeout(350);
  await p3.setInputFiles('[data-file]', tmp);
  await p3.waitForTimeout(800);
  const knopf = await p3.$('.sheet .btn-primary');
  if (knopf) { await knopf.click(); await p3.waitForTimeout(800); }

  const nach = await p3.evaluate(() => ({
    wochen: lfPlan().wochen.length, tage: lfTage().length, strecken: LFDB.strecken.length
  }));
  P('nach dem Laden steht der Plan in den Daten', nach.wochen === 1 && nach.strecken === 1,
    JSON.stringify(nach));
  P('die gemerkte Tagesliste ist erneuert', nach.tage === 1, String(nach.tage));

  await p3.click('[data-lftab="lfheute"]'); await p3.waitForTimeout(350);
  const t3 = await p3.$eval('#lfview', n => n.textContent.replace(/\s+/g, ' '));
  P('Heute zeigt die Einheit statt der Leermeldung',
    /0–8 locker 7:00/.test(t3) && !/Kein Plan geladen/.test(t3), t3.slice(0, 60).trim());
  const b3 = await p3.$eval('#lfBanner', n => n.textContent.replace(/\s+/g, ' ').trim());
  P('Kopfzeile nennt die Woche', /Woche 1/.test(b3), b3);
  fs.unlinkSync(tmp);

  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
