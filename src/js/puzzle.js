/* ============================================================
   Puzzle – der zweite Reiter in g'sund
   Ein Bild, in Teile zerlegt: oben der leere Rahmen, darunter die losen
   Teile. Jedes Teil lässt sich frei über den Tisch schieben und bleibt
   liegen, wo man es loslässt. Kommt es dabei nahe genug an seinen Platz
   im Rahmen, rastet es ein und liegt fest.

   Die Teile sind echte Puzzleteile: jede innere Kante bekommt eine Nase
   in die eine und dieselbe Nase als Kerbe in die andere Richtung. Beide
   Nachbarn zeichnen dieselbe Kurve, nur von ihrer Seite aus – darum
   passen sie ineinander.
   ============================================================ */

/* Eine Stufe, und die ist schwer: 24 Teile. */
const PZTEILE = 24;

function pzLeer() {
  return {
    bild: '',            /* Data-URL des Bildes */
    anzahl: PZTEILE,     /* gewünschte Teilezahl */
    spalten: 0, zeilen: 0,
    kanten: null,        /* { waag, senk } – die Nasen, damit die Form bleibt */
    bildB: 0, bildH: 0,  /* Maße des Bildes, für das Seitenverhältnis */
    alt: [],             /* drei Teile, die alt und zerkratzt aussehen */
    gelegt: [],          /* Nummern der Teile, die schon eingerastet sind */
    lose: {},            /* die übrigen: Lage auf dem Tisch, in Bruchteilen */
    sekunden: 0, begonnen: false, fertig: false, gezaehlt: false,
    geloest: 0,
    beste: 0             /* die schnellste Zeit */
  };
}

function pzNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const p = pzLeer();
  p.bild = typeof d.bild === 'string' && d.bild.startsWith('data:image') ? d.bild : '';
  p.anzahl = PZTEILE;
  p.spalten = Math.max(0, Math.round(+d.spalten || 0));
  p.zeilen = Math.max(0, Math.round(+d.zeilen || 0));
  p.bildB = Math.max(0, Math.round(+d.bildB || 0));
  p.bildH = Math.max(0, Math.round(+d.bildH || 0));
  const n = p.spalten * p.zeilen;
  if (n > 0 && d.kanten && Array.isArray(d.kanten.waag) && Array.isArray(d.kanten.senk)) {
    p.kanten = { waag: d.kanten.waag.map(z => z.map(x => (+x > 0 ? 1 : -1))),
      senk: d.kanten.senk.map(z => z.map(x => (+x > 0 ? 1 : -1))) };
  }
  const gueltig = x => Number.isInteger(x) && x >= 0 && x < n;
  p.alt = Array.isArray(d.alt) ? d.alt.map(x => +x).filter(gueltig).slice(0, 3) : [];
  /* Ein Stand von früher kennt die alten Teile noch nicht – dann werden sie
     jetzt ausgewürfelt, damit auch ein angefangenes Bild welche hat. */
  while (n > 0 && p.alt.length < 3) {
    const w = Math.floor(Math.random() * n);
    if (!p.alt.includes(w)) p.alt.push(w);
  }
  p.gelegt = Array.isArray(d.gelegt) ? d.gelegt.map(x => +x).filter(gueltig) : [];
  const lose = (d.lose && typeof d.lose === 'object') ? d.lose : {};
  for (let i = 0; i < n; i++) {
    if (p.gelegt.includes(i)) continue;
    const l = lose[i];
    /* Was keine Lage hat – oder aus einem älteren Stand kommt –, bekommt
       gleich eine: kein Teil geht durch einen halben Stand verloren. */
    p.lose[i] = (l && isFinite(+l.x) && isFinite(+l.y))
      ? { x: clamp(+l.x, 0, 1), y: clamp(+l.y, 0, 1), dreh: Math.round(+l.dreh || 0) }
      : pzLage(i, n);
  }
  p.sekunden = Math.max(0, Math.round(+d.sekunden || 0));
  p.begonnen = !!d.begonnen;
  p.gezaehlt = !!d.gezaehlt;
  p.geloest = Math.max(0, Math.round(+d.geloest || 0));
  /* Früher stand je Stufe eine Bestzeit; davon bleibt die beste übrig. */
  p.beste = +d.beste > 0 ? Math.round(+d.beste)
    : (d.beste && typeof d.beste === 'object'
      ? Math.min(...Object.values(d.beste).map(x => +x).filter(x => x > 0), Infinity) : 0);
  if (!isFinite(p.beste)) p.beste = 0;
  p.fertig = n > 0 && p.gelegt.length === n;
  return p;
}

