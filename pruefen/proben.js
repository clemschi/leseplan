#!/usr/bin/env node
/**
 * Alle Einzelproben unter pruefen/proben/ hintereinander.
 * Jede ist für sich lauffähig; hier laufen sie am Stück und melden am Ende
 * eine Zahl. Sie prüfen, was der Rundgang nicht sieht: einzelne Abläufe,
 * die einmal kaputt waren und nicht wieder kaputtgehen sollen.
 *
 *   node pruefen/proben.js              alle
 *   node pruefen/proben.js stoebern     nur die, deren Name das enthält
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ordner = path.join(__dirname, 'proben');
const filter = process.argv.slice(2).filter(a => !a.startsWith('-'));
const dateien = fs.readdirSync(ordner).filter(n => n.endsWith('.js'))
  .filter(n => !filter.length || filter.some(f => n.includes(f)))
  .sort();

if (!dateien.length) { console.log('Keine Probe gefunden.'); process.exit(0); }
if (!fs.existsSync(path.join(__dirname, '..', 'mylife.html'))) {
  console.log('mylife.html fehlt – erst "node build.js".');
  process.exit(1);
}

let gut = 0, schlecht = [];
for (const d of dateien) {
  process.stdout.write('── ' + d.replace(/\.js$/, '') + ' ');
  let aus = '';
  let fehler = false;
  try {
    aus = execFileSync(process.execPath, [path.join(ordner, d)], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: Object.assign({}, process.env, { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers' })
    });
  } catch (e) {
    fehler = true;
    aus = (e.stdout || '') + (e.stderr || '');
  }
  const zahl = /(\d+) OK, (\d+) FEHL/.exec(aus);
  if (!fehler && zahl && zahl[2] === '0') {
    gut++;
    console.log('· ' + zahl[1] + ' OK');
  } else {
    schlecht.push(d);
    console.log('· FEHL');
    aus.split('\n').filter(z => /^FEHL/.test(z) || /Error|Timeout/.test(z))
      .slice(0, 6).forEach(z => console.log('     ' + z.trim()));
  }
}

console.log('\n' + gut + ' von ' + dateien.length + ' Proben in Ordnung'
  + (schlecht.length ? ' – offen: ' + schlecht.join(', ') : ''));
process.exit(schlecht.length ? 1 : 0);
