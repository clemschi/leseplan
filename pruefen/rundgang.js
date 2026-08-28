#!/usr/bin/env node
/* Ein Rundgang durch mylife.html: Daten säen, jede App öffnen, jeden Reiter
   malen, jedes Bedienelement einmal antippen und danach die Verlaufs-Disziplin
   der Ebenen prüfen. Meldet nur Zahlen und OK/FEHL – keine Bilder.

   Aufruf:  node pruefen/rundgang.js
            node pruefen/rundgang.js --schnell   (ohne den langen Klick-Teil)
            node pruefen/rundgang.js --leer      (mit leerer Datenbasis)

   Was hier durchläuft, ist noch kein Beweis, dass etwas richtig aussieht –
   aber jeder Fehler in der Konsole und jede verschwundene Seite fällt auf. */
/* Playwright liegt hier global; auf einem anderen Rechner tut es das
   gewöhnliche require. */
let chromium;
try { chromium = require('playwright').chromium; }
catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
const BROWSER = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const { saeen } = require(__dirname + '/saat.js');

const DATEI = process.env.APP || 'file://' + require('path').join(__dirname, '..', 'mylife.html');
const SCHNELL = process.argv.includes('--schnell');
/* --leer: ohne Daten durchgehen, nur mit gesetztem Speicherort. */
const LEER = process.argv.includes('--leer');
/* Was die App verlässt oder Daten wegwirft, wird nicht angetippt. */
const TABU = /Löschen|Leeren|Entfernen|Zurücksetzen|Abmelden|Speicherort|Anderer Ort|Datei wählen|Neue Datei|Sicherung|Ersetzen/i;
const APPS = {
  leseliste: { rumpf: 'app', attr: 'data-tab', tabs: ['plan', 'themen', 'mehr'] },
  kalender: { rumpf: 'kal', attr: 'data-ktab', tabs: ['heute', 'monat', 'todo', 'kmehr'] },
  fastreader: { rumpf: 'fr', attr: 'data-ftab', tabs: ['bib', 'lesen', 'bilanz', 'fmehr'] },
  gsund: { rumpf: 'gs', attr: 'data-gtab', tabs: ['guzi', 'puzzle', 'bald', 'gmehr'] },
  minimal: { rumpf: 'mi', attr: 'data-mitab', tabs: ['stand', 'dinge', 'verlauf', 'mimehr'] },
  cash: { rumpf: 'ca', attr: 'data-catab', tabs: ['stand', 'routinen', 'posten', 'camehr'] }
};