/* Wo ein loses Teil zu liegen kommt: verteilt über den unteren Teil des
   Tisches, mit etwas Streuung, damit nichts deckungsgleich übereinander
   liegt. Die Werte sind Bruchteile der Tischfläche – so bleibt die Lage
   auch bei anderer Bildschirmgröße dieselbe. */
function pzLage(i, n) {
  const proReihe = Math.max(3, Math.ceil(Math.sqrt(n * 1.6)));
  const reihen = Math.ceil(n / proReihe);
  const s = i % proReihe, z = Math.floor(i / proReihe);
  /* Immer dieselbe Streuung für dieselbe Nummer, aber ohne Muster. Der
     Nachkommateil muss über Math.floor genommen werden – `% 1` behält bei
     negativen Zahlen das Vorzeichen. */
  const bruch = x => x - Math.floor(x);
  const streu = (k, w) => (bruch(Math.sin(k * 12.9898) * 43758.5453) - 0.5) * 2 * w;
  return {
    x: clamp(0.10 + (s + 0.5) / proReihe * 0.80 + streu(i + 1, 0.03), 0.06, 0.94),
    y: clamp(0.56 + (z + 0.5) / reihen * 0.40 + streu(i + 7, 0.025), 0.50, 0.97),
    dreh: Math.round(streu(i + 3, 8))
  };
}

/* ---------- Die Form ---------- */
/* Für jede innere Kante eine Nase, Richtung ausgewürfelt. waag[z][s] ist die
   Kante unter Teil (z,s), senk[z][s] die rechts davon. */
function pzKantenBauen(spalten, zeilen) {
  const wuerfel = () => (Math.random() < 0.5 ? -1 : 1);
  const waag = [], senk = [];
  for (let z = 0; z < zeilen; z++) {
    waag.push(Array.from({ length: spalten }, wuerfel));
    senk.push(Array.from({ length: spalten }, wuerfel));
  }
  return { waag, senk };
}

/* Eine Kante von (x0,y0) nach (x1,y1). `nase` ist 0 (gerade), sonst ±1;
   die Nase steht senkrecht zur Kante, nach links vom Laufweg aus gesehen
   bei +1. Alle Werte relativ zur Kantenlänge, damit dieselbe Kurve für
   jede Teilegröße gilt. */
function pzKante(pfad, x0, y0, x1, y1, nase, hoehe) {
  const dx = x1 - x0, dy = y1 - y0;
  /* Punkt auf der Kante bei u, dazu v quer (nach links). */
  const P = (u, v) => [
    x0 + dx * u - dy / Math.hypot(dx, dy) * v * hoehe * nase,
    y0 + dy * u + dx / Math.hypot(dx, dy) * v * hoehe * nase
  ];
  if (!nase) { pfad.lineTo(x1, y1); return; }
  const b = (c1, c2, e) => pfad.bezierCurveTo(...P(...c1), ...P(...c2), ...P(...e));
  pfad.lineTo(...P(0.36, 0));
  b([0.46, 0.00], [0.30, 0.42], [0.42, 0.46]);
  b([0.50, 0.60], [0.50, 0.60], [0.58, 0.46]);
  b([0.70, 0.42], [0.54, 0.00], [0.64, 0.00]);
  pfad.lineTo(x1, y1);
}

/* Der Umriss eines Teils, gelaufen im Uhrzeigersinn: oben, rechts, unten,
   links. Ursprung ist die linke obere Ecke der Zelle; der Rand ringsum
   (`k`) gibt den Nasen Platz. */
