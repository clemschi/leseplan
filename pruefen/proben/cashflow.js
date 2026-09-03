const chromium = (() => { try { return require('playwright').chromium; }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright').chromium; } })();
const path = require('path');
const { saeen } = require(__dirname + '/../saat.js');
const DATEI = 'file://' + path.join(__dirname, '..', '..', 'mylife.html');
let ok = 0, fehl = 0;
const P = (name, gut, info) => { if (gut) { ok++; console.log('OK   ' + name + (info ? ' – ' + info : '')); } else { fehl++; console.log('FEHL ' + name + (info ? ' – ' + info : '')); } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, hasTouch: true });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });

  await page.goto(DATEI);
  await saeen(page, false);
  await page.reload();
  await page.waitForTimeout(500);

  // --- Startbildschirm zeigt cashflow ---
  const apps = await page.$$eval('#setup .app', ns => ns.map(n => n.textContent.trim()));
  P('cashflow im Startbildschirm', apps.includes('cashflow'), apps.join(', '));

  await page.click('[data-app="cash"]');
  await page.waitForTimeout(500);
  P('Fläche #ca offen', await page.$eval('#ca', n => !n.hidden));
  P('kein Setup-Blatt', await page.$eval('#setup', n => n.hidden));

  const tabs = await page.$$eval('#catabbar button', ns => ns.map(n => n.dataset.catab));
  P('vier Reiter', tabs.length === 4 && tabs.join(',') === 'stand,routinen,posten,camehr', tabs.join(','));

  // --- Zahl oben ---
  const zahl0 = await page.$eval('.cazahl b', n => n.textContent.trim());
  P('Stand heute steht da', /\d/.test(zahl0), zahl0);

  // Erwartung aus den gesäten Daten nachrechnen (im Browser, mit derselben Rechnung)
  const rechnung = await page.evaluate(() => {
    const h = heute();
    return { heute: caStandAm(h), stand: CDB.stand.cent, tag: CDB.stand.tag,
             routinen: CDB.routinen.length, posten: CDB.posten.length };
  });
  P('Daten aus daten-cash gelesen', rechnung.routinen === 5 && rechnung.posten === 3,
    rechnung.routinen + ' Routinen, ' + rechnung.posten + ' Posten');
  P('eigener Schlüssel daten-cash', (await page.evaluate(() => CStore.datenKey || 'daten-cash')) !== null);

  // --- Zeitstrahl: ziehen ändert Datum und Zahl ---
  const bahn = await page.$('.cabahn');
  const box = await bahn.boundingBox();
  P('Bahn sichtbar', box && box.height > 100, box ? Math.round(box.width) + '×' + Math.round(box.height) : '-');

  const zielVor = await page.evaluate(() => caZiel);
  await page.mouse.move(box.x + 6, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const nach = await page.evaluate(() => ({ ziel: caZiel, stand: caStandAm(caZiel) }));
  P('Ziehen setzt ein Ziel in der Zukunft', nach.ziel > zielVor, zielVor + ' → ' + nach.ziel);

  const angezeigt = await page.$eval('.cazahl b', n => n.textContent.trim());
  const erwartet = await page.evaluate(() => cGeld(caStandAm(caZiel)));
  P('angezeigte Zahl = gerechneter Stand', angezeigt === erwartet, angezeigt + ' / ' + erwartet);

  // Griff sitzt dort, wo gezogen wurde
  const griff = await page.evaluate(() => {
    const g = document.querySelector('.cagriff'), b = document.querySelector('.cabahn');
    return { g: g.getBoundingClientRect().left + 5.5 - b.getBoundingClientRect().left,
             w: b.getBoundingClientRect().width };
  });
  P('Griff bei ~50 %', Math.abs(griff.g / griff.w - 0.5) < 0.03,
    (100 * griff.g / griff.w).toFixed(1) + ' %');

  // Heute-Knopf zurück
  await page.click('[data-caheute]');
  await page.waitForTimeout(150);
  P('Heute setzt zurück', await page.evaluate(() => caZiel === heute()));

  // --- Rechnung prüfen: ein Monat vorwärts ---
  const probe = await page.evaluate(() => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 30);
    const ziel = kIso(d);
    const b = caBis(ziel);
    return { ziel, stand: b.stand, ein: b.ein, aus: b.aus, n: b.liste.length,
             summe: CDB.stand.cent + b.ein + b.aus };
  });
  P('Stand = Ausgang + ein + aus', probe.stand === probe.summe,
    (probe.stand/100).toFixed(2) + ' €');
  P('in 30 Tagen passiert etwas', probe.n >= 4, probe.n + ' Ereignisse');
  P('ruhende Routine zählt nicht', await page.evaluate(() => {
      const d = new Date(); d.setDate(d.getDate() + 400);
      return !caBis(kIso(d)).liste.some(e => e.name === 'Fitnessstudio');
  }));
  P('Wochenroutine trifft nur Samstage', await page.evaluate(() => {
      const r = CDB.routinen.find(x => x.id === 'r3');
      const d = new Date(); d.setDate(d.getDate() + 90);
      return caTermine(r, heute(), kIso(d)).every(t => kDatum(t).getDay() === 6);
  }));

  // --- Posten eintragen ---
  await page.click('[data-caspontan]');
  await page.waitForTimeout(300);
  await page.fill('.sheet [data-name]', 'Testkauf');
  await page.fill('.sheet [data-betrag]', '-12,34');
  await page.click('.sheet [data-ok]');
  await page.waitForTimeout(400);
  const nachPosten = await page.evaluate(() => ({
    n: CDB.posten.length, letzt: CDB.posten[CDB.posten.length - 1]
  }));
  P('Posten angelegt, Cent stimmen', nachPosten.n === 4 && nachPosten.letzt.cent === -1234,
    nachPosten.letzt.cent + ' Cent');

  // --- Routine eintragen ---
  await page.click('[data-catab="routinen"]');
  await page.waitForTimeout(300);
  const proMonat = await page.$eval('.cazahl b', n => n.textContent.trim());
  P('Monatsbilanz steht', /\d/.test(proMonat), proMonat);
  await page.click('[data-caneu]');
  await page.waitForTimeout(300);
  await page.fill('.sheet [data-name]', 'Strom');
  await page.fill('.sheet [data-betrag]', '-64,90');
  await page.fill('.sheet [data-tag]', '12');
  await page.click('.sheet [data-ok]');
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => CDB.routinen[CDB.routinen.length - 1]);
  P('Routine angelegt', r.name === 'Strom' && r.cent === -6490 && r.tag === 12 && r.takt === 'monat',
    JSON.stringify({ n: r.name, c: r.cent, t: r.tag }));

  // Takt wechseln blendet die richtigen Felder ein
  await page.click('[data-caroutine="r3"]');
  await page.waitForTimeout(300);
  const felder = await page.evaluate(() => ({
    tag: document.querySelector('.sheet [data-wanntag]').hidden,
    woche: document.querySelector('.sheet [data-wannwoche]').hidden,
    monat: document.querySelector('.sheet [data-wannmonat]').hidden
  }));
  P('Wochenroutine zeigt den Wochentag', felder.tag && !felder.woche && felder.monat, JSON.stringify(felder));
  await page.selectOption('.sheet [data-takt]', 'jahr');
  await page.waitForTimeout(150);
  const felder2 = await page.evaluate(() => ({
    tag: document.querySelector('.sheet [data-wanntag]').hidden,
    woche: document.querySelector('.sheet [data-wannwoche]').hidden,
    monat: document.querySelector('.sheet [data-wannmonat]').hidden
  }));
  P('jährlich zeigt Tag und Monat', !felder2.tag && felder2.woche && !felder2.monat, JSON.stringify(felder2));
  await page.evaluate(() => layerSchliessen());
  await page.waitForTimeout(300);

  // --- Posten-Reiter ---
  await page.click('[data-catab="posten"]');
  await page.waitForTimeout(300);
  const pz = await page.$$eval('.caposten', n => n.length);
  P('Posten gelistet', pz === 4, pz + ' Zeilen');

  // --- Mehr: Speicherort, Horizont, Hülle ---
  await page.click('[data-catab="camehr"]');
  await page.waitForTimeout(300);
  const mehr = await page.evaluate(() => ({
    ort: !!document.querySelector('#caview [data-appdaten], #caview [data-ort], #caview .list-card'),
    horizont: !!document.querySelector('[data-cahorizont]'),
    waehrung: !!document.querySelector('[data-cawaehrung]'),
    huelle: document.querySelector('#caview').textContent.includes('Akzent')
  }));
  P('Mehr hat Speicherblock, Horizont, Währung, Hülle',
    mehr.horizont && mehr.waehrung && mehr.huelle, JSON.stringify(mehr));

  await page.fill('[data-cahorizont]', '3');
  await page.dispatchEvent('[data-cahorizont]', 'change');
  await page.waitForTimeout(300);
  P('Horizont übernommen', await page.evaluate(() => CDB.einstellungen.horizont === 3));

  // --- Speicher-Chip / Autosave ---
  await page.click('[data-catab="stand"]');
  await page.waitForTimeout(300);
  P('Speicherchip in der Kopfzeile', await page.$eval('#caSaveChip', n => !!n.dataset.state));
  const marken = await page.$eval('.camonate', n => n.children.length);
  P('Monatsmarken bei 3 Monaten', marken >= 2 && marken <= 4, marken + ' Marken');

  // --- Neuladen: alles wieder da ---
  await page.evaluate(() => CStore.sichern(true));
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(500);
  await page.click('[data-app="cash"]');
  await page.waitForTimeout(500);
  const wieder = await page.evaluate(() => ({
    r: CDB.routinen.length, p: CDB.posten.length, h: CDB.einstellungen.horizont
  }));
  P('nach Neuladen alles da', wieder.r === 6 && wieder.p === 4 && wieder.h === 3, JSON.stringify(wieder));

  // --- heimZiehen: Bahn ist tabu ---
  const tabu = await page.evaluate(() => {
    const b = document.querySelector('.cabahn');
    return !!b && !!b.closest('.cabahn');
  });
  P('.cabahn steht in der Tabu-Liste', tabu);

  const echt = fehler.filter(f => !/ERR_CONNECTION|ERR_NAME|net::|fonts\.g|google/.test(f));
  P('keine Konsolenfehler', echt.length === 0, echt.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' OK, ' + fehl + ' FEHL');
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
