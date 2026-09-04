/**
 * Kalender: ein Termin darf über mehrere Tage gehen, und statt einer Dauer
 * in Minuten stehen eine Von- und eine Bis-Uhrzeit. Alte Stände mit `dauer`
 * müssen sich in eine Bis-Uhrzeit übersetzen, notfalls über Mitternacht.
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
  await page.click('[data-app="kalender"]'); await page.waitForTimeout(700);

  /* ---------- Rechnen ---------- */
  const r = await page.evaluate(() => ({
    min: kMinuten('09:30'), uhr: kUhrzeit(570), ueber: kUhrzeit(1560),
    spanneEin: kSpanne({ datum: '2026-09-01', bis: '' }),
    spanneDrei: kSpanne({ datum: '2026-09-01', bis: '2026-09-04' }),
    spanneVerkehrt: kSpanne({ datum: '2026-09-04', bis: '2026-09-01' }),
    dauerEin: kTerminDauer({ datum: '2026-09-01', bis: '', zeit: '09:00', bisZeit: '10:30' }),
    dauerMehr: kTerminDauer({ datum: '2026-09-01', bis: '2026-09-02', zeit: '22:00', bisZeit: '02:00' }),
    text: kZeitspanne({ zeit: '09:00', bisZeit: '17:00' }),
    nurVon: kZeitspanne({ zeit: '09:00', bisZeit: null }),
    nurBis: kZeitspanne({ zeit: null, bisZeit: '17:00' })
  }));
  P('Uhrzeit als Minuten', r.min === 570, String(r.min));
  P('Minuten als Uhrzeit', r.uhr === '09:30' && r.ueber === '02:00', r.uhr + ' / ' + r.ueber);
  P('Spanne: ein Tag ist 0', r.spanneEin === 0);
  P('Spanne: vier Tage sind 3', r.spanneDrei === 3, String(r.spanneDrei));
  P('verkehrtes Ende zählt als ein Tag', r.spanneVerkehrt === 0);
  P('Dauer an einem Tag', r.dauerEin === 90, String(r.dauerEin));
  P('Dauer über Mitternacht', r.dauerMehr === 240, String(r.dauerMehr));
  P('Zeitspanne als Text', r.text === '09:00–17:00' && r.nurVon === 'ab 09:00' && r.nurBis === 'bis 17:00',
    [r.text, r.nurVon, r.nurBis].join(' | '));

  /* ---------- Alter Stand mit Dauer wird übersetzt ---------- */
  const alt = await page.evaluate(() => {
    const t = KDB.termine.find(x => x.id === 'k5');
    return t ? { zeit: t.zeit, bisZeit: t.bisZeit, bis: t.bis, datum: t.datum, dauer: t.dauer } : null;
  });
  P('22:00 + 240 min wird 02:00 am Folgetag',
    alt && alt.bisZeit === '02:00' && alt.bis === kTagPlus(alt.datum), JSON.stringify(alt));

  /* ---------- Mehrtägig steht an jedem seiner Tage ---------- */
  const tage = await page.evaluate(() => {
    const t = KDB.termine.find(x => x.id === 'k4');
    const raus = [];
    for (let i = -2; i <= 4; i++) {
      const d = kPlus(t.datum, i);
      const lage = kTagImTermin(t, d);
      raus.push({ tag: i, drin: !!lage, nr: lage ? lage.nr + '/' + lage.tage : '-' });
    }
    return { datum: t.datum, bis: t.bis, raus };
  });
  const drin = tage.raus.filter(x => x.drin).map(x => x.nr);
  P('vier Tage, jeder mit seiner Nummer',
    drin.join(' ') === '1/4 2/4 3/4 4/4', drin.join(' ') + ' (von ' + tage.datum + ' bis ' + tage.bis + ')');
  P('davor und danach steht er nicht',
    tage.raus.filter(x => !x.drin).map(x => x.tag).join(',') === '-2,-1,4',
    'ausserhalb: ' + tage.raus.filter(x => !x.drin).map(x => x.tag).join(','));

  /* Und er taucht wirklich in der Tagesliste auf */
  const heuteListe = await page.evaluate(() => kTermineAm(heute()).map(x => x.titel));
  P('er steht heute im Kalender', heuteListe.includes('Seminar'), heuteListe.join(', '));

  /* ---------- Die Zeile zeigt Tagesnummer und Spanne ---------- */
  await page.waitForTimeout(300);
  const zeile = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#kview [data-termin]')]
      .find(n => /Seminar/.test(n.textContent));
    return b ? { zeit: b.querySelector('.kzeit').textContent.trim(),
                 meta: b.querySelector('.rm').textContent.trim(),
                 mehrtag: b.classList.contains('kmehrtag') } : null;
  });
  P('die Spalte trägt die Tagesnummer', zeile && /^\d+\/\d+$/.test(zeile.zeit), zeile ? zeile.zeit : '-');
  P('die Zeile ist als mehrtägig gekennzeichnet', zeile && zeile.mehrtag);
  P('die Meta-Zeile nennt Spanne und Uhrzeiten',
    zeile && /09:00–17:00/.test(zeile.meta) && /–/.test(zeile.meta), zeile ? zeile.meta : '-');

  /* Ein eintägiger zeigt weiterhin die Uhrzeit */
  const einTag = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#kview [data-termin]')]
      .find(n => /Zahnarzt/.test(n.textContent));
    return b ? { zeit: b.querySelector('.kzeit').textContent.trim(), meta: b.querySelector('.rm').textContent.trim() } : null;
  });
  P('eintägig: Uhrzeit in der Spalte, Spanne in der Meta',
    einTag && einTag.zeit === '09:30' && /09:30–10:30/.test(einTag.meta),
    einTag ? einTag.zeit + ' · ' + einTag.meta : '-');

  /* ---------- Das Blatt ---------- */
  await page.evaluate(() => kTerminBearbeiten(KDB.termine.find(x => x.id === 'k4')));
  await page.waitForTimeout(400);
  const felder = await page.evaluate(() => ({
    datum: document.querySelector('.sheet [data-datum]').value,
    bis: document.querySelector('.sheet [data-bis]').value,
    zeit: document.querySelector('.sheet [data-zeit]').value,
    bisZeit: document.querySelector('.sheet [data-biszeit]').value,
    dauerFeld: !!document.querySelector('.sheet [data-dauer]'),
    spanne: document.querySelector('.sheet [data-spanne]').textContent
  }));
  P('alle vier Felder gefüllt',
    felder.datum && felder.bis && felder.zeit === '09:00' && felder.bisZeit === '17:00', JSON.stringify(felder));
  P('kein Dauer-Feld mehr', !felder.dauerFeld);
  P('der Satz darunter nennt Tage und Zeit', /4 Tage/.test(felder.spanne) && /09:00–17:00/.test(felder.spanne),
    felder.spanne);

  /* Ende vor Anfang am selben Tag wird abgewiesen */
  await page.fill('.sheet [data-bis]', '');
  await page.fill('.sheet [data-zeit]', '20:00');
  await page.fill('.sheet [data-biszeit]', '02:00');
  await page.waitForTimeout(200);
  await page.click('.sheet [data-ok]');
  await page.waitForTimeout(400);
  const nochOffen = await page.evaluate(() => ({
    offen: !!document.querySelector('.sheet [data-biszeit]'),
    toast: (document.querySelector('.toast') || {}).textContent || ''
  }));
  P('Ende vor Anfang wird abgewiesen', nochOffen.offen && /Mitternacht/.test(nochOffen.toast),
    nochOffen.toast.slice(0, 70));

  /* Mit Bis-Tag geht es durch */
  await page.fill('.sheet [data-bis]', await page.evaluate(() => kPlus(KDB.termine.find(x => x.id === 'k4').datum, 1)));
  await page.waitForTimeout(200);
  await page.click('.sheet [data-ok]');
  await page.waitForTimeout(600);
  const gesichert = await page.evaluate(() => {
    const t = KDB.termine.find(x => x.id === 'k4');
    return { bis: t.bis, zeit: t.zeit, bisZeit: t.bisZeit, dauer: kTerminDauer(t), spanne: kSpanne(t) };
  });
  P('über Mitternacht mit Bis-Tag gesichert',
    gesichert.spanne === 1 && gesichert.zeit === '20:00' && gesichert.bisZeit === '02:00'
    && gesichert.dauer === 360, JSON.stringify(gesichert));

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();

function kTagPlus(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
