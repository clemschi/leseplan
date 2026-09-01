#!/usr/bin/env node
/**
 * Setzt aus den Bausteinen unter src/ die eigenstaendige mylife.html zusammen.
 * Ein Baustein ist reiner Inhalt - Stil, Markup oder Skript; die Klammern
 * (<style>, <script>, Dokumentrahmen) kommen von hier.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const wurzel = __dirname;

/* Die Reihenfolge ist die des Skripts: was oben steht, laeuft zuerst.
   Ein neuer Abschnitt kommt als eigene Datei dazu und wird hier eingehaengt. */
const KOPF = ['kopf.html'];
const STIL = [
  'stil/basis.css',
  'stil/kalender.css',
  'stil/fastreader.css',
  'stil/gsund.css',
  'stil/puzzle.css',
  'stil/minimal.css',
  'stil/cash.css',
  'stil/stoebern.css'
];
const MARKUP = ['rumpf.html'];
const SKRIPT = [
  'js/grundlage.js',
  'js/datenmodell.js',
  'js/speicher.js',
  'js/einrichtung.js',
  'js/erscheinung.js',
  'js/rahmen.js',
  'js/kalender.js',
  'js/fastreader.js',
  'js/gsund.js',
  'js/puzzle.js',
  'js/minimal.js',
  'js/cash.js',
  'js/sitzungen.js',
  'js/ebenen.js',
  'js/plan.js',
  'js/laden.js',
  'js/bilder.js',
  'js/buch.js',
  'js/diagramme.js',
  'js/themenfelder.js',
  'js/einkauf.js',
  'js/prompts.js',
  'js/stoebern.js',
  'js/mehr.js',
  'js/start.js'
];

const lies = name => {
  const p = path.join(wurzel, 'src', name);
  if (!fs.existsSync(p)) throw new Error('Baustein fehlt: src/' + name);
  return fs.readFileSync(p, 'utf8');
};
const teile = liste => liste.map(lies).join('');

const skript = teile(SKRIPT);
const kopf = teile(KOPF) + '<style>\n' + teile(STIL) + '</style>';
const rumpf = teile(MARKUP) + '<script>\n' + skript + '</script>';

/* Zwei Pruefungen, bevor geschrieben wird - sie kosten nichts und ersparen
   den Umweg ueber den Browser. */

/* 1. Ist das Skript ueberhaupt gueltig? new Function baut es, fuehrt es aber
      nicht aus: ein Tippfehler faellt hier auf, nicht erst beim Oeffnen. */
try {
  new Function(skript);
} catch (e) {
  throw new Error('Das Skript hat einen Syntaxfehler: ' + e.message);
}

/* 2. Alle Bausteine teilen sich einen Namensraum. Ein zweites "function foo"
      ueberschreibt das erste stillschweigend - das faellt sonst erst auf,
      wenn die falsche Ausfertigung laeuft. */
const namen = new Map();
SKRIPT.forEach(datei => {
  lies(datei).split('\n').forEach((zeile, i) => {
    const m = /^(?:async\s+)?(?:function|const|let|var)\s+([A-Za-z0-9_$]+)/.exec(zeile);
    if (!m) return;
    const vorher = namen.get(m[1]);
    if (vorher) {
      console.warn('WARNUNG: "' + m[1] + '" steht zweimal - ' + vorher
        + ' und src/' + datei + ':' + (i + 1) + '. Der zweite gewinnt.');
    } else namen.set(m[1], 'src/' + datei + ':' + (i + 1));
  });
});

