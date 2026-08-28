/* ============================================================
   Puzzle – der zweite Reiter in g'sund
   Ein Schiebefeld: die Zahlen der Reihe nach, ein Feld bleibt leer.
   Angetippt wird ein Stein in der Reihe oder Spalte der Lücke; alles
   dazwischen rutscht einen Platz weiter.
   ============================================================ */

const PZGROESSEN = [3, 4, 5];

function pzLeer() {
  return {
    groesse: 4,
    felder: [],        /* Länge n*n; 0 ist die Lücke */
    zuege: 0,
    sekunden: 0,
    begonnen: false,   /* erst nach dem ersten Zug läuft die Uhr */
    fertig: false,
    beste: {},         /* je Größe: { zuege, sekunden } */
    geloest: 0
  };
}

function pzNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const p = pzLeer();
  p.groesse = PZGROESSEN.includes(+d.groesse) ? +d.groesse : 4;
  const n = p.groesse;
  /* Nur ein Feld übernehmen, das wirklich eines ist: jede Zahl genau einmal. */
  if (Array.isArray(d.felder) && d.felder.length === n * n) {
    const gesehen = new Set(d.felder.map(x => +x));
    if (gesehen.size === n * n && [...gesehen].every(x => x >= 0 && x < n * n)) {
      p.felder = d.felder.map(x => +x);
    }
  }
  p.zuege = Math.max(0, Math.round(+d.zuege || 0));
  p.sekunden = Math.max(0, Math.round(+d.sekunden || 0));
  p.begonnen = !!d.begonnen;
  p.geloest = Math.max(0, Math.round(+d.geloest || 0));
  if (d.beste && typeof d.beste === 'object') {
    for (const g of PZGROESSEN) {
      const b = d.beste[g];
      if (b && +b.zuege > 0 && +b.sekunden >= 0) {
        p.beste[g] = { zuege: Math.round(+b.zuege), sekunden: Math.round(+b.sekunden) };
      }
    }
  }
  if (!p.felder.length) p.felder = pzMischen(n);
  p.fertig = pzSitzt(p.felder);
  return p;
}

/* ---------- Das Feld ---------- */
const pzZiel = n => Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
const pzSitzt = f => f.every((x, i) => x === (i + 1) % f.length);

/* Gemischt wird nicht durch Auswürfeln, sondern durch viele erlaubte Züge vom
   fertigen Feld aus. Nur so ist das Ergebnis mit Sicherheit lösbar – die Hälfte
   aller ausgewürfelten Felder wäre es nicht. */
function pzMischen(n) {
  const f = pzZiel(n);
  let luecke = f.indexOf(0);
  const zuege = n * n * 24;
  let letzte = -1;
  for (let i = 0; i < zuege; i++) {
    const nachbarn = pzNachbarn(luecke, n).filter(x => x !== letzte);
    const ziel = nachbarn[Math.floor(Math.random() * nachbarn.length)];
    f[luecke] = f[ziel]; f[ziel] = 0;
    letzte = luecke; luecke = ziel;
  }
  /* Ein Feld, das schon fast fertig dasteht, taugt nicht als Aufgabe. */
  const daneben = f.filter((x, i) => x !== (i + 1) % f.length).length;
  return daneben < f.length * 0.6 ? pzMischen(n) : f;
}

function pzNachbarn(i, n) {
  const z = Math.floor(i / n), s = i % n, aus = [];
  if (z > 0) aus.push(i - n);
  if (z < n - 1) aus.push(i + n);
  if (s > 0) aus.push(i - 1);
  if (s < n - 1) aus.push(i + 1);
  return aus;
}

/* Ein Tipp schiebt alles zwischen Stein und Lücke einen Platz weiter.
   Gibt zurück, wie viele Steine gewandert sind – 0, wenn der Tipp nicht zählt. */
function pzSchieben(p, i) {
  const n = p.groesse, f = p.felder, l = f.indexOf(0);
  const zi = Math.floor(i / n), si = i % n, zl = Math.floor(l / n), sl = l % n;
  if (i === l) return 0;
  if (zi !== zl && si !== sl) return 0;
  let anzahl = 0;
  if (zi === zl) {
    const schritt = si < sl ? -1 : 1;
    for (let s = sl; s !== si; s += schritt) {
      f[zl * n + s] = f[zl * n + s + schritt];
      anzahl++;
    }
  } else {
    const schritt = zi < zl ? -1 : 1;
    for (let z = zl; z !== zi; z += schritt) {
      f[z * n + sl] = f[(z + schritt) * n + sl];
      anzahl++;
    }
  }
  f[i] = 0;
  return anzahl;
}

/* ---------- Die Uhr ---------- */
let pzTakt = null;
function pzUhrAn(malen) {
  clearInterval(pzTakt);
  pzTakt = setInterval(() => {
    const p = GDB.puzzle;
    if (!p || !p.begonnen || p.fertig || gTab !== 'puzzle') return;
    p.sekunden++;
    if (malen) malen();
  }, 1000);
}
function pzUhrAus() { clearInterval(pzTakt); pzTakt = null; }
const pzZeit = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