function pzUmriss(p, i, zelle, k) {
  const s = i % p.spalten, z = Math.floor(i / p.spalten);
  const w = zelle.b, h = zelle.h;
  const pf = new Path2D();
  const oben = z === 0 ? 0 : -p.kanten.waag[z - 1][s];
  const rechts = s === p.spalten - 1 ? 0 : p.kanten.senk[z][s];
  const unten = z === p.zeilen - 1 ? 0 : p.kanten.waag[z][s];
  const links = s === 0 ? 0 : -p.kanten.senk[z][s - 1];
  const nh = Math.min(w, h) * 0.27;
  pf.moveTo(k, k);
  pzKante(pf, k, k, k + w, k, oben, nh);
  pzKante(pf, k + w, k, k + w, k + h, rechts, nh);
  pzKante(pf, k + w, k + h, k, k + h, unten, nh);
  pzKante(pf, k, k + h, k, k, links, nh);
  pf.closePath();
  return pf;
}

/* ---------- Die Teile zeichnen ---------- */
/* Einmal gezeichnet, dann nur noch skaliert angezeigt. Der Vorrat hängt am
   Bild und an der Teilung; ändert sich eine von beiden, wird er verworfen. */
let PZVORRAT = { schluessel: '', bild: null, stuecke: [] };

function pzSchluessel(p) {
  return p.spalten + 'x' + p.zeilen + ':' + (p.alt || []).join(',')
    + ':' + p.bild.length + ':' + p.bild.slice(-24);
}

const PZ_ARBEITSKANTE = 1100;
function pzVorratBauen(p, img) {
  /* Erst auf Arbeitsgröße bringen: ein Teil braucht keine 1600 px, und
     zwei Dutzend Teile in voller Auflösung kosten unnötig Speicher. */
  const f = Math.min(1, PZ_ARBEITSKANTE / Math.max(img.naturalWidth, img.naturalHeight));
  const bw = Math.round(img.naturalWidth * f), bh = Math.round(img.naturalHeight * f);
  const gross = document.createElement('canvas');
  gross.width = bw; gross.height = bh;
  gross.getContext('2d').drawImage(img, 0, 0, bw, bh);

  const zelle = { b: bw / p.spalten, h: bh / p.zeilen };
  const k = Math.min(zelle.b, zelle.h) * 0.3;
  /* WebP kann durchsichtig und ist deutlich kleiner als PNG. */
  const art = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp')
    ? ['image/webp', 0.92] : ['image/png'];
  const stuecke = [];
  for (let i = 0; i < p.spalten * p.zeilen; i++) {
    const s = i % p.spalten, z = Math.floor(i / p.spalten);
    const c = document.createElement('canvas');
    c.width = Math.round(zelle.b + 2 * k); c.height = Math.round(zelle.h + 2 * k);
    const ctx = c.getContext('2d');
    const pf = pzUmriss(p, i, zelle, k);
    const gealtert = (p.alt || []).includes(i);
    ctx.save();
    ctx.clip(pf);
    /* Ein altes Teil ist vergilbt und flauer – das macht der Filter beim
       Zeichnen, nicht eine Schicht darüber. */
    if (gealtert) ctx.filter = 'sepia(.85) contrast(.82) brightness(.86) saturate(.55)';
    ctx.drawImage(gross, k - s * zelle.b, k - z * zelle.h);
    ctx.filter = 'none';
    if (gealtert) pzAltern(ctx, c.width, c.height, i);
    ctx.restore();
    /* Der helle Rand macht die Form auch auf dunklem Grund lesbar; ein altes
       Teil hat einen stumpfen. */
    ctx.strokeStyle = gealtert ? 'rgba(214,196,160,.72)' : 'rgba(255,255,255,.92)';
    ctx.lineWidth = Math.max(2, zelle.b * 0.018);
    ctx.lineJoin = 'round';
    ctx.stroke(pf);
    stuecke.push({ url: c.toDataURL(...art), k, zelle });
  }
  PZVORRAT = { schluessel: pzSchluessel(p), bild: img, stuecke };
  return PZVORRAT;
}

/* Kratzer, Flecken und abgegriffene Ränder. Alles hängt an der Nummer des
   Teils – dasselbe Teil sieht nach dem Neuladen wieder gleich aus. */