const seite = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark light">
<meta name="apple-mobile-web-app-capable" content="yes">
<!-- Legt man die Seite auf den Startbildschirm, startet sie damit ohne Browserleisten. -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="mylife">
<meta name="application-name" content="mylife">
<!-- Erzeugt aus src/ - nicht von Hand bearbeiten, sondern: node build.js -->
${kopf}
</head>
<body>
${rumpf.trim()}
</body>
</html>
`;

fs.writeFileSync(path.join(wurzel, 'mylife.html'), seite);
console.log('mylife.html geschrieben (' + Math.round(seite.length / 1024) + ' KB aus '
  + (KOPF.length + STIL.length + MARKUP.length + SKRIPT.length) + ' Bausteinen)');

/* Daneben ein Manifest. Aus einer Datei heraus meldet die Seite es gar nicht
   erst an; liegt sie aber unter einer Adresse, legt Chrome sie damit als
   eigene App auf den Startbildschirm - ohne Browserleisten und damit ohne
   den Vollbild-Hinweis bei jedem Start. */
const zeichen = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">'
  + '<rect width="192" height="192" rx="42" fill="#000"/>'
  + '<text x="96" y="126" font-family="Georgia,serif" font-size="96" fill="#dba43f"'
  + ' text-anchor="middle">m</text></svg>';
const manifest = {
  name: 'mylife',
  short_name: 'mylife',
  start_url: './mylife.html',
  scope: './',
  display: 'standalone',
  background_color: '#000000',
  theme_color: '#000000',
  lang: 'de',
  icons: [{
    src: 'data:image/svg+xml,' + encodeURIComponent(zeichen),
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any'
  }]
};
fs.writeFileSync(path.join(wurzel, 'mylife.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log('mylife.webmanifest geschrieben');

/* Und eine Weiche: liegt das Ganze unter einer Adresse, soll die kurze Form
   ohne Dateinamen genuegen. Sie schickt weiter auf mylife.html - der Name
   steht danach in der Adresszeile, so wie er soll. Ein paar hundert Byte
   statt einer zweiten Ausfertigung der ganzen Seite. */
const weiche = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta http-equiv="refresh" content="0; url=./mylife.html">
<link rel="canonical" href="./mylife.html">
<title>mylife</title>
<style>html,body{background:#000;color:#8b8d96;font-family:system-ui,sans-serif;height:100%;margin:0}
body{display:grid;place-items:center;font-size:14px}a{color:#dba43f}</style>
</head>
<body><p>mylife wird geladen \u2026 <a href="./mylife.html">weiter</a></p>
<script>location.replace('./mylife.html');</script>
</body>
</html>
`;
fs.writeFileSync(path.join(wurzel, 'index.html'), weiche);
console.log('index.html geschrieben (Weiche auf mylife.html)');

/* Und die Seite noch einmal als ZIP mit genau einer Datei darin.
   Grund: GitHub liefert eine .html roh als text/plain und ohne
   content-disposition aus - der Browser zeigt sie dann an, statt sie zu
   sichern. Eine .zip kommt als Anhang und landet verlaesslich im
   Download-Ordner; entpackt liegt genau mylife.html da. */
const zip = (() => {
  const roh = Buffer.from(seite, 'utf8');
  const gepackt = zlib.deflateRawSync(roh, { level: 9 });
  const name = Buffer.from('mylife.html', 'utf8');
  const crc = (() => {
    let c, tabelle = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      tabelle[n] = c >>> 0;
    }
    let x = 0xFFFFFFFF;
    for (const b of roh) x = tabelle[(x ^ b) & 0xFF] ^ (x >>> 8);
    return (x ^ 0xFFFFFFFF) >>> 0;
  })();

  /* Ohne Zeitstempel: sonst faellt die Datei bei jedem Bauen anders aus und
     steht als Aenderung im Verlauf, obwohl sich nichts geaendert hat. */
  const kopfSatz = (sig, extra) => {
    const b = Buffer.alloc(extra ? 30 : 46);
    b.writeUInt32LE(sig, 0);
    let o = 4;
    if (!extra) { b.writeUInt16LE(20, o); o += 2; }   /* erzeugt von */
    b.writeUInt16LE(20, o); o += 2;                   /* gebraucht wird */
    b.writeUInt16LE(0, o); o += 2;                    /* Merker */
    b.writeUInt16LE(8, o); o += 2;                    /* deflate */
    b.writeUInt16LE(0, o); o += 2;                    /* Zeit */
    b.writeUInt16LE(33, o); o += 2;                   /* Datum: 1.1.1980 */
    b.writeUInt32LE(crc, o); o += 4;
    b.writeUInt32LE(gepackt.length, o); o += 4;
    b.writeUInt32LE(roh.length, o); o += 4;
    b.writeUInt16LE(name.length, o); o += 2;
    b.writeUInt16LE(0, o); o += 2;                    /* Zusatz */
    return b;
  };
  const lokal = Buffer.concat([kopfSatz(0x04034b50, true), name]);
  const mitte = Buffer.concat([kopfSatz(0x02014b50, false), name]);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0);
  ende.writeUInt16LE(1, 8);
  ende.writeUInt16LE(1, 10);
  ende.writeUInt32LE(mitte.length, 12);
  ende.writeUInt32LE(lokal.length + gepackt.length, 16);
  return Buffer.concat([lokal, gepackt, mitte, ende]);
})();
fs.writeFileSync(path.join(wurzel, 'mylife.zip'), zip);
console.log('mylife.zip geschrieben (' + Math.round(zip.length / 1024) + ' KB, nur mylife.html darin)');
