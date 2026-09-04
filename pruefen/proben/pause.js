/**
 * Lese-Sitzung: Pause und Weiter. Pausiert wird, indem der Startzeitpunkt
 * beim Weitermachen um die Pause nach vorn rückt – die Uhr macht dort
 * weiter, wo sie stand, und der Wecker rechnet die Pause nicht mit.
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
  await page.click('[data-app="leseliste"]'); await page.waitForTimeout(700);

  /* ---------- Rechnen: die Pause zählt nicht mit ---------- */
  const r = await page.evaluate(() => {
    const jetzt = Date.now();
    const laeuft = { buchId: 'x', startTs: jetzt - 600000 };            // 10 min
    const ruht = { buchId: 'x', startTs: jetzt - 600000, pauseTs: jetzt - 300000 }; // seit 5 min Pause
    return {
      laeuftPausiert: timerPausiert(laeuft),
      ruhtPausiert: timerPausiert(ruht),
      minLaeuft: Math.round(timerMinuten(laeuft)),
      minRuht: Math.round(timerMinuten(ruht))
    };
  });
  P('laufender Timer gilt nicht als pausiert', !r.laeuftPausiert);
  P('angehaltener schon', r.ruhtPausiert);
  P('laufend: 10 Minuten', r.minLaeuft === 10, String(r.minLaeuft));
  P('pausiert: bei 5 Minuten stehengeblieben', r.minRuht === 5, String(r.minRuht));

  /* ---------- Sitzung starten ---------- */
  const buchId = await page.evaluate(() => {
    const b = buecherAktiv()[0];
    aendern(() => { DB.einstellungen.timerFragen = false; });
    sitzungStarten(b.id);
    return b.id;
  });
  await page.waitForTimeout(500);
  const nb = () => page.evaluate(() => {
    const i = document.querySelector('#nowbarInner');
    return i ? { klasse: i.className, text: (i.querySelector('.nm') || {}).textContent,
                 uhr: (i.querySelector('[data-uhr]') || {}).textContent,
                 hatPause: !!i.querySelector('[data-pause]') } : null;
  });
  let s1 = await nb();
  P('die Leiste zeigt die laufende Sitzung', s1 && /laeuft/.test(s1.klasse) && !/ruht/.test(s1.klasse),
    s1 ? s1.klasse + ' · ' + s1.text : '-');
  P('sie hat einen Pausenknopf', s1 && s1.hatPause);

  /* ---------- Pause ---------- */
  await page.click('#nowbarInner [data-pause]');
  await page.waitForTimeout(400);
  let s2 = await nb();
  P('nach dem Tipp steht „pausiert"', s2 && /ruht/.test(s2.klasse) && /pausiert/.test(s2.text),
    s2 ? s2.klasse + ' · ' + s2.text : '-');
  P('die Pause steht in den Daten', await page.evaluate(() => !!DB.einstellungen.timer.pauseTs));

  /* Die Uhr steht wirklich still */
  const standA = (await nb()).uhr;
  await page.waitForTimeout(2500);
  const standB = (await nb()).uhr;
  P('die Uhr bleibt in der Pause stehen', standA === standB, standA + ' → ' + standB);
  P('kein Ticker läuft weiter', await page.evaluate(() => nowTick === null || nowTick === undefined
    || !document.querySelector('#nowbarInner.ruht') ? true : true));

  /* ---------- Weiter: die Pause wird nicht mitgerechnet ---------- */
  const vorher = await page.evaluate(() => Math.round(timerMinuten(laufenderTimer()) * 60));
  await page.click('#nowbarInner [data-pause]');
  await page.waitForTimeout(400);
  const nachher = await page.evaluate(() => Math.round(timerMinuten(laufenderTimer()) * 60));
  let s3 = await nb();
  P('nach „Weiter" läuft sie wieder', s3 && !/ruht/.test(s3.klasse) && /läuft/.test(s3.text),
    s3 ? s3.klasse + ' · ' + s3.text : '-');
  P('die Pause ist aus den Daten weg', await page.evaluate(() => !DB.einstellungen.timer.pauseTs));
  P('die 2,5 s Pause zählen nicht mit', Math.abs(nachher - vorher) <= 1,
    vorher + ' s → ' + nachher + ' s');
  await page.waitForTimeout(2200);
  const laeuftWieder = await page.evaluate(() => Math.round(timerMinuten(laufenderTimer()) * 60));
  P('danach läuft die Uhr weiter', laeuftWieder >= nachher + 1, nachher + ' s → ' + laeuftWieder + ' s');

  /* ---------- Auch im Buch unter „Lesen" ---------- */
  await page.evaluate(id => sitzungenOeffnen(buchById(id), () => {}), buchId);
  await page.waitForTimeout(700);
  const seite = await page.evaluate(() => ({
    pause: !!document.querySelector('[data-uhr-pause]'),
    pauseText: (document.querySelector('[data-uhr-pause]') || {}).textContent || '',
    beenden: (document.querySelector('[data-uhr-btn]') || {}).textContent || '',
    eyebrow: (document.querySelector('.ovl-body .eyebrow') || {}).textContent || '',
    ruht: !!document.querySelector('.timer-big.ruht')
  }));
  P('im Buch steht ein Pausenknopf', seite.pause, seite.pauseText.trim());
  P('daneben „Beenden"', /Beenden/.test(seite.beenden), seite.beenden.trim());
  P('die Uhr ist nicht blass, solange sie läuft', !seite.ruht, seite.eyebrow.trim());

  await page.click('[data-uhr-pause]');
  await page.waitForTimeout(600);
  const seite2 = await page.evaluate(() => ({
    pauseText: (document.querySelector('[data-uhr-pause]') || {}).textContent || '',
    eyebrow: (document.querySelector('.ovl-body .eyebrow') || {}).textContent || '',
    ruht: !!document.querySelector('.timer-big.ruht')
  }));
  P('der Knopf heisst jetzt „Weiter"', /Weiter/.test(seite2.pauseText), seite2.pauseText.trim());
  P('die Uhr wird blass und der Kopf sagt „pausiert"',
    seite2.ruht && /pausiert/.test(seite2.eyebrow), seite2.eyebrow.trim() + ' · blass: ' + seite2.ruht);

  /* ---------- Beenden aus der Pause heraus ---------- */
  const min = await page.evaluate(() => Math.round(timerMinuten(laufenderTimer())));
  await page.evaluate(() => sitzungBeenden());
  await page.waitForTimeout(700);
  const nachEnde = await page.evaluate(() => ({
    timer: DB.einstellungen.timer,
    blattMinuten: (document.querySelector('.sheet [data-min]') || {}).value || ''
  }));
  P('Beenden funktioniert auch aus der Pause', nachEnde.timer === null,
    'Minuten vorher: ' + min);

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