function pzAltern(ctx, w, h, nr) {
  let saat = (nr + 1) * 9301;
  const zuf = () => { saat = (saat * 9301 + 49297) % 233280; return saat / 233280; };

  /* Flecken: warme, weiche Schatten. */
  for (let f = 0; f < 5; f++) {
    const r = (0.08 + zuf() * 0.22) * w;
    const mx = zuf() * w, my = zuf() * h;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, r);
    g.addColorStop(0, 'rgba(120,88,44,' + (0.10 + zuf() * 0.14).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(120,88,44,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  /* Kratzer: helle Risse, dazwischen dunkle Linien. */
  ctx.lineCap = 'round';
  for (let s = 0; s < 14; s++) {
    const x0 = zuf() * w, y0 = zuf() * h;
    const laenge = (0.2 + zuf() * 0.5) * w, winkel = zuf() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(
      x0 + Math.cos(winkel) * laenge * 0.5 + (zuf() - 0.5) * 12,
      y0 + Math.sin(winkel) * laenge * 0.5 + (zuf() - 0.5) * 12,
      x0 + Math.cos(winkel) * laenge, y0 + Math.sin(winkel) * laenge);
    ctx.strokeStyle = s % 3 === 0
      ? 'rgba(48,34,18,' + (0.22 + zuf() * 0.22).toFixed(3) + ')'
      : 'rgba(255,248,232,' + (0.26 + zuf() * 0.34).toFixed(3) + ')';
    ctx.lineWidth = 0.8 + zuf() * 2.4;
    ctx.stroke();
  }
  /* Abgegriffen: zum Rand hin hellt es auf. */
  const rand = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28,
    w / 2, h / 2, Math.max(w, h) * 0.62);
  rand.addColorStop(0, 'rgba(228,210,176,0)');
  rand.addColorStop(1, 'rgba(228,210,176,.42)');
  ctx.fillStyle = rand;
  ctx.fillRect(0, 0, w, h);
}

function pzVorrat(p) {
  return PZVORRAT.schluessel === pzSchluessel(p) && PZVORRAT.stuecke.length === p.spalten * p.zeilen
    ? PZVORRAT : null;
}

/* ---------- Ein Bild besorgen ---------- */
/* Ohne eigenes Foto gibt es ein gezeichnetes: Farbverläufe und Kreise,
   damit sich die Teile auch ohne Auswahl auseinanderhalten lassen. */
function pzGrundbild() {
  const c = document.createElement('canvas');
  c.width = 900; c.height = 675;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, '#2b1a4d'); g.addColorStop(.45, '#1d3f7a'); g.addColorStop(1, '#0e6b73');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  const farben = ['#dba43f', '#e5706c', '#3fbfb2', '#9b8bf0', '#5fbf7a', '#ffffff'];
  for (let i = 0; i < 90; i++) {
    const r = 6 + Math.random() * 58;
    x.globalAlpha = 0.18 + Math.random() * 0.5;
    x.fillStyle = farben[Math.floor(Math.random() * farben.length)];
    x.beginPath();
    x.arc(Math.random() * c.width, Math.random() * c.height, r, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  return c.toDataURL('image/jpeg', 0.82);
}

function pzBildLaden(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Bild'));
    img.src = url;
  });
}

/* ---------- Neu aufteilen ---------- */
/* Aus Teilezahl und Seitenverhältnis werden Spalten und Zeilen: möglichst
   quadratische Teile, darum richtet sich die Aufteilung nach dem Bild. */
function pzTeilung(anzahl, verhaeltnis) {
  let best = null;
  for (let sp = 1; sp <= anzahl; sp++) {
    const ze = Math.round(anzahl / sp);
    if (ze < 1 || sp * ze < anzahl * 0.7 || sp * ze > anzahl * 1.4) continue;
    const teilVerhaeltnis = (verhaeltnis / sp) / (1 / ze);
    const fehler = Math.abs(Math.log(teilVerhaeltnis)) + Math.abs(sp * ze - anzahl) * 0.06;
    if (!best || fehler < best.fehler) best = { sp, ze, fehler };
  }
  return best ? { spalten: best.sp, zeilen: best.ze } : { spalten: 3, zeilen: Math.ceil(anzahl / 3) };
}

