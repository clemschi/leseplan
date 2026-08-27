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
