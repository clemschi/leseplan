/* Kleines Geruest fuer die Proben: OK/FEHL und ein Zaehlstand am Ende. */

export function macheProbe(titel) {
  let gut = 0;
  let schlecht = 0;
  console.log('\n== ' + titel + ' ==');

  const melden = (name, ok, dazu = '') => {
    if (ok) { gut++; console.log('  OK   ' + name); }
    else { schlecht++; console.log('  FEHL ' + name + (dazu ? ' - ' + dazu : '')); }
  };

  return {
    ist(name, wert, soll) {
      const ok = JSON.stringify(wert) === JSON.stringify(soll);
      melden(name, ok, ok ? '' : 'ist ' + JSON.stringify(wert) + ', soll ' + JSON.stringify(soll));
    },
    wahr(name, wert, dazu = '') { melden(name, !!wert, dazu); },
    enthaelt(name, text, teil) {
      const ok = String(text).includes(teil);
      melden(name, ok, ok ? '' : 'in ' + JSON.stringify(String(text).slice(0, 120)) + ' fehlt ' + JSON.stringify(teil));
    },
    async wirft(name, fn, teil = '') {
      try { await fn(); melden(name, false, 'kein Fehler geworfen'); }
      catch (e) { melden(name, !teil || String(e.message).includes(teil), String(e.message)); }
    },
    ende() {
      console.log('  ' + gut + ' gut, ' + schlecht + ' schlecht');
      return { gut, schlecht };
    }
  };
}

/** Wartet, bis eine Bedingung stimmt - oder gibt nach Frist auf. */
export async function bis(bedingung, frist = 3000, takt = 20) {
  const ende = Date.now() + frist;
  while (Date.now() < ende) {
    if (await bedingung()) return true;
    await new Promise(r => setTimeout(r, takt));
  }
  return false;
}