async function pzNeuLegen(p, still) {
  if (!p.bild) p.bild = pzGrundbild();
  const img = await pzBildLaden(p.bild);
  const t = pzTeilung(p.anzahl, img.naturalWidth / img.naturalHeight);
  p.spalten = t.spalten; p.zeilen = t.zeilen;
  p.bildB = img.naturalWidth; p.bildH = img.naturalHeight;
  p.kanten = pzKantenBauen(p.spalten, p.zeilen);
  /* Drei Teile bekommen ihre Jahre – jedes Mal andere. */
  const alle = Array.from({ length: p.spalten * p.zeilen }, (_, i) => i);
  p.alt = [];
  while (p.alt.length < 3 && alle.length) {
    p.alt.push(alle.splice(Math.floor(Math.random() * alle.length), 1)[0]);
  }
  p.gelegt = [];
  /* Alle Teile auf den Tisch, in gemischter Reihenfolge: so liegt nicht
     Teil 1 links oben und Teil 2 daneben. */
  const n = p.spalten * p.zeilen;
  const plaetze = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plaetze[i], plaetze[j]] = [plaetze[j], plaetze[i]];
  }
  p.lose = {};
  plaetze.forEach((teil, platz) => { p.lose[teil] = pzLage(platz, n); });
  p.sekunden = 0; p.begonnen = false; p.fertig = false; p.gezaehlt = false;
  pzVorratBauen(p, img);
  if (!still) { GStore.sichern(true); gViewMalen(); }
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

/* ---------- Die Ansicht ---------- */
function gPuzzleMalen(v) {
  const p0 = GDB.puzzle;
  if (!p0 || typeof p0 !== 'object') GDB.puzzle = pzNormalisiere(p0);
  const p = GDB.puzzle;

  /* Beim ersten Öffnen gibt es noch keine Aufteilung – dann erst zerlegen
     und danach neu malen. */
  if (!p.spalten || !p.kanten) {
    v.innerHTML = '<p class="hinweis" style="text-align:center;padding:40px 0">Wird zerlegt …</p>';
    pzNeuLegen(p);
    return;
  }
  const vorrat = pzVorrat(p);
  if (!vorrat) {
    v.innerHTML = '<p class="hinweis" style="text-align:center;padding:40px 0">Wird zerlegt …</p>';
    pzBildLaden(p.bild).then(img => { pzVorratBauen(p, img); gViewMalen(); })
      .catch(() => { p.bild = ''; pzNeuLegen(p); });
    return;
  }

  const anzahl = p.spalten * p.zeilen;
  /* Der Überstand der Nasen als Bruchteil einer Zelle: damit ist ein Teil
     etwas größer als sein Platz und beginnt etwas davor. */
  const fx = vorrat.stuecke[0].k / vorrat.stuecke[0].zelle.b;
  const fy = vorrat.stuecke[0].k / vorrat.stuecke[0].zelle.h;
  const tb = (1 + 2 * fx).toFixed(4), th = (1 + 2 * fy).toFixed(4);
  const masse = `width:calc(var(--zb) * ${tb});height:calc(var(--zh) * ${th})`;

  const liegtHtml = i => {
    const s = i % p.spalten, z = Math.floor(i / p.spalten);
    /* Die drei alten Teile bleiben anfassbar: nur sie lassen sich wieder
       herausnehmen, wenn sie einmal sitzen. */
    return `<img class="pzliegt${p.alt.includes(i) ? ' altteil' : ''}" src="${vorrat.stuecke[i].url}"
      alt="Teil ${i + 1}" data-teil="${i}" draggable="false" style="left:calc(${s} * var(--zb) - var(--zb) * ${fx.toFixed(4)});
             top:calc(${z} * var(--zh) - var(--zh) * ${fy.toFixed(4)});${masse}">`;
  };
  const losHtml = i => {
    const l = p.lose[i];
    /* draggable=false: sonst startet der Browser sein eigenes Ziehen von
       Bildern, und der Zeiger kommt bei uns nicht mehr an. */
    return `<img class="pzlose" src="${vorrat.stuecke[i].url}" alt="Teil" data-teil="${i}" draggable="false"
      style="left:${(l.x * 100).toFixed(3)}%;top:${(l.y * 100).toFixed(3)}%;
             --dreh:${l.dreh}deg;${masse}">`;
  };

  v.innerHTML = `
    <div class="pzkopf">
      <button class="btn btn-sm" data-pzbild>Bild wählen</button>
      <button class="btn btn-sm" data-pzneu>Neu mischen</button>
    </div>

    <div class="pztisch" data-tisch style="--sp:${p.spalten};--ze:${p.zeilen};--bb:${p.bildB || 4};--bh:${p.bildH || 3}">
      <div class="pzbrett${p.fertig ? ' fertig' : ''}" data-pzbrett>
        ${Array.from({ length: anzahl }, (_, i) => p.gelegt.includes(i) ? '' : `
          <span class="pzloch" data-loch="${i}"
            style="left:calc(${i % p.spalten} * var(--zb));top:calc(${Math.floor(i / p.spalten)} * var(--zh))"></span>`).join('')}
        ${p.gelegt.map(liegtHtml).join('')}
      </div>
      ${Object.keys(p.lose).map(i => losHtml(+i)).join('')}
    </div>

`;

  pzSchiebenBinden($('[data-tisch]', v), $('[data-pzbrett]', v), p, i => {
    /* Ein Teil ist eingerastet. */
    delete p.lose[i];
    p.gelegt.push(i);
    p.begonnen = true;
    if (p.gelegt.length === anzahl) {
      p.fertig = true;
      if (!p.gezaehlt) {
        p.gezaehlt = true;
        p.geloest++;
        if (!p.beste || p.sekunden < p.beste) p.beste = p.sekunden;
      }
      GStore.sichern(true);
    } else {
      gAendern();
    }
    pzStandPruefen(p);
    gViewMalen();
  });

  $('[data-pzneu]', v).onclick = () => pzNeuLegen(p);
  $('[data-pzbild]', v).onclick = () => pzBildBlatt(p);

  pzUhrAn(null);
  pzStandPruefen(p, true);
}

