#!/usr/bin/env node
/**
 * Baut aus mylife.src.html (Fassung ohne Dokumentrahmen)
 * die eigenstaendige mylife.html zum lokalen Oeffnen.
 */
const fs = require('fs');
const path = require('path');

const wurzel = __dirname;
const inhalt = fs.readFileSync(path.join(wurzel, 'mylife.src.html'), 'utf8');

const schnitt = inhalt.indexOf('</style>');
if (schnitt < 0) throw new Error('Kein </style> gefunden – Aufbau von mylife.src.html geprueft?');
const kopf = inhalt.slice(0, schnitt + '</style>'.length);
const rumpf = inhalt.slice(schnitt + '</style>'.length);

const seite = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="theme-color" content="#0c0e11">
<meta name="color-scheme" content="dark light">
<meta name="apple-mobile-web-app-capable" content="yes">
<!-- Legt man die Seite auf den Startbildschirm, startet sie damit ohne Browserleisten. -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="mylife">
<meta name="application-name" content="mylife">
<!-- Erzeugt aus mylife.src.html - nicht von Hand bearbeiten, sondern: node build.js -->
${kopf}
</head>
<body>
${rumpf.trim()}
</body>
</html>
`;

fs.writeFileSync(path.join(wurzel, 'mylife.html'), seite);
console.log('mylife.html geschrieben (' + Math.round(seite.length / 1024) + ' KB)');

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
  theme_color: '#0c0e11',
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