/* ---------- Die Ansicht ---------- */
function gPuzzleMalen(v) {
  /* Geprüft wird beim Laden der Datenbasis, nicht bei jedem Malen: sonst
     entstünde bei jedem Bild ein neues Objekt, und wer sich eines gemerkt
     hat, schriebe ins Leere. */
  const p0 = GDB.puzzle;
  if (!p0 || !Array.isArray(p0.felder) || p0.felder.length < 9) GDB.puzzle = pzNormalisiere(p0);
  const p = GDB.puzzle;
  const n = p.groesse;
  const best = p.beste[n];

  v.innerHTML = `
    <div class="pzrahmen">
      <div class="pzkopf">
        ${PZGROESSEN.map(g => `<button class="chip" data-pzg="${g}" aria-pressed="${g === n}">${g}×${g}</button>`).join('')}
        <button class="btn btn-sm" data-pzneu>Neu mischen</button>
      </div>

      <div class="pzfeld${p.fertig ? ' fertig' : ''}" style="--n:${n}" data-pzfeld>
        ${p.felder.map((wert, i) => wert === 0 ? '' : `
          <button class="pzstein${wert === (i + 1) % (n * n) ? ' sitzt' : ''}"
            data-pz="${i}" style="--x:${i % n};--y:${Math.floor(i / n)}"
            aria-label="Stein ${wert}"><i>${wert}</i></button>`).join('')}
      </div>

      <div class="pzstand">
        <div><b data-pzzuege>${p.zuege}</b><span>Züge</span></div>
        <div><b data-pzzeit>${pzZeit(p.sekunden)}</b><span>Zeit</span></div>
        <div><b>${best ? best.zuege : '–'}</b><span>Bestes ${n}×${n}</span></div>
      </div>

      ${p.fertig ? `<p class="pzfertig"><b>Gelöst.</b>
        ${p.zuege} Züge in ${pzZeit(p.sekunden)}${best && best.zuege === p.zuege ? ' – das ist dein bestes.' : ''}</p>`
      : `<p class="hinweis" style="text-align:center;padding:14px 0 0">
        Tippe einen Stein in der Reihe oder Spalte der Lücke – alles dazwischen rutscht mit.</p>`}

      <p class="hinweis" style="text-align:center;padding:10px 0 30px">
        ${p.geloest ? pl(p.geloest, 'Puzzle', 'Puzzle') + ' gelöst' : 'Noch keins gelöst'}</p>
    </div>`;

  const feld = $('[data-pzfeld]', v);

  /* Nur die beiden Zahlen nachziehen, nicht die ganze Ansicht – sonst
     springen die Steine, statt zu rutschen. */
  const standMalen = () => {
    const z = $('[data-pzzuege]', v), t = $('[data-pzzeit]', v);
    if (z) z.textContent = p.zuege;
    if (t) t.textContent = pzZeit(p.sekunden);
  };

  const steineSetzen = () => {
    $$('.pzstein', feld).forEach(st => {
      const wert = +$('i', st).textContent;
      const i = p.felder.indexOf(wert);
      st.dataset.pz = i;
      st.style.setProperty('--x', i % n);
      st.style.setProperty('--y', Math.floor(i / n));
      st.classList.toggle('sitzt', wert === (i + 1) % (n * n));
    });
  };

  feld.onclick = e => {
    const st = e.target.closest('[data-pz]');
    if (!st || p.fertig) return;
    const gewandert = pzSchieben(p, +st.dataset.pz);
    if (!gewandert) return;
    p.zuege += gewandert;
    p.begonnen = true;
    steineSetzen();
    standMalen();
    if (pzSitzt(p.felder)) {
      p.fertig = true;
      p.geloest++;
      const alt = p.beste[n];
      const besser = !alt || p.zuege < alt.zuege
        || (p.zuege === alt.zuege && p.sekunden < alt.sekunden);
      if (besser) p.beste[n] = { zuege: p.zuege, sekunden: p.sekunden };
      GStore.sichern(true);
      /* Erst das letzte Rutschen zu Ende laufen lassen, dann das Ergebnis. */
      setTimeout(() => { gViewMalen(); toast(besser ? 'Gelöst – dein bestes Ergebnis.' : 'Gelöst.'); }, 220);
      return;
    }
    gAendern();
  };

  $$('[data-pzg]', v).forEach(b => b.onclick = () => {
    const g = +b.dataset.pzg;
    if (g === p.groesse) return;
    gAendern(() => {
      p.groesse = g;
      p.felder = pzMischen(g);
      p.zuege = 0; p.sekunden = 0; p.begonnen = false; p.fertig = false;
    });
    gViewMalen();
  });

  $('[data-pzneu]', v).onclick = () => {
    gAendern(() => {
      p.felder = pzMischen(p.groesse);
      p.zuege = 0; p.sekunden = 0; p.begonnen = false; p.fertig = false;
    });
    gViewMalen();
  };

  pzUhrAn(standMalen);
}
