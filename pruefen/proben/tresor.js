/* Probe: der Tresor.
   Der Plan liegt mit Passwort verschlossen in der App. Geprüft wird, dass
   in der Datenbasis wirklich nur Geheimtext steht, dass ein falsches
   Passwort nicht aufsperrt – und dass zwei Leute mit je eigenem Passwort
   nebeneinander arbeiten können, ohne an die Daten des anderen zu kommen.
   Es gibt keinen Schlüssel im Code, der alle aufsperrt. */
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

  P('Verschlüsselung ist hier möglich', await page.evaluate(() => tresorGeht()));
  P('Plan liegt offen da', await page.evaluate(() => lfHatPlan() && !lfZu()));

  /* --- 1. Rundgang durch die Bausteine, ohne Oberfläche --- */
  const roh = await page.evaluate(async () => {
    const wert = { geheim: 'Kennwort-Beispiel', zahl: 42 };
    const t = await tresorSchliessen(wert, 'passwort-eins');
    const auf = await tresorOeffnen(t, 'passwort-eins');
    let falsch = '';
    try { await tresorOeffnen(t, 'passwort-zwei'); } catch (e) { falsch = e.message; }
    /* Zweimal dasselbe verschliessen muss verschieden aussehen: neues Salz,
       neue Zufallszahl. Sonst verrät schon der Vergleich etwas. */
    const t2 = await tresorSchliessen(wert, 'passwort-eins');
    return {
      text: t.text, salzGleich: t.salz === t2.salz, textGleich: t.text === t2.text,
      auf: JSON.stringify(auf), falsch: falsch, runden: t.runden
    };
  });
  P('Geheimtext enthält den Klartext nicht', !roh.text.includes('Kennwort')
    && !atob(roh.text).includes('Kennwort'), roh.text.slice(0, 24) + '…');
  P('richtiges Passwort gibt den Wert zurück',
    roh.auf === JSON.stringify({ geheim: 'Kennwort-Beispiel', zahl: 42 }), roh.auf);
  P('falsches Passwort sperrt nicht auf', /Passwort/.test(roh.falsch), roh.falsch);
  P('jedes Mal neues Salz', !roh.salzGleich);
  P('jedes Mal anderer Geheimtext', !roh.textGleich);
  P('Rundenzahl steht im Tresor', roh.runden >= 100000, String(roh.runden));

  /* --- 2. Zwei Leute, zwei Passwörter, zwei Pläne --- */
  const zwei = await page.evaluate(async () => {
    const planA = { start: '2026-01-05', rennen: [], tests: [], wochen: [{ n: 1, p: 'A', e: 0, b: 0, t: [] }] };
    const planB = { start: '2027-01-04', rennen: [], tests: [], wochen: [{ n: 1, p: 'B', e: 0, b: 0, t: [] }] };
    const a = await tresorSchliessen(planA, 'anna-geheim');
    const bb = await tresorSchliessen(planB, 'bert-geheim');
    const aAuf = await tresorOeffnen(a, 'anna-geheim');
    const bAuf = await tresorOeffnen(bb, 'bert-geheim');
    let kreuz = 0;
    try { await tresorOeffnen(a, 'bert-geheim'); } catch (e) { kreuz++; }
    try { await tresorOeffnen(bb, 'anna-geheim'); } catch (e) { kreuz++; }
    return { a: aAuf.wochen[0].p, b: bAuf.wochen[0].p, kreuz: kreuz };
  });
  P('jeder sperrt seinen eigenen Tresor auf', zwei.a === 'A' && zwei.b === 'B',
    zwei.a + '/' + zwei.b);
  P('keiner kommt an den des anderen', zwei.kreuz === 2, zwei.kreuz + ' von 2 abgewiesen');

  /* --- 3. Der Weg durch die App: verschliessen, neu starten, aufsperren --- */
  const wochenVorher = await page.evaluate(() => lfPlan().wochen.length);
  page.once('dialog', d => d.accept());
  await page.click('[data-lftab="lfmehr"]'); await page.waitForTimeout(250);
  await page.click('[data-lfverschliessen]'); await page.waitForTimeout(400);
  await page.fill('[data-tp1]', 'mein-passwort');
  await page.fill('[data-tp2]', 'mein-passwort');
  await page.click('[data-tok]');
  await page.waitForTimeout(1800);

  const nachSchliessen = await page.evaluate(() => ({
    tresorDa: !!LFDB.tresor,
    planLeerInDaten: LFDB.plan.wochen.length === 0,
    imSpeicherDa: lfHatPlan(),
    /* Der springende Punkt: was gesichert wird, darf nichts verraten. */
    klartextInDaten: JSON.stringify(LFDB).includes('Gewoehnung')
      || JSON.stringify(LFDB).includes('langer Lauf')
  }));
  P('Tresor steht in der Datenbasis', nachSchliessen.tresorDa);
  P('der Plan ist aus der Datenbasis raus', nachSchliessen.planLeerInDaten);
  P('im Arbeitsspeicher bleibt er nutzbar', nachSchliessen.imSpeicherDa);
  P('nichts Lesbares mehr in den Daten', !nachSchliessen.klartextInDaten);

  /* Neu laden: jetzt muss die App fragen. */
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-app="laufen"]'); await page.waitForTimeout(900);
  const zu = await page.evaluate(() => ({
    zu: lfZu(), wochen: lfPlan().wochen.length,
    banner: document.getElementById('lfBanner').textContent.trim()
  }));
  P('nach dem Neustart ist zu', zu.zu && zu.wochen === 0, JSON.stringify(zu.wochen));
  P('die Kopfzeile sagt es', /verschlossen/i.test(zu.banner), zu.banner);

  /* Das Blatt steht schon offen – erst falsch, dann richtig. */
  await page.fill('[data-tp1]', 'falsch-falsch');
  await page.click('[data-tok]');
  await page.waitForTimeout(900);
  P('falsches Passwort lässt zu', await page.evaluate(() => lfZu()));

  await page.click('[data-lftab="lfheute"]'); await page.waitForTimeout(250);
  await page.click('[data-lfauf]'); await page.waitForTimeout(400);
  await page.fill('[data-tp1]', 'mein-passwort');
  await page.click('[data-tok]');
  await page.waitForTimeout(1500);
  const auf = await page.evaluate(() => ({
    zu: lfZu(), wochen: lfPlan().wochen.length, tage: lfTage().length
  }));
  P('richtiges Passwort sperrt auf', !auf.zu && auf.wochen === wochenVorher,
    JSON.stringify(auf));
  P('die Tagesliste ist wieder da', auf.tage > 0, String(auf.tage));

  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