/* ---------- Zwei Sätze ----------
   Liegt alles bis auf ein altes Teil, fragt das Bild nach dem Warum. Liegt
   alles, sagt es, dass gerade das nicht nötig gewesen wäre. Jeder Satz
   kommt nur beim Übergang – nicht bei jedem Neuzeichnen. */
let pzZuletzt = '';
function pzStandPruefen(p, nurMerken) {
  const anzahl = p.spalten * p.zeilen;
  const fehlt = [];
  for (let i = 0; i < anzahl; i++) if (!p.gelegt.includes(i)) fehlt.push(i);
  let marke = '';
  if (!fehlt.length) marke = 'fertig';
  else if (fehlt.length === 1 && p.alt.includes(fehlt[0])) marke = 'warum';
  if (!nurMerken && marke && marke !== pzZuletzt) {
    if (marke === 'fertig') pzSpruch('A beautiful thing is never perfect', 5200);
    else pzSpruch('Why?', 3000);
  }
  pzZuletzt = marke;
}

let pzSpruchWeg = null;
function pzSpruch(text, dauer) {
  const alt = $('.pzspruch');
  if (alt) alt.remove();
  clearTimeout(pzSpruchWeg);
  const d = document.createElement('div');
  d.className = 'pzspruch';
  d.style.setProperty('--dauer', (dauer / 1000).toFixed(2) + 's');
  d.setAttribute('aria-hidden', 'true');
  d.innerHTML = '<span>' + esc(text) + '</span>';
  document.body.appendChild(d);
  pzSpruchWeg = setTimeout(() => d.remove(), dauer + 120);
}

/* ---------- Schieben ----------
   Am Zeiger statt an Berührungen: `setPointerCapture` gibt dem angefassten
   Teil den Zug bis zum Loslassen, egal was der Browser sonst vorhätte.
   1:1 am Finger, ohne Schwelle – ein Puzzleteil folgt der Hand sofort. */
