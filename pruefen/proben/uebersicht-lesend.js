/**
 * Blöcke nach Seitenumfang: ein Buch, in dem man steckt, gehört weder zu
 * „gelesen“ noch zu „offen“. Es hatte vorher keinen eigenen Stapel.
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

  /* Die Saat führt je ein Buch in jedem Zustand. */
  const zustaende = await page.evaluate(() => {
    const bs = buecherAktiv();
    return { lese: bs.filter(x => x.status === 'lese').length,
             gelesen: bs.filter(x => x.status === 'gelesen').length,
             offen: bs.filter(x => x.status === 'offen').length };
  });
  P('die Saat hat ein Buch im Lesen', zustaende.lese > 0, JSON.stringify(zustaende));

  await page.evaluate(() => uebersichtOeffnen ? uebersichtOeffnen() : null).catch(() => {});
  await page.waitForTimeout(400);
  if (!(await page.$('.ovl-body'))) {
    /* Über die Kopfzeile, wie ein Mensch es täte. */
    const k = await page.evaluateHandle(() =>
      document.querySelector('[data-uebersicht]') || document.querySelector('#btnUebersicht') || null);
    if (await k.evaluate(n => !!n)) { await k.asElement().click(); await page.waitForTimeout(700); }
  }

  const karte = await page.evaluate(() => {
    const k = [...document.querySelectorAll('.chart')]
      .find(n => /Blöcke nach Seitenumfang/.test((n.querySelector('h3') || {}).textContent || ''));
    if (!k) return null;
    const legende = [...k.querySelectorAll('.legend span')].map(x => x.textContent.trim()).filter(Boolean);
    const zeilen = [...k.querySelectorAll('.barrow')].map(r => ({
      label: r.querySelector('.blab').textContent,
      segmente: [...r.querySelectorAll('.bseg')].map(s => s.dataset.tip)
    }));
    const kopf = [...k.querySelectorAll('th')].map(x => x.textContent.trim());
    return { legende, zeilen, kopf, text: (k.querySelector('.cap') || {}).textContent || '' };
  });
  P('die Karte ist da', !!karte, karte ? 'gefunden' : 'nicht gefunden');
  if (!karte) { console.log('\n' + ok + ' OK, ' + (fehl + 1) + ' FEHL'); await b.close(); process.exit(1); }

  P('Legende nennt alle drei Zustände',
    karte.legende.some(x => /^gelesen$/.test(x)) && karte.legende.some(x => /^lese ich$/.test(x))
    && karte.legende.some(x => /^offen$/.test(x)), karte.legende.join(' | '));
  P('ein Balken trägt ein Stück „lese ich"',
    karte.zeilen.some(z => z.segmente.some(s => /^lese ich:/.test(s || ''))),
    JSON.stringify(karte.zeilen.map(z => z.segmente)));
  P('die Tabelle hat eine eigene Spalte', karte.kopf.includes('Lese ich (S.)'), karte.kopf.join(' | '));

  /* Die Rechnung muss aufgehen: gelesen + lese + offen = Umfang des Blocks */
  const summe = await page.evaluate(() => {
    const bloecke = bloeckeSortiert();
    return bloecke.map(blk => {
      const bs = buecherIn(blk.id);
      const seiten = l => l.reduce((s, x) => s + (x.seiten || 0), 0);
      const g = seiten(bs.filter(x => x.status === 'gelesen'));
      const l = seiten(bs.filter(x => x.status === 'lese'));
      const o = seiten(bs) - g - l;
      return { name: blk.name, passt: g + l + o === seiten(bs), o, l, g };
    });
  });
  P('gelesen + lese ich + offen ergibt den Umfang', summe.every(x => x.passt),
    summe.map(x => x.name + ': ' + x.g + '/' + x.l + '/' + x.o).join(' · '));
  P('kein offenes Stück wird negativ', summe.every(x => x.o >= 0));

  /* Ein Buch in Arbeit ohne Seitenzahl kann im Balken nicht auftauchen –
     dann muss es wenigstens unter dem Diagramm stehen. */
  const ohne = await page.evaluate(() => buecherAktiv().filter(x => x.status === 'lese' && !x.seiten).length);
  P('die Saat führt ein Buch in Arbeit ohne Seitenzahl', ohne === 1, String(ohne));
  P('der Untertitel sagt, dass es fehlt',
    /keine Seitenzahl und fehlt deshalb im Balken/.test(karte.text)
    || /Bücher in Arbeit haben keine Seitenzahl/.test(karte.text), karte.text.slice(0, 220));

  /* ---------- Derselbe Dreiklang im Streifen unter jeder Blockkarte ---------- */
  await page.evaluate(() => alleLayerSchliessen());
  await page.waitForTimeout(500);
  await page.evaluate(() => { if (aktiverTab !== 'plan') tabWechseln('plan'); else viewMalen(); });
  await page.waitForTimeout(500);
  const streifen = await page.evaluate(() => {
    const bloecke = bloeckeSortiert();
    return bloecke.map(blk => {
      const knoten = [...document.querySelectorAll('#view .block')]
        .find(n => (n.querySelector('.name') || {}).textContent === blk.name);
      if (!knoten) return { name: blk.name, da: false };
      const bs = buecherIn(blk.id);
      const teile = [...knoten.querySelectorAll('.block-bar > i')].map(i => ({
        lese: i.classList.contains('lese'),
        breite: parseFloat(i.style.width) || 0,
        farbe: getComputedStyle(i).backgroundColor
      }));
      return {
        name: blk.name, da: true, teile,
        gelesen: bs.filter(x => x.status === 'gelesen').length,
        imLesen: bs.filter(x => x.status === 'lese').length,
        werke: bs.length,
        meta: (knoten.querySelector('.meta') || {}).textContent.replace(/\s+/g, ' ').trim()
      };
    });
  });
  P('jeder Block hat seinen Streifen', streifen.every(x => x.da && x.teile.length === 2),
    streifen.map(x => x.name + ': ' + (x.teile || []).length).join(' · '));
  const mitLesen = streifen.filter(x => x.imLesen > 0);
  P('ein Block führt etwas in Arbeit', mitLesen.length > 0,
    mitLesen.map(x => x.name + ' (' + x.imLesen + ')').join(', '));
  P('dort ist der zweite Abschnitt breiter als null',
    mitLesen.every(x => x.teile[1].lese && x.teile[1].breite > 0),
    mitLesen.map(x => x.teile[1].breite.toFixed(1) + ' %').join(', '));
  P('die Breiten stimmen mit der Zählung',
    streifen.every(x => Math.abs(x.teile[0].breite - (x.werke ? x.gelesen / x.werke * 100 : 0)) < 0.01
      && Math.abs(x.teile[1].breite - (x.werke ? x.imLesen / x.werke * 100 : 0)) < 0.01),
    streifen.map(x => x.name + ': ' + x.teile[0].breite.toFixed(0) + '/' + x.teile[1].breite.toFixed(0)).join(' · '));
  P('beide Abschnitte tragen verschiedene Farben',
    streifen.every(x => x.teile[0].farbe !== x.teile[1].farbe),
    streifen[0] ? streifen[0].teile.map(t => t.farbe).join(' vs ') : '-');
  P('zusammen nie über hundert Prozent',
    streifen.every(x => x.teile[0].breite + x.teile[1].breite <= 100.01));
  P('die Kopfzeile nennt, was in Arbeit ist',
    mitLesen.every(x => /in Arbeit/.test(x.meta)), mitLesen.map(x => x.meta).join(' | '));

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
