/* Probe: laufen muss sich der Gerätebreite fügen.
   Einmal war es kaputt: #lfview fehlte die Flächen-Regel, die jede andere
   App hat. Der Inhalt klebte am Rand und die Beschriftung der Abschnittszeile
   lief aus dem Bild. Geprüft wird mit Zahlen – Seitenbreite gegen
   Fensterbreite, Innenabstand, und ob ein Element über den Rand ragt. */
const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const path = require('path');
const { saeen } = require(__dirname + '/../saat.js');
const DATEI = 'file://' + path.join(__dirname, '..', '..', 'mylife.html');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

const BREITEN = [320, 360, 390, 430, 600, 768, 1024];
const TABS = ['lfheute', 'lfplan', 'lfziele', 'lfmehr'];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

  for (const breite of BREITEN) {
    const ctx = await b.newContext({ viewport: { width: breite, height: 860 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(DATEI);
    await saeen(page, false);
    await page.reload(); await page.waitForTimeout(400);
    await page.click('[data-app="laufen"]'); await page.waitForTimeout(400);

    for (const tab of TABS) {
      await page.click('[data-lftab="' + tab + '"]'); await page.waitForTimeout(180);
      const m = await page.evaluate(() => {
        const v = document.getElementById('lfview');
        const cs = getComputedStyle(v);
        const raus = [];
        v.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return;
          if (r.right > window.innerWidth + 0.5 || r.left < -0.5) raus.push(el.className || el.tagName);
        });
        return {
          seite: document.documentElement.scrollWidth, fenster: window.innerWidth,
          padL: parseFloat(cs.paddingLeft), padR: parseFloat(cs.paddingRight),
          raus: raus.length, wer: raus.slice(0, 3).join(', ')
        };
      });
      P(breite + ' px ' + tab + ': kein Querscrollen', m.seite <= m.fenster + 1, m.seite + '/' + m.fenster);
      P(breite + ' px ' + tab + ': Rand steht', m.padL >= 12 && m.padR >= 12, m.padL + '/' + m.padR);
      P(breite + ' px ' + tab + ': nichts ragt hinaus', m.raus === 0, m.wer);
    }

    /* Die Leistungs-Aufstellung liegt als Ebene darüber und muss dieselbe
       Breite aushalten. */
    await page.evaluate(() => lfLeistungOeffnen(false));
    await page.waitForTimeout(300);
    const l = await page.evaluate(() => {
      const v = document.querySelector('.overlay .ovl-body');
      const raus = [];
      v.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        if (r.right > window.innerWidth + 0.5 || r.left < -0.5) raus.push(el.className || el.tagName);
      });
      const bahn = document.querySelector('.lfbahn');
      return {
        seite: document.documentElement.scrollWidth, fenster: window.innerWidth,
        saeulen: bahn ? bahn.children.length : 0,
        bahnBreit: bahn ? Math.round(bahn.getBoundingClientRect().width) : 0,
        raus: raus.length, wer: raus.slice(0, 3).join(', ')
      };
    });
    P(breite + ' px Leistung: 52 Säulen', l.saeulen === 52, String(l.saeulen));
    P(breite + ' px Leistung: Bahn bleibt im Bild', l.bahnBreit <= breite && l.raus === 0,
      l.bahnBreit + ' bei ' + breite + (l.wer ? ' · ' + l.wer : ''));
    P(breite + ' px Leistung: kein Querscrollen', l.seite <= l.fenster + 1, l.seite + '/' + l.fenster);
    await ctx.close();
  }

  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
