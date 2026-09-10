#!/usr/bin/env node
// Ausweichweg ohne API: willhaben.at und der Parfumo-Flohmarkt.
// Ordentlicher User-Agent, Pausen zwischen den Abrufen, keine Parallelität.
//
//   node kleinanzeigen.js roh      – Seiten holen und als HTML ablegen
//   node kleinanzeigen.js lesen    – aus den abgelegten Seiten Angebote ziehen
//
// Absicht: erst holen, dann lesen. Die Auslesefunktionen unten sind gegen echtes
// Markup noch nicht geprüft – wer sie das erste Mal laufen lässt, vergleicht sie
// mit den Dateien aus "roh" und rückt die Selektoren zurecht.

const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const PAUSE = 4000;                       // vier Sekunden zwischen Abrufen
const ROH = path.join(__dirname, 'roh');

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

const QUELLEN = [
  { name: 'willhaben',
    seiten: [1, 2, 3].map((p) =>
      `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=armani%20si%20intense&page=${p}`) },
  { name: 'parfumo',
    seiten: [1, 2, 3].map((p) =>
      `https://www.parfumo.de/Flohmarkt?query=Armani+Si+Intense&page=${p}`) },
];

async function roh() {
  fs.mkdirSync(ROH, { recursive: true });
  for (const q of QUELLEN) {
    for (let i = 0; i < q.seiten.length; i++) {
      const url = q.seiten[i];
      try {
        const a = await fetch(url, {
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'de-AT,de;q=0.9',
          },
        });
        const text = await a.text();
        const datei = path.join(ROH, `${q.name}-${i + 1}.html`);
        fs.writeFileSync(datei, text);
        console.log(`${q.name} Seite ${i + 1}: ${a.status}, ${text.length} Zeichen → ${path.basename(datei)}`);
      } catch (f) {
        console.error(`${q.name} Seite ${i + 1}: ${f.message}`);
      }
      await warte(PAUSE);
    }
  }
}

// willhaben legt seine Daten als JSON in __NEXT_DATA__ ab – das ist stabiler
// als jeder CSS-Selektor. Bricht das weg, greift die Rückfallschleife darunter.
function willhabenLesen(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return { treffer: [], hinweis: '__NEXT_DATA__ nicht gefunden – Markup hat sich geändert' };
  let daten;
  try { daten = JSON.parse(m[1]); }
  catch (f) { return { treffer: [], hinweis: `__NEXT_DATA__ ist kein JSON: ${f.message}` }; }

  // Der Pfad zu den Anzeigen wandert zwischen willhaben-Versionen; darum wird
  // der Baum abgesucht, statt einen festen Pfad anzunehmen.
  const treffer = [];
  (function suchen(k) {
    if (!k || typeof k !== 'object') return;
    if (Array.isArray(k)) { k.forEach(suchen); return; }
    if (k.id && (k.description || k.heading) && (k.attributes || k.price)) {
      treffer.push({
        id: String(k.id),
        titel: k.description || k.heading,
        url: k.seoUrl ? `https://www.willhaben.at/iad/${k.seoUrl}` : null,
        roh: k,
      });
    }
    Object.values(k).forEach(suchen);
  })(daten);
  return { treffer, hinweis: treffer.length ? null : 'Baum durchsucht, nichts gefunden' };
}

// Parfumo liefert reines HTML. Ohne Bibliothek: die Blöcke grob abgreifen und
// die Felder darin einzeln herausziehen.
function parfumoLesen(html) {
  const treffer = [];
  const bloecke = html.match(/<div[^>]*class="[^"]*(?:flea|market|offer)[^"]*"[\s\S]{0,2000}?<\/div>/gi) || [];
  for (const b of bloecke) {
    const url = (b.match(/href="([^"]*(?:Flohmarkt|flea)[^"]*)"/i) || [])[1];
    const titel = (b.match(/>([^<]{8,120})</) || [])[1];
    const preis = (b.match(/(\d+[.,]?\d*)\s*(?:€|EUR)/) || [])[1];
    if (url && titel) treffer.push({ url: url.startsWith('http') ? url : `https://www.parfumo.de${url}`, titel: titel.trim(), preis });
  }
  return { treffer, hinweis: treffer.length ? null : 'Keine Blöcke erkannt – Selektoren an roh/parfumo-1.html anpassen' };
}

function lesen() {
  if (!fs.existsSync(ROH)) { console.error('Erst "node kleinanzeigen.js roh" laufen lassen.'); process.exit(1); }
  const alles = [];
  for (const datei of fs.readdirSync(ROH).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROH, datei), 'utf8');
    const { treffer, hinweis } = datei.startsWith('willhaben')
      ? willhabenLesen(html) : parfumoLesen(html);
    console.log(`${datei}: ${treffer.length} Angebote${hinweis ? ` – ${hinweis}` : ''}`);
    alles.push(...treffer.map((t) => ({ ...t, quelle: datei.split('-')[0] })));
  }
  fs.writeFileSync(path.join(__dirname, 'kleinanzeigen.json'), JSON.stringify(alles, null, 2));
  console.log(`kleinanzeigen.json: ${alles.length} Angebote. Bilder und Flakonprüfung von Hand.`);
}

const schritt = process.argv[2];
const schritte = { roh, lesen };
if (!schritte[schritt]) { console.error('Aufruf: node kleinanzeigen.js roh|lesen'); process.exit(1); }
Promise.resolve(schritte[schritt]()).catch((f) => { console.error(f.message); process.exit(1); });
