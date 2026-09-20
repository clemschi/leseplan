/* ============================================================
   Tresor – Daten mit einem Passwort verschliessen
   Nicht an eine App gebunden: was hier liegt, schliesst jeden Wert
   weg und holt ihn wieder heraus. Wer die Seite hat, hat nur den
   Geheimtext; ohne Passwort ist daraus nichts zu machen. Und jeder
   macht seinen eigenen Tresor mit seinem eigenen Passwort – es gibt
   keinen Schlüssel, der alle aufsperrt, und keinen im Code.

   AES-GCM mit 256 Bit, der Schlüssel kommt über PBKDF2-SHA-256 aus
   dem Passwort. Salz und Zufallszahl liegen offen im Tresor – so
   gehört sich das, geheim ist allein das Passwort.

   Die Rundenzahl steht im Tresor selbst: wird sie später höher,
   gehen alte Tresore weiterhin auf.
   ============================================================ */
const TRESOR_RUNDEN = 250000;

/* Web Crypto verlangt eine sichere Herkunft. https zählt, der eigene
   Rechner auch – und eine Datei auf dem Gerät ebenfalls. */
function tresorGeht() {
  return !!(window.crypto && window.crypto.subtle && window.isSecureContext);
}

const tresorZuB64 = (puffer) => {
  const b = new Uint8Array(puffer);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
};
const tresorAusB64 = (text) => Uint8Array.from(atob(text), c => c.charCodeAt(0));

async function tresorSchluessel(passwort, salz, runden, zweck) {
  const roh = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passwort), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salz, iterations: runden, hash: 'SHA-256' },
    roh, { name: 'AES-GCM', length: 256 }, false, [zweck]);
}

/* Einen beliebigen Wert wegschliessen. Heraus kommt etwas, das sich
   als JSON weitergeben lässt. */
async function tresorSchliessen(wert, passwort) {
  const salz = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await tresorSchluessel(passwort, salz, TRESOR_RUNDEN, 'encrypt');
  const geheim = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(JSON.stringify(wert)));
  return {
    v: 1, runden: TRESOR_RUNDEN,
    salz: tresorZuB64(salz), iv: tresorZuB64(iv), text: tresorZuB64(geheim)
  };
}

/* Und wieder auf. Bei falschem Passwort wirft AES-GCM – das ist die
   Prüfung, eine eigene braucht es nicht. */
async function tresorOeffnen(tresor, passwort) {
  if (!tresorIstTresor(tresor)) throw new Error('Kein Tresor');
  const salz = tresorAusB64(tresor.salz);
  const iv = tresorAusB64(tresor.iv);
  const runden = clamp(Math.round(+tresor.runden || TRESOR_RUNDEN), 1000, 5000000);
  const k = await tresorSchluessel(passwort, salz, runden, 'decrypt');
  let klar;
  try {
    klar = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv }, k, tresorAusB64(tresor.text));
  } catch (e) {
    throw new Error('Passwort stimmt nicht');
  }
  return JSON.parse(new TextDecoder().decode(klar));
}

function tresorIstTresor(t) {
  return !!(t && typeof t === 'object' && t.salz && t.iv && t.text);
}
/* Beim Einlesen aus einer Datei: nur die vier Felder, Längen gedeckelt. */
function tresorPruefen(roh) {
  if (!tresorIstTresor(roh)) return null;
  const txt = (x, n) => String(x || '').replace(/[^A-Za-z0-9+/=]/g, '').slice(0, n);
  const t = {
    v: 1, runden: clamp(Math.round(+roh.runden || TRESOR_RUNDEN), 1000, 5000000),
    salz: txt(roh.salz, 64), iv: txt(roh.iv, 64), text: txt(roh.text, 4000000)
  };
  return (t.salz && t.iv && t.text) ? t : null;
}

/* ---------- Das Blatt, das nach dem Passwort fragt ----------
   Einmal zum Aufsperren, zweimal zum Zusperren – wer sich vertippt,
   sperrt sich sonst selbst aus. */
function tresorPasswortFragen(titel, hinweis, zweimal) {
  return new Promise(res => {
    let fertig = false;
    const s = blatt(titel, `
      <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">${esc(hinweis)}</p>
      <label class="field"><span>Passwort</span>
        <input type="password" data-tp1 autocomplete="new-password"></label>
      ${zweimal ? `<label class="field" style="margin-top:8px"><span>Noch einmal</span>
        <input type="password" data-tp2 autocomplete="new-password"></label>` : ''}
      <p class="muted" data-tfehler style="font-size:12px;color:var(--warn,#c0392b);min-height:16px;margin:8px 0 0"></p>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-primary" data-tok style="flex:1">${zweimal ? 'Verschliessen' : 'Aufsperren'}</button>
        <button class="btn btn-ghost" data-tno style="flex:1">Abbrechen</button>
      </div>`, { fokus: true, onClose: () => { if (!fertig) res(null); } });

    const fehlerZeigen = (t) => { $('[data-tfehler]', s).textContent = t; };
    const pruefen = () => {
      const a = $('[data-tp1]', s).value;
      if (a.length < 6) { fehlerZeigen('Mindestens 6 Zeichen.'); return null; }
      if (zweimal && a !== $('[data-tp2]', s).value) {
        fehlerZeigen('Die beiden stimmen nicht überein.'); return null;
      }
      return a;
    };
    $('[data-tok]', s).onclick = () => {
      const a = pruefen();
      if (a == null) return;
      fertig = true; res(a); layerSchliessen();
    };
    $('[data-tno]', s).onclick = () => { fertig = true; res(null); layerSchliessen(); };
    $$('input', s).forEach(i => {
      i.onkeydown = e => { if (e.key === 'Enter') $('[data-tok]', s).click(); };
    });
  });
}