function pzSchiebenBinden(tisch, brett, p, eingerastet) {
  let el = null, nr = -1, abx = 0, aby = 0, tr = null, bewegt = false;
  let randX = 0, randY = 0;

  /* Die Mitte darf so weit an den Rand, dass noch gut zwei Drittel des Teils
     auf dem Tisch liegen – sonst ließe es sich nicht mehr anfassen. */
  const lage = (e) => ({
    x: clamp((e.clientX - abx - tr.left) / tr.width, randX, 1 - randX),
    y: clamp((e.clientY - aby - tr.top) / tr.height, randY, 1 - randY)
  });

  tisch.addEventListener('pointerdown', e => {
    const t = e.target.closest('.pzlose,.pzliegt.altteil');
    if (!t || el) return;
    tr = tisch.getBoundingClientRect();
    /* Ein altes Teil, das schon im Rahmen sitzt, wird beim Anfassen wieder
       lose – an derselben Stelle, an der es liegt, damit nichts springt. */
    if (t.classList.contains('pzliegt')) herausnehmen(t, +t.dataset.teil);
    el = t; nr = +t.dataset.teil; bewegt = false;
    const r = t.getBoundingClientRect();
    abx = e.clientX - (r.left + r.width / 2);
    aby = e.clientY - (r.top + r.height / 2);
    randX = 0.3 * r.width / tr.width;
    randY = 0.3 * r.height / tr.height;
    el.setPointerCapture(e.pointerId);
    el.classList.add('zieht');
    /* Angefasst heißt obenauf: das Teil wandert ans Ende und bleibt danach
       über den anderen liegen. */
    tisch.appendChild(el);
    window.__zieht = true;
    e.preventDefault();
  });

  tisch.addEventListener('pointermove', e => {
    if (!el) return;
    bewegt = true;
    const l = lage(e);
    el.style.left = (l.x * 100).toFixed(3) + '%';
    el.style.top = (l.y * 100).toFixed(3) + '%';
  });

  const herausnehmen = (t, i) => {
    const r = t.getBoundingClientRect();
    const x = (r.left + r.width / 2 - tr.left) / tr.width;
    const y = (r.top + r.height / 2 - tr.top) / tr.height;
    p.gelegt = p.gelegt.filter(v => v !== i);
    p.lose[i] = { x, y, dreh: 0 };
    p.fertig = false;
    t.classList.remove('pzliegt', 'altteil');
    t.classList.add('pzlose');
    t.style.left = (x * 100).toFixed(3) + '%';
    t.style.top = (y * 100).toFixed(3) + '%';
    t.style.setProperty('--dreh', '0deg');
    tisch.appendChild(t);
    gAendern();
    pzStandPruefen(p);
  };

  const los = (e) => {
    if (!el) return;
    const teil = el, i = nr;
    el = null; nr = -1;
    teil.classList.remove('zieht');
    window.__zieht = false;
    if (!bewegt) return;
    const l = lage(e);
    /* Die Neigung bleibt, wie sie war: ein Teil, das sich beim Loslassen
       aufrichtet, springt unter dem Finger weg. */
    p.lose[i] = { x: l.x, y: l.y, dreh: (p.lose[i] || {}).dreh || 0 };

    /* Nah genug an seinem Platz? Gemessen wird von Mitte zu Mitte, die
       Schwelle ist ein gutes Drittel einer Zelle. */
    const br = brett.getBoundingClientRect();
    const zb = brett.clientWidth / p.spalten, zh = brett.clientHeight / p.zeilen;
    const innenL = br.left + brett.clientLeft, innenO = br.top + brett.clientTop;
    const zielX = innenL + ((i % p.spalten) + 0.5) * zb;
    const zielY = innenO + (Math.floor(i / p.spalten) + 0.5) * zh;
    const r = teil.getBoundingClientRect();
    const weg = Math.hypot((r.left + r.width / 2) - zielX, (r.top + r.height / 2) - zielY);
    if (weg <= Math.min(zb, zh) * 0.42) { eingerastet(i); return; }
    gAendern();
  };
  tisch.addEventListener('pointerup', los);
  tisch.addEventListener('pointercancel', los);
}

/* Ein eigenes Bild wählen – oder zurück zum gezeichneten. */
function pzBildBlatt(p) {
  const s = blatt('Bild fürs Puzzle', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Ein Foto vom Gerät wird auf Puzzlegröße gebracht und liegt danach in der
      Datenbasis von g&rsquo;sund. Das Puzzle wird dabei neu zerlegt.</p>
    <div class="btn-row">
      <button class="btn btn-primary" data-foto style="flex:1">Foto wählen</button>
      <button class="btn btn-ghost" data-gemalt>Gezeichnetes</button>
    </div>`, { fokus: false });
  const setzen = async (url) => {
    p.bild = url;
    layerSchliessen();
    await pzNeuLegen(p);
    toast('Neu zerlegt.');
  };
  $('[data-gemalt]', s).onclick = () => setzen(pzGrundbild());
  $('[data-foto]', s).onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return;
      try { setzen(await dateiZuBild(f)); }
      catch (e) { toast('Das Bild ließ sich nicht lesen.', 3500); }
    };
    inp.click();
  };
}
