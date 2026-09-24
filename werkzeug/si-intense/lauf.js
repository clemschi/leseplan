#!/usr/bin/env node
// Ablauf in drei Schritten, jeder einzeln aufrufbar:
//   node lauf.js sammeln   – suchen, filtern, Details holen, Bilder laden
//   node lauf.js bogen     – Kontaktbogen (HTML) je Gruppe zum Ansehen
//   node lauf.js tabelle   – Markdown-Tabelle aus klassifikation.json
// Immer mit NODE_USE_ENV_PROXY=1 starten, sonst geht Node am Proxy vorbei.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const ebay = require('./ebay');
const tab = require('./tabelle');

const HIER = __dirname;
const ROH = path.join(HIER, 'treffer.json');
const URTEIL = path.join(HIER, 'klassifikation.json');
const BILDER = path.join(HIER, cfg.ordner);

// ---- Schritt 1: sammeln --------------------------------------------------

async function sammeln() {
  const roh = await ebay.alleSuchen();
  console.log(`Zusammen ${roh.length} Angebote, vor dem Titelfilter.`);

  const behalten = roh.filter((t) => !cfg.titelSperre.test(t.title || ''));
  console.log(`Nach Titelfilter: ${behalten.length} (${roh.length - behalten.length} verworfen).`);

  const fertig = [];
  for (let i = 0; i < behalten.length; i++) {
    const t = behalten[i];
    process.stdout.write(`  [${i + 1}/${behalten.length}] ${t.itemId} `);
    let d = null;
    try { d = await ebay.detail(t); } catch (f) { console.log(`Detail fehlgeschlagen: ${f.message}`); }
    if (!d) { console.log('– weg'); await ebay.warte(cfg.pause); continue; }
    // Der Titel im Detail kann anders lauten als in der Übersicht – nochmal prüfen.
    if (cfg.titelSperre.test(d.detail.title || '')) { console.log('– Titelfilter (Detail)'); continue; }
    const bilder = await ebay.bilderLaden(d, BILDER);
    console.log(`${bilder.length} Bilder`);
    fertig.push(d);
    await ebay.warte(cfg.pause);
  }

  fs.writeFileSync(ROH, JSON.stringify(fertig, null, 2));

  // Urteilsdatei anlegen bzw. um neue Item-IDs ergänzen, Bestehendes nie überschreiben.
  const alt = fs.existsSync(URTEIL) ? JSON.parse(fs.readFileSync(URTEIL, 'utf8')) : {};
  for (const e of fertig) if (!(e.itemId in alt)) alt[e.itemId] = 'ungeprueft';
  fs.writeFileSync(URTEIL, JSON.stringify(alt, null, 2));

  console.log(`\n${fertig.length} Angebote in treffer.json, Bilder unter ${cfg.ordner}/.`);
  console.log('Urteile stehen alle auf "ungeprueft" – erlaubte Werte:');
  console.log('  2014 | 2021 | 2023 | anderes | ungeprueft');
}

// ---- Schritt 2: Kontaktbogen --------------------------------------------

function bogen() {
  const eintraege = JSON.parse(fs.readFileSync(ROH, 'utf8'));
  const proBogen = 12;
  const bogenOrdner = path.join(HIER, 'bogen');
  fs.mkdirSync(bogenOrdner, { recursive: true });

  for (let g = 0; g * proBogen < eintraege.length; g++) {
    const teil = eintraege.slice(g * proBogen, (g + 1) * proBogen);
    const karten = teil.map((e) => {
      const ordner = path.join(BILDER, String(e.itemId).replace(/[^\w.-]/g, '_'));
      const dateien = fs.existsSync(ordner)
        ? fs.readdirSync(ordner).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
        : [];
      const bilder = dateien.map((f) =>
        `<img src="../${cfg.ordner}/${path.basename(ordner)}/${f}" alt="">`).join('');
      const titel = (e.detail.title || '').replace(/</g, '&lt;');
      return `<figure><figcaption><b>${e.itemId}</b> · ${titel}</figcaption><div class="reihe">${bilder}</div></figure>`;
    }).join('\n');

    const html = `<!doctype html><meta charset="utf-8"><title>Bogen ${g + 1}</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}
figure{margin:0 0 24px}figcaption{margin-bottom:6px;font-size:13px}
.reihe{display:flex;gap:8px;overflow-x:auto}
img{height:220px;border-radius:6px;background:#fff}</style>
<h1>Bogen ${g + 1} – ${teil.length} Angebote</h1>
${karten}`;
    fs.writeFileSync(path.join(bogenOrdner, `bogen-${String(g + 1).padStart(2, '0')}.html`), html);
  }
  console.log(`Bögen liegen in bogen/ – je ${proBogen} Angebote.`);
}

// ---- Schritt 3: Tabelle --------------------------------------------------

function tabelle() {
  const eintraege = JSON.parse(fs.readFileSync(ROH, 'utf8'));
  const urteile = JSON.parse(fs.readFileSync(URTEIL, 'utf8'));

  const drin = eintraege.filter((e) => ['2014', 'ungeprueft'].includes(urteile[e.itemId]));
  const raus = eintraege.length - drin.length;

  const zahl = (w) => Object.values(urteile).filter((u) => u === w).length;
  const kopf = [
    `# Sì Intense (2014) – kaufbare Flakons`,
    ``,
    `Stand: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · Suche „${cfg.suche}“ auf ${cfg.marktplaetze.join(', ')}`,
    `Kurse: ${cfg.kurseStand}. Umgerechnete Preise sind mit ~ gekennzeichnet.`,
    ``,
    `Bestätigt 2014: ${zahl('2014')} · ungeprüft: ${zahl('ungeprueft')} · verworfen: ${raus}`,
    ``,
  ].join('\n');

  fs.writeFileSync(path.join(HIER, 'ergebnis.md'), `${kopf}${tab.markdown(drin, urteile)}\n`);
  console.log(`ergebnis.md geschrieben – ${drin.length} Zeilen.`);
}

// ---- Aufruf --------------------------------------------------------------

const schritt = process.argv[2];
const schritte = { sammeln, bogen, tabelle };
if (!schritte[schritt]) {
  console.error('Aufruf: node lauf.js sammeln|bogen|tabelle');
  process.exit(1);
}
Promise.resolve(schritte[schritt]()).catch((f) => { console.error(f.message); process.exit(1); });
