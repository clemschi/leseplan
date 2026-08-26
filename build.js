#!/usr/bin/env node
/**
 * Baut aus leseplan.html (Artifact-Fassung ohne Dokumentrahmen)
 * die eigenstaendige index.html zum lokalen Oeffnen.
 */
const fs = require('fs');
const path = require('path');

const wurzel = __dirname;
const inhalt = fs.readFileSync(path.join(wurzel, 'leseplan.html'), 'utf8');

const schnitt = inhalt.indexOf('</style>');
if (schnitt < 0) throw new Error('Kein </style> gefunden – Aufbau von leseplan.html geprueft?');
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
<meta name="apple-mobile-web-app-title" content="leseliste">
<meta name="application-name" content="leseliste">
<!-- Erzeugt aus leseplan.html - nicht von Hand bearbeiten, sondern: node build.js -->
${kopf}
</head>
<body>
${rumpf.trim()}
</body>
</html>
`;

fs.writeFileSync(path.join(wurzel, 'leseliste.html'), seite);
console.log('leseliste.html geschrieben (' + Math.round(seite.length / 1024) + ' KB)');
