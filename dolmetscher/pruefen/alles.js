#!/usr/bin/env node
/* Alle Proben nacheinander. Ohne Argument laeuft alles, mit einem Wort
   nur die Proben, deren Name es enthaelt:  node pruefen/alles.js kern  */
import uebersetzen from './uebersetzen.js';
import kern from './kern.js';
import server from './server.js';
import oberflaeche from './oberflaeche.js';
import verbindung from './verbindung.js';

const PROBEN = [
  ['uebersetzen', uebersetzen],
  ['kern', kern],
  ['verbindung', verbindung],
  ['server', server],
  ['oberflaeche', oberflaeche]
];

const wunsch = (process.argv[2] || '').toLowerCase();
let gut = 0;
let schlecht = 0;

for (const [name, probe] of PROBEN) {
  if (wunsch && !name.includes(wunsch)) continue;
  try {
    const stand = await probe();
    gut += stand.gut;
    schlecht += stand.schlecht;
  } catch (e) {
    schlecht += 1;
    console.log('  FEHL ' + name + ' ist abgestuerzt - ' + e.message);
  }
}

console.log('\n' + (schlecht ? 'FEHL' : 'OK') + ': ' + gut + ' gut, ' + schlecht + ' schlecht');
process.exit(schlecht ? 1 : 0);
