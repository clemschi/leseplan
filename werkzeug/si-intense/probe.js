// Probe der Teile, die ohne Netz laufen: Titelfilter, Umrechnung, Größe,
// Versand nach AT, Rückgabe, Sortierung, Tabellenbau.
const assert = require('assert');
const cfg = require('./config');
const tab = require('./tabelle');

let ok = 0, fehl = 0;
const p = (name, fn) => { try { fn(); ok++; console.log(`OK   ${name}`); }
  catch (f) { fehl++; console.log(`FEHL ${name}: ${f.message}`); } };

// --- Titelfilter ---
p('Titelfilter greift bei den vier Wörtern und 2021', () => {
  for (const t of ['Armani Si Intense Refillable 100ml', 'Si Intense nachfüllbar',
                   'Armani Si Passione Intense', 'Si Fiori Intense', 'Si Intense 2021 EDP']) {
    assert.ok(cfg.titelSperre.test(t), t);
  }
});
p('Titelfilter lässt den 2014er durch', () => {
  for (const t of ['Giorgio Armani Si Intense EDP 50ml schwarzer Flakon',
                   'Armani Sì Intense 100 ml Eau de Parfum']) {
    assert.ok(!cfg.titelSperre.test(t), t);
  }
});

// --- Umrechnung ---
p('EUR bleibt EUR, GBP wird umgerechnet und markiert', () => {
  assert.strictEqual(tab.preisEuro({ price: { value: '79.00', currency: 'EUR' } }).text, '79.00 €');
  const g = tab.preisEuro({ price: { value: '100.00', currency: 'GBP' } });
  assert.strictEqual(g.zahl, 117);
  assert.ok(g.text.startsWith('~117.00 €'));
});
p('Unbekannte Währung wird nicht geraten', () => {
  const x = tab.preisEuro({ price: { value: '50', currency: 'JPY' } });
  assert.strictEqual(x.zahl, null);
  assert.ok(/kein Kurs/.test(x.text));
});

// --- Größe ---
p('Größe aus Titel und aus localizedAspects', () => {
  assert.strictEqual(tab.groesse({ title: 'Si Intense 50 ml EDP' }), '50 ml');
  assert.strictEqual(tab.groesse({ title: 'Si Intense 100ml' }), '100 ml');
  assert.strictEqual(tab.groesse({ title: 'Si Intense', detail: { localizedAspects: [{ name: 'Größe', value: '30 ml' }] } }), '30 ml');
  assert.strictEqual(tab.groesse({ title: 'Si Intense EDP' }), 'unklar');
});

// --- Versand nach AT ---
p('Versand: AT genannt, weltweit, ausgeschlossen, unklar', () => {
  const f = (d) => tab.versandAT({ detail: d });
  assert.strictEqual(f({ shipToLocations: { regionIncluded: [{ regionId: 'AT' }] } }), 'ja');
  assert.strictEqual(f({ shipToLocations: { regionIncluded: [{ regionType: 'WORLDWIDE', regionId: 'WORLDWIDE' }] } }), 'ja');
  assert.strictEqual(f({ shipToLocations: { regionIncluded: [{ regionType: 'WORLDWIDE' }], regionExcluded: [{ regionId: 'AT' }] } }), 'nein');
  assert.strictEqual(f({ shipToLocations: { regionIncluded: [{ regionId: 'US' }] } }), 'nein');
  assert.strictEqual(f({}), 'unklar');
});

// --- Rückgabe ---
p('Rückgabe mit Frist und ohne', () => {
  assert.strictEqual(tab.rueckgabe({ detail: { returnTerms: { returnsAccepted: false } } }), 'nein');
  assert.strictEqual(tab.rueckgabe({ detail: {} }), 'unklar');
  assert.strictEqual(
    tab.rueckgabe({ detail: { returnTerms: { returnsAccepted: true, returnPeriod: { value: 30, unit: 'DAY' }, returnShippingCostPayer: 'SELLER' } } }),
    'ja (30 Tage, Verkäufer zahlt)');
});

// --- Sortierung ---
p('EU zuerst, darin Preis aufsteigend, ohne Preis ans Ende', () => {
  const e = (id, land, wert, waehrung) => ({
    itemId: id, itemLocation: { country: land },
    price: wert == null ? null : { value: String(wert), currency: waehrung || 'EUR' },
  });
  const sortiert = tab.sortieren([
    e('us-billig', 'US', 10), e('de-teuer', 'DE', 90),
    e('de-ohne', 'DE', null), e('it-billig', 'IT', 40),
  ]).map((x) => x.itemId);
  assert.deepStrictEqual(sortiert, ['it-billig', 'de-teuer', 'de-ohne', 'us-billig']);
});

// --- Tabelle ---
p('Tabelle: Kopf, Zeilenzahl, Spalte ungeprüft, Pipe im Titel maskiert', () => {
  const eintraege = [
    { itemId: '1', title: 'Si Intense | 50 ml', itemLocation: { country: 'DE' },
      price: { value: '60', currency: 'EUR' }, itemWebUrl: 'https://x/1' },
    { itemId: '2', title: 'Si Intense 100 ml', itemLocation: { country: 'FR' },
      price: { value: '80', currency: 'EUR' }, itemWebUrl: 'https://x/2' },
  ];
  const md = tab.markdown(eintraege, { 1: '2014', 2: 'ungeprueft' });
  const zeilen = md.split('\n');
  assert.strictEqual(zeilen.length, 4);                       // Kopf, Trenner, 2 Zeilen
  assert.ok(zeilen[0].includes('ungeprüft'));
  assert.ok(zeilen[2].includes('Si Intense \\| 50 ml'));       // Pipe maskiert
  assert.strictEqual(zeilen[2].trim().endsWith('|  |'), true); // Zeile 1: nicht ungeprüft
  assert.ok(zeilen[3].trim().endsWith('| ja |'));              // Zeile 2: ungeprüft
});

console.log(`\n${ok} OK, ${fehl} FEHL`);
process.exit(fehl ? 1 : 0);