(async () => {
  const browser = await chromium.launch({ executablePath: BROWSER });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push('PAGEERROR ' + e.message));
  page.on('console', m => {
    /* Ohne Netz kommen die Schriften nicht – das ist kein Fehler der App. */
    if (m.type() === 'error' && !/ERR_(CONNECTION|NAME|INTERNET|FILE)/.test(m.text())) fehler.push('CONSOLE ' + m.text());
  });
  page.on('dialog', d => d.accept());

  const P = [];
  const pruef = (ok, text) => { P.push((ok ? 'OK   ' : 'FEHL ') + text); return ok; };
  const merke = wo => { if (fehler.length) { P.push('FEHL ' + wo + '  →  ' + fehler.join(' | ')); fehler.length = 0; } };
  const lebt = () => page.evaluate(() => !!document.getElementById('layers')).catch(() => false);
  const stand = () => page.evaluate(() => ({
    ebenen: document.getElementById('layers').children.length,
    tiefe: (history.state && history.state.layer) || 0
  }));
  const zu = async () => {
    for (let i = 0; i < 3; i++) {
      if (!(await lebt())) return false;
      if (!(await page.evaluate(() => document.getElementById('layers').children.length))) return true;
      await page.evaluate(() => alleLayerSchliessen());
      await page.waitForTimeout(400);
    }
    return true;
  };

  await page.goto(DATEI); await page.waitForTimeout(300);
  await saeen(page, LEER);
  await page.reload(); await page.waitForTimeout(700);
  merke('Start');

  /* ---------- Teil 1: jede App, jeder Reiter, jedes Bedienelement ---------- */
  let klicks = 0;
  for (const [app, cfg] of Object.entries(APPS)) {
    if (!(await zu())) break;
    await page.evaluate(() => splashZeigen()); await page.waitForTimeout(300);
    await page.locator('.splash [data-app="' + app + '"]').click(); await page.waitForTimeout(800);
    pruef(await page.evaluate(id => { const e = document.getElementById(id); return !!e && !e.hidden; }, cfg.rumpf), app + ': öffnet sich');
    merke(app + ' öffnen');

    for (const tab of cfg.tabs) {
      await page.evaluate(([a, t]) => { const b = document.querySelector('[' + a + '="' + t + '"]'); if (b) b.click(); }, [cfg.attr, tab]);
      await page.waitForTimeout(450);
      merke(app + '/' + tab + ' malen');
      if (SCHNELL) continue;

      const sel = '.appflaeche:not([hidden]) button:visible, .appflaeche:not([hidden]) .rowline:visible,'
        + ' .appflaeche:not([hidden]) .list-card:visible, .appflaeche:not([hidden]) [data-act]:visible';
      const n = Math.min(await page.locator(sel).count(), 22);
      for (let i = 0; i < n; i++) {
        const el = page.locator(sel).nth(i);
        let text = '';
        try { text = ((await el.textContent({ timeout: 400 })) || '').trim().replace(/\s+/g, ' ').slice(0, 34); } catch { continue; }
        if (TABU.test(text)) continue;
        try { await el.click({ timeout: 1500 }); } catch { continue; }
        klicks++;
        await page.waitForTimeout(380);
        if (!(await lebt())) { pruef(false, 'Seite verschwunden nach Klick auf "' + text + '" in ' + app + '/' + tab); break; }
        merke(app + '/' + tab + ' klick "' + text + '"');

        /* eine Ebene tiefer, damit auch Blätter und Ebenen drankommen */
        if (await page.evaluate(() => document.getElementById('layers').children.length)) {
          const isel = '#layers > *:last-child button:visible';
          const m = Math.min(await page.locator(isel).count(), 8);
          for (let j = 0; j < m; j++) {
            const ie = page.locator(isel).nth(j);
            let it = '';
            try { it = ((await ie.textContent({ timeout: 300 })) || '').trim().replace(/\s+/g, ' ').slice(0, 30); } catch { continue; }
            if (TABU.test(it)) continue;
            try { await ie.click({ timeout: 1000 }); } catch { continue; }
            klicks++;
            await page.waitForTimeout(300);
            if (!(await lebt())) { pruef(false, 'Seite verschwunden in "' + text + '" > "' + it + '"'); break; }
            merke(app + '/' + tab + ' "' + text + '" > "' + it + '"');
            if (!(await page.evaluate(() => document.getElementById('layers').children.length))) break;
          }
        }
        if (!(await zu())) { pruef(false, 'Seite verschwunden beim Schliessen nach "' + text + '"'); break; }
        merke(app + '/' + tab + ' schliessen');
        /* Manches führt zur Startseite („Zur Startseite", „Ändern") – dann die
           App wieder aufmachen, sonst läuft der Rundgang ins Leere. */
        if (!(await page.evaluate(id => { const e = document.getElementById(id); return !!e && !e.hidden; }, cfg.rumpf))) {
          await page.evaluate(() => splashZeigen()); await page.waitForTimeout(250);
          await page.locator('.splash [data-app="' + app + '"]').click(); await page.waitForTimeout(600);
        }
        await page.evaluate(([a, t]) => { const b = document.querySelector('[' + a + '="' + t + '"]'); if (b) b.click(); }, [cfg.attr, tab]);
        await page.waitForTimeout(200);
      }
    }
  }
  if (!SCHNELL) P.push('     ' + klicks + ' Bedienelemente angetippt');

  /* ---------- Teil 2: Ebenen und Verlauf ---------- */
  if (await lebt()) {
    await zu();
    await page.evaluate(() => splashZeigen()); await page.waitForTimeout(250);
    await page.locator('.splash [data-app="leseliste"]').click(); await page.waitForTimeout(600);

    await page.evaluate(() => { for (let i = 0; i < 3; i++) blatt('Probe ' + i, '<p>x</p>'); });
    await page.waitForTimeout(250);
    pruef((await stand()).ebenen === 3, 'drei Blätter offen');
    await page.evaluate(() => alleLayerSchliessen()); await page.waitForTimeout(500);
    pruef(await lebt(), 'alleLayerSchliessen lässt die Seite stehen');
    if (await lebt()) {
      const s = await stand();
      pruef(s.ebenen === 0 && s.tiefe === 0, 'danach nichts offen und der Verlauf wieder auf der App  ' + JSON.stringify(s));

      /* Schliessen und im selben Zug wieder öffnen: nichts darf offen bleiben,
         das der Verlauf nicht mehr erreicht. */
      await page.evaluate(() => { blatt('A', '<p>a</p>'); layerSchliessen(); blatt('B', '<p>b</p>'); });
      await page.waitForTimeout(600);
      const w = await stand();
      pruef(await lebt() && w.ebenen <= w.tiefe, 'Wettlauf schliessen/öffnen lässt keine Ebene ohne Verlaufsmarke  ' + JSON.stringify(w));
      await zu();

      /* Zurück-Taste schliesst genau eine Ebene. */
      await page.evaluate(() => { blatt('E', '<p>e</p>'); blatt('F', '<p>f</p>'); });
      await page.waitForTimeout(300);
      await page.evaluate(() => history.back()); await page.waitForTimeout(450);
      pruef((await stand()).ebenen === 1, 'Zurück-Taste schliesst genau eine Ebene');
      await page.evaluate(() => alleLayerSchliessen()); await page.waitForTimeout(500);
      pruef(await lebt() && (await stand()).ebenen === 0, 'danach ist alles zu und die Seite noch da');

      /* Zehnmal auf und zu. */
      for (let i = 0; i < 10 && await lebt(); i++) {
        await page.evaluate(() => blatt('X', '<p>x</p>')); await page.waitForTimeout(110);
        await page.evaluate(() => layerSchliessen()); await page.waitForTimeout(210);
      }
      pruef(await lebt() && (await stand()).ebenen === 0, '10× Blatt auf und zu');
    }
    merke('Ebenen');
  } else P.push('FEHL Seite war vor der Ebenen-Prüfung schon weg');

  console.log((LEER ? '(leere Datenbasis)\n' : '') + P.join('\n'));
  const schlecht = P.filter(z => z.startsWith('FEHL')).length;
  console.log(schlecht ? '\n' + schlecht + ' Beanstandung(en)' : '\nalles in Ordnung');
  await browser.close();
  process.exit(schlecht ? 1 : 0);
})();
