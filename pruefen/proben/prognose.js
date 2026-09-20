/* Probe: nach jedem Test wird die Schätzung schärfer.
   Aus dem jüngsten eingetragenen Testergebnis rechnet die App die
   Wettkampfzeiten hoch – Riegel für alles, der Marathonfaktor nur für den
   Marathon. Geprüft wird die Rechnung selbst und der Weg durch die App:
   Ist-Zeit eintragen, Prognose ändert sich, zweiter Test sticht den ersten. */
const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const path = require('path');
const { saeen } = require(__dirname + '/../saat.js');
const DATEI = 'file://' + path.join(__dirname, '..', '..', 'mylife.html');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(DATEI);
  await saeen(page, false);
  await page.reload(); await page.waitForTimeout(400);
  await page.click('[data-app="laufen"]'); await page.waitForTimeout(400);

  /* --- 1. Die Bausteine für sich --- */
  const r = await page.evaluate(() => ({
    lesen: [zeitLesen('28:32'), zeitLesen('1:53:07'), zeitLesen('26:00'),
            zeitLesen('Unsinn'), zeitLesen('')],
    text: [zeitText(1712), zeitText(6787), zeitText(120)],
    pace: [paceText(341), paceText(274)],
    /* 5 km in 25:00 → 10 km über Riegel */
    riegel: Math.round(riegel(1500, 5, 10, 1.06)),
    /* derselbe Lauf auf den Marathon: erst Halbmarathon, dann Faktor */
    mara: Math.round(hochrechnen(1500, 5, 42.195, { exponent: 1.06, marathonFaktor: 2.25 })),
    hm: Math.round(hochrechnen(1500, 5, 21.0975, { exponent: 1.06, marathonFaktor: 2.25 }))
  }));
  P('Zeiten lesen', r.lesen[0] === 1712 && r.lesen[1] === 6787 && r.lesen[2] === 1560
    && r.lesen[3] === null && r.lesen[4] === null, JSON.stringify(r.lesen));
  P('Zeiten schreiben', r.text[0] === '28:32' && r.text[1] === '1:53:07' && r.text[2] === '2:00',
    r.text.join(' '));
  P('Pace schreiben', r.pace[0] === '5:41' && r.pace[1] === '4:34', r.pace.join(' '));
  P('Riegel verdoppelt die Distanz überproportional',
    r.riegel > 3000 && r.riegel < 3200, r.riegel + ' s für 10 km');
  P('Marathon geht über den Halbmarathon mal Faktor',
    Math.abs(r.mara - r.hm * 2.25) < 2, r.mara + ' vs ' + Math.round(r.hm * 2.25));
  P('Marathon dauert länger als der doppelte Halbmarathon', r.mara > r.hm * 2,
    r.mara + ' > ' + r.hm * 2);

  /* --- 2. Der Weg durch die App --- */
  await page.click('[data-lftab="lfziele"]'); await page.waitForTimeout(300);
  const eins = await page.evaluate(() => {
    const p = lfPrognoseFuer(lfPlan().rennen[0]);
    return p ? { zeit: p.zeit, pace: p.pace, quelle: p.quelle, ist: p.ist } : null;
  });
  P('mit Testergebnis kommt eine Prognose', !!eins, JSON.stringify(eins));
  P('die Prognose nennt ihre Quelle', eins && /Woche 1/.test(eins.quelle), eins && eins.quelle);
  P('28:45 über 5 km ergeben für 10 km rund eine Stunde',
    eins && zeitLesenHelfer(eins.zeit) > 3400 && zeitLesenHelfer(eins.zeit) < 3800,
    eins && eins.zeit);
  const inText = await page.$eval('#lfview', n => n.textContent.replace(/\s+/g, ' '));
  P('der Reiter zeigt "Stand heute"', /Stand heute/.test(inText));
  P('und woher die Zahl kommt', /hochgerechnet aus/.test(inText));

  /* --- 3. Ein besserer Test sticht den älteren --- */
  const nachher = await page.evaluate(async () => {
    const t = lfPlan().tests[0];
    const p = t.datum.split('.');
    const iso = p[2] + '-' + p[1] + '-' + p[0];
    lfEintragSetzen(iso, e => { e.zeit = '25:00'; e.ok = true; });
    lfViewMalen();
    const pg = lfPrognoseFuer(lfPlan().rennen[0]);
    return pg ? pg.zeit : null;
  });
  P('bessere Testzeit ergibt bessere Prognose',
    zeitLesenHelfer(nachher) < zeitLesenHelfer(eins.zeit),
    eins.zeit + ' → ' + nachher);

  /* --- 4. Ohne Ergebnis keine Prognose --- */
  const leer = await page.evaluate(() => {
    Object.keys(LFDB.eintraege).forEach(k => { delete LFDB.eintraege[k]; });
    LFTAGE = null;
    lfViewMalen();
    return lfPrognoseFuer(lfPlan().rennen[0]);
  });
  P('ohne Testergebnis keine Prognose', leer === null, JSON.stringify(leer));
  const ohne = await page.$eval('#lfview', n => n.textContent);
  P('der Reiter sagt, dass noch kein Maximaltest da ist', /noch kein Maximaltest/.test(ohne));

  /* --- 5. Ein Test nach langer Vorbelastung zaehlt nicht fuer die Prognose ---
     Sonst wuerde die Schaetzung nach Woche 29 schlechter statt schaerfer:
     8 km Marathon-Pace nach 20 km locker ergeben hochgerechnet 5:22 Marathon,
     obwohl 4:30 die Einschaetzung ist. */
  const ermuedet = await page.evaluate(() => {
    const t = lfPlan().tests[0];
    const p = t.datum.split('.');
    const iso = p[2] + '-' + p[1] + '-' + p[0];
    t.art = 'ermuedet';
    lfEintragSetzen(iso, e => { e.zeit = '25:00'; e.ok = true; });
    LFTAGE = null;
    const pg = lfPrognoseFuer(lfPlan().rennen[0]);
    t.art = 'maximal';
    return pg;
  });
  P('ermüdeter Test geht nicht in die Prognose', ermuedet === null, JSON.stringify(ermuedet));

  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();

/* Dieselbe Rechnung wie in der Seite, hier nur zum Vergleichen. */
function zeitLesenHelfer(t) {
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(String(t || ''));
  return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) : 0;
}
