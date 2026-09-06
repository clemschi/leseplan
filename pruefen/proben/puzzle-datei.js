/**
 * puzzle.html – die eigenständige Datei mit dem einen Bild.
 * Sie hängt an nichts: kein Speicherort, keine JSON, keine Adresse nach
 * draussen. Was hier steht, hat schon einmal gefehlt – unter anderem, dass
 * `$('[data-hell]')` nach dem Umschalten das <html> traf und die Seite
 * überschrieb.
 */
const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const path = require('path');
const WURZEL = path.join(__dirname, '..', '..');
const DATEI = 'file://' + path.join(WURZEL, 'puzzle.html');
let ok = 0, fehl = 0;
const P = (n, g, i) => { g ? ok++ : fehl++; console.log((g ? 'OK   ' : 'FEHL ') + n + (i ? ' – ' + i : '')); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const f = [];
  page.on('pageerror', e => f.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') f.push(m.text()); });
  /* Nichts von aussen: jede Anfrage ins Netz wäre ein Bruch der Eigenständigkeit. */
  const fremd = [];
  page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) fremd.push(r.url()); });

  await page.goto(DATEI);
  await page.waitForFunction(() => document.querySelectorAll('.pzlose').length > 0, { timeout: 20000 });
  await page.waitForTimeout(400);

  const d = await page.evaluate(() => ({
    lose: document.querySelectorAll('.pzlose').length,
    loecher: document.querySelectorAll('.pzloch').length,
    spalten: P.spalten, zeilen: P.zeilen,
    alt: P.alt.length, bildB: P.bildB, bildH: P.bildH,
    titel: document.title
  }));
  P('24 Teile liegen auf dem Tisch', d.lose === 24, d.lose + ' Teile');
  P('der Rahmen hat 24 Löcher', d.loecher === 24, String(d.loecher));
  P('Aufteilung passt zum Bild', d.spalten * d.zeilen === 24 && d.spalten > d.zeilen,
    d.spalten + '×' + d.zeilen + ' bei ' + d.bildB + '×' + d.bildH);
  P('drei Teile sind gealtert', d.alt === 3);

  /* Das Bild steckt in der Datei */
  const fs = require('fs');
  const roh = fs.readFileSync(path.join(WURZEL, 'puzzle.html'), 'utf8');
  P('das Foto liegt als Data-URL darin', /const PZBILD = 'data:image\/webp;base64,/.test(roh),
    Math.round(roh.length / 1024) + ' KB Datei');
  P('keine JSON-Datei, kein Speicherort',
    !/macheSpeicher|leseplan\.json|gsund\.json|showSaveFilePicker/.test(roh));
  P('gar nichts wird aus dem Netz geholt', fremd.length === 0, fremd.join(', ') || 'keine einzige Anfrage');
  /* Der SVG-Namensraum im Favicon ist eine Kennung, kein Abruf. */
  const adressen = (roh.match(/https?:\/\/[^"' )]*/g) || []).filter(u => u !== 'http://www.w3.org/2000/svg');
  P('keine Adresse nach draussen in der Datei', adressen.length === 0, adressen.join(', ') || 'keine');

  /* Die Teile tragen echte Bilddaten, keine leeren Flächen */
  const bilder = await page.evaluate(() => {
    const u = [...document.querySelectorAll('.pzlose')].map(n => n.style.backgroundImage);
    return { alle: u.every(x => /url\("?data:image\/(webp|png)/.test(x)), verschieden: new Set(u).size };
  });
  P('jedes Teil hat sein eigenes Bild', bilder.alle && bilder.verschieden === 24,
    bilder.verschieden + ' verschiedene');

  /* Durchsichtige Ecken: die Nasen sind wirklich ausgeschnitten */
  const ecke = await page.evaluate(async () => {
    const u = document.querySelector('.pzlose').style.backgroundImage.slice(5, -2).replace(/^"|"$/g, '');
    const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let durch = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 10) durch++;
    return { durch, gesamt: px.length / 4, w: c.width, h: c.height };
  });
  P('die Teile sind ausgeschnitten, nicht rechteckig',
    ecke.durch > ecke.gesamt * 0.05, (100 * ecke.durch / ecke.gesamt).toFixed(1) + ' % durchsichtig');

  /* --- Ein Teil an seinen Platz ziehen: es muss einrasten --- */
  const cdp = await ctx.newCDPSession(page);
  const tp = (t, x, y) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: t === 'touchEnd' ? [] : [{ x, y }] });
  const legen = async (nr) => {
    const ziel = await page.evaluate(n => {
      const brett = document.querySelector('[data-pzbrett]');
      /* Teile überlappen. Das zuletzt im DOM stehende liegt immer obenauf –
         das ist eindeutig, elementFromPoint an der Mitte ist es nicht. Und
         es soll ein gewöhnliches sein, kein gealtertes: nur die lassen sich
         später nicht wieder herausnehmen, und genau das wird geprüft. */
      const alle = [...document.querySelectorAll('.pzlose')]
        .filter(x => !P.alt.includes(+x.dataset.teil));
      const echt = alle[alle.length - 1];
      if (!echt) return null;
      const e = +echt.dataset.teil;
      const er = echt.getBoundingClientRect(), br = brett.getBoundingClientRect();
      const zb = brett.clientWidth / P.spalten, zh = brett.clientHeight / P.zeilen;
      return {
        nr: e,
        von: { x: er.left + er.width / 2, y: er.top + er.height / 2 },
        nach: { x: br.left + brett.clientLeft + ((e % P.spalten) + 0.5) * zb,
                y: br.top + brett.clientTop + (Math.floor(e / P.spalten) + 0.5) * zh }
      };
    }, nr);
    if (!ziel) return false;
    await tp('touchStart', ziel.von.x, ziel.von.y);
    for (let i = 1; i <= 8; i++) {
      await tp('touchMove', ziel.von.x + (ziel.nach.x - ziel.von.x) * i / 8,
        ziel.von.y + (ziel.nach.y - ziel.von.y) * i / 8);
      await page.waitForTimeout(16);
    }
    await tp('touchEnd', 0, 0);
    await page.waitForTimeout(350);
    return ziel.nr;
  };

  const nichtAlt = await page.evaluate(() => {
    for (let i = 0; i < P.spalten * P.zeilen; i++) if (!P.alt.includes(i)) return i;
  });
  const gelegtNr = await legen(nichtAlt);
  const nach1 = await page.evaluate(n => ({
    gelegt: P.gelegt.length, drin: P.gelegt.includes(n),
    imRahmen: document.querySelectorAll('.pzliegt').length,
    stand: document.querySelector('[data-stand]').textContent
  }), gelegtNr);
  P('ein Teil rastet ein', nach1.drin && nach1.gelegt === 1 && nach1.imRahmen === 1,
    JSON.stringify(nach1));
  P('der Zähler oben zählt mit', nach1.stand === '1 / 24', nach1.stand);

  /* Ein gewöhnliches Teil lässt sich nicht wieder herausnehmen */
  const fest = await page.evaluate(n => {
    const t = document.querySelector('.pzliegt[data-teil="' + n + '"]');
    return { da: !!t, anfassbar: t ? getComputedStyle(t).pointerEvents : '-', altteil: t ? t.classList.contains('altteil') : false };
  }, gelegtNr);
  P('ein gewöhnliches Teil bleibt liegen', fest.da && fest.anfassbar === 'none' && !fest.altteil,
    JSON.stringify(fest));

  /* --- Der Stand übersteht das Neuladen --- */
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('.pzlose,.pzliegt').length > 0, { timeout: 20000 });
  await page.waitForTimeout(400);
  const nachLaden = await page.evaluate(() => ({
    gelegt: P.gelegt.length, lose: document.querySelectorAll('.pzlose').length,
    stand: document.querySelector('[data-stand]').textContent
  }));
  P('nach dem Neuladen liegt das Teil noch',
    nachLaden.gelegt === 1 && nachLaden.lose === 23, JSON.stringify(nachLaden));

  /* --- Alles legen: der Satz zum fertigen Bild --- */
  await page.evaluate(() => {
    P.gelegt = Array.from({ length: P.spalten * P.zeilen }, (_, i) => i);
    P.lose = {}; P.fertig = true;
    pzZuletzt = 'warum';
    pzStandPruefen(P);
    malen();
  });
  await page.waitForTimeout(400);
  const fertig = await page.evaluate(() => ({
    spruch: (document.querySelector('.pzspruch span') || {}).textContent || '',
    rahmen: !!document.querySelector('.pzbrett.fertig'),
    grund: getComputedStyle(document.querySelector('.pzspruch'), '::before').content
  }));
  P('„A beautiful thing is never perfect" erscheint',
    fertig.spruch === 'A beautiful thing is never perfect', fertig.spruch);
  P('der Rahmen färbt sich', fertig.rahmen);
  P('der Satz steht ohne Grund dahinter', fertig.grund === 'none', String(fertig.grund));

  /* --- Ein altes Teil herausziehen: „Why?" --- */
  await page.waitForTimeout(5400);
  const altNr = await page.evaluate(() => P.alt[0]);
  const zug = await page.evaluate(n => {
    const t = document.querySelector('.pzliegt[data-teil="' + n + '"]');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, altNr);
  P('das alte Teil ist anfassbar', !!zug);
  await tp('touchStart', zug.x, zug.y);
  for (let i = 1; i <= 8; i++) { await tp('touchMove', zug.x + 12 * i, zug.y + 30 * i); await page.waitForTimeout(16); }
  await tp('touchEnd', 0, 0);
  await page.waitForTimeout(500);
  const warum = await page.evaluate(() => ({
    spruch: (document.querySelector('.pzspruch span') || {}).textContent || '',
    gelegt: P.gelegt.length, lose: Object.keys(P.lose).length
  }));
  P('herausgezogen fragt das Bild „Why?"', warum.spruch === 'Why?', warum.spruch);
  P('es liegt wieder lose', warum.gelegt === 23 && warum.lose === 1, JSON.stringify(warum));

  /* --- Neu mischen --- */
  await page.click('[data-neu]');
  await page.waitForTimeout(1500);
  const neu = await page.evaluate(() => ({
    lose: document.querySelectorAll('.pzlose').length, gelegt: P.gelegt.length, alt: P.alt.length
  }));
  P('neu mischen legt alles zurück auf den Tisch',
    neu.lose === 24 && neu.gelegt === 0 && neu.alt === 3, JSON.stringify(neu));

  /* --- Nichts scrollt --- */
  const scroll = await page.evaluate(() => ({
    hoehe: document.documentElement.scrollHeight, sicht: window.innerHeight,
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  P('die Seite scrollt nicht', scroll.hoehe <= scroll.sicht + 2 && scroll.x <= 1,
    scroll.hoehe + ' / ' + scroll.sicht + ' px, quer ' + scroll.x);

  /* --- Hell und dunkel --- */
  const dunkel = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('[data-modus]');
  await page.waitForTimeout(200);
  const hell = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  P('hell und dunkel lassen sich umschalten', dunkel !== hell, dunkel + ' → ' + hell);

  /* ---------- Ohne JavaScript ----------
     Vorschauen in WhatsApp, Mail oder Dateien zeigen HTML, führen aber kein
     Skript aus. Dann darf die Seite nicht schwarz bleiben. */
  const ohneCtx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const ohne = await ohneCtx.newPage();
  await ohne.goto(DATEI);
  await ohne.waitForTimeout(400);
  const stumm = await ohne.evaluate(() => {
    const n = document.querySelector('.ohne');
    const knopf = document.querySelector('[data-modus]');
    return {
      hinweis: n ? n.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : '',
      hoehe: n ? Math.round(n.getBoundingClientRect().height) : 0,
      knopfLeer: knopf ? !knopf.innerHTML.trim() : true
    };
  });
  P('ohne JavaScript steht ein Hinweis da', /kein JavaScript/.test(stumm.hinweis) && stumm.hoehe > 100,
    stumm.hinweis + ' (' + stumm.hoehe + ' px)');
  P('der Modus-Knopf ist auch ohne Skript nicht leer', !stumm.knopfLeer);
  await ohneCtx.close();

  const echt = f.filter(x => !/ERR_|net::|google|fonts/.test(x));
  P('keine Fehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
