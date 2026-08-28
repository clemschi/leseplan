/* ============================================================
   Puzzle – der zweite Reiter in g'sund
   Ein Bild, in Teile zerlegt: oben der leere Rahmen, unten die losen
   Teile. Ein Teil antippen, dann die Stelle im Rahmen antippen – sitzt
   es richtig, bleibt es liegen.

   Die Teile sind echte Puzzleteile: jede innere Kante bekommt eine Nase
   in die eine und dieselbe Nase als Kerbe in die andere Richtung. Beide
   Nachbarn zeichnen dieselbe Kurve, nur von ihrer Seite aus – darum
   passen sie ineinander.
   ============================================================ */

const PZANZAHL = [
  { id: 6, name: 'Leicht', teile: 6 },
  { id: 12, name: 'Mittel', teile: 12 },
  { id: 24, name: 'Schwer', teile: 24 }
];

function pzLeer() {
  return {
    bild: '',            /* Data-URL des Bildes */
    anzahl: 12,          /* gewünschte Teilezahl */
    spalten: 0, zeilen: 0,
    kanten: null,        /* { waag, senk } – die Nasen, damit die Form bleibt */
    gelegt: [],          /* Nummern der Teile, die schon im Rahmen liegen */
    reihe: [],           /* die losen Teile in ihrer gemischten Reihenfolge */
    hand: null,          /* Teil in der Hand */
    seite: 0,            /* welche Seite der losen Teile gezeigt wird */
    sekunden: 0, begonnen: false, fertig: false,
    geloest: 0,
    beste: {}            /* je Teilezahl die schnellste Zeit */
  };
}

function pzNormalisiere(roh) {
  const d = (roh && typeof roh === 'object') ? roh : {};
  const p = pzLeer();
  p.bild = typeof d.bild === 'string' && d.bild.startsWith('data:image') ? d.bild : '';
  p.anzahl = PZANZAHL.some(a => a.teile === +d.anzahl) ? +d.anzahl : 12;
  p.spalten = Math.max(0, Math.round(+d.spalten || 0));
  p.zeilen = Math.max(0, Math.round(+d.zeilen || 0));
  const n = p.spalten * p.zeilen;
  if (n > 0 && d.kanten && Array.isArray(d.kanten.waag) && Array.isArray(d.kanten.senk)) {
    p.kanten = { waag: d.kanten.waag.map(z => z.map(x => (+x > 0 ? 1 : -1))),
      senk: d.kanten.senk.map(z => z.map(x => (+x > 0 ? 1 : -1))) };
  }
  const gueltig = x => Number.isInteger(x) && x >= 0 && x < n;
  p.gelegt = Array.isArray(d.gelegt) ? d.gelegt.map(x => +x).filter(gueltig) : [];
  p.reihe = Array.isArray(d.reihe) ? d.reihe.map(x => +x).filter(gueltig) : [];
  /* Was weder liegt noch in der Reihe steht, kommt hinten dazu – so geht
     durch einen halben Stand kein Teil verloren. */
  for (let i = 0; i < n; i++) {
    if (!p.gelegt.includes(i) && !p.reihe.includes(i)) p.reihe.push(i);
  }
  p.reihe = p.reihe.filter(x => !p.gelegt.includes(x));
  p.hand = gueltig(+d.hand) && !p.gelegt.includes(+d.hand) ? +d.hand : null;
  p.seite = Math.max(0, Math.round(+d.seite || 0));
  p.sekunden = Math.max(0, Math.round(+d.sekunden || 0));
  p.begonnen = !!d.begonnen;
  p.geloest = Math.max(0, Math.round(+d.geloest || 0));
  if (d.beste && typeof d.beste === 'object') {
    for (const a of PZANZAHL) {
      const b = +d.beste[a.teile];
      if (b > 0) p.beste[a.teile] = Math.round(b);
    }
  }
  p.fertig = n > 0 && p.gelegt.length === n;
  return p;
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

function pzSchluessel(p) { return p.spalten + 'x' + p.zeilen + ':' + p.bild.length + ':' + p.bild.slice(-24); }

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
    ctx.save();
    ctx.clip(pf);
    ctx.drawImage(gross, k - s * zelle.b, k - z * zelle.h);
    ctx.restore();
    /* Der helle Rand macht die Form auch auf dunklem Grund lesbar. */
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = Math.max(2, zelle.b * 0.018);
    ctx.lineJoin = 'round';
    ctx.stroke(pf);
    stuecke.push({ url: c.toDataURL(...art), k, zelle });
  }
  PZVORRAT = { schluessel: pzSchluessel(p), bild: img, stuecke };
  return PZVORRAT;
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
  p.kanten = pzKantenBauen(p.spalten, p.zeilen);
  p.gelegt = [];
  p.reihe = Array.from({ length: p.spalten * p.zeilen }, (_, i) => i);
  for (let i = p.reihe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p.reihe[i], p.reihe[j]] = [p.reihe[j], p.reihe[i]];
  }
  p.hand = null; p.seite = 0;
  p.sekunden = 0; p.begonnen = false; p.fertig = false;
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
const pzZeit = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

/* ---------- Die Ansicht ---------- */
const PZ_PRO_SEITE = 6;

function gPuzzleMalen(v) {
  const p0 = GDB.puzzle;
  if (!p0 || typeof p0 !== 'object') GDB.puzzle = pzNormalisiere(p0);
  const p = GDB.puzzle;

  /* Beim ersten Öffnen gibt es noch keine Aufteilung – dann erst bauen und
     danach neu malen. */
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
  const offen = p.reihe.length;
  const seiten = Math.max(1, Math.ceil(offen / PZ_PRO_SEITE));
  p.seite = clamp(p.seite, 0, seiten - 1);
  const start = p.seite * PZ_PRO_SEITE;
  const zeigen = p.reihe.slice(start, start + PZ_PRO_SEITE);
  const best = p.beste[p.anzahl];
  /* Der Überstand der Nasen, in Prozent einer Zelle – so liegt jedes Teil
     im Rahmen genau über seiner Zelle. */
  const fx = vorrat.stuecke[0].k / vorrat.stuecke[0].zelle.b;
  const fy = vorrat.stuecke[0].k / vorrat.stuecke[0].zelle.h;

  const teilHtml = (i, klasse) => {
    const s = i % p.spalten, z = Math.floor(i / p.spalten);
    return `<img class="${klasse}" src="${vorrat.stuecke[i].url}" alt="Teil ${i + 1}" data-teil="${i}"
      style="left:calc(${s} * var(--zb) - var(--zb) * ${fx.toFixed(4)});
             top:calc(${z} * var(--zh) - var(--zh) * ${fy.toFixed(4)});
             width:calc(var(--zb) * ${(1 + 2 * fx).toFixed(4)});
             height:calc(var(--zh) * ${(1 + 2 * fy).toFixed(4)})">`;
  };

  v.innerHTML = `
    <div class="pzkopf">
      ${PZANZAHL.map(a => `<button class="chip" data-pza="${a.teile}" aria-pressed="${a.teile === p.anzahl}">${a.name}</button>`).join('')}
      <button class="btn btn-sm" data-pzbild>Bild</button>
      <button class="btn btn-sm" data-pzneu>Neu</button>
    </div>

    <div class="pzbrett${p.fertig ? ' fertig' : ''}" data-pzbrett
      style="--sp:${p.spalten};--ze:${p.zeilen};aspect-ratio:${p.spalten} / ${p.zeilen}">
      ${Array.from({ length: anzahl }, (_, i) => p.gelegt.includes(i) ? '' : `
        <button class="pzloch" data-loch="${i}"
          style="left:calc(${i % p.spalten} * var(--zb));top:calc(${Math.floor(i / p.spalten)} * var(--zh))"
          aria-label="Platz ${i + 1}"></button>`).join('')}
      ${p.gelegt.map(i => teilHtml(i, 'pzliegt')).join('')}
    </div>

    <div class="pzstand">
      <div><b>${p.gelegt.length}<span class="von">/${anzahl}</span></b><span>Teile</span></div>
      <div><b data-pzzeit>${pzZeit(p.sekunden)}</b><span>Zeit</span></div>
      <div><b>${best ? pzZeit(best) : '–'}</b><span>Bestzeit</span></div>
    </div>

    ${p.fertig ? `<p class="pzfertig"><b>Fertig.</b>
        ${anzahl} Teile in ${pzZeit(p.sekunden)}${best === p.sekunden ? ' – deine beste Zeit.' : ''}</p>`
      : `<div class="pzstreu">
        <button class="pzpfeil" data-pzlinks aria-label="Vorige Teile" ${seiten < 2 ? 'disabled' : ''}>${ICON.back}</button>
        <div class="pzhaufen" data-pzhaufen>
          ${p.hand != null ? `<img class="pzhand" src="${vorrat.stuecke[p.hand].url}" data-teil="${p.hand}" alt="Teil in der Hand">`
        : zeigen.map((i, k) => `<img class="pzlose" src="${vorrat.stuecke[i].url}" data-teil="${i}"
              style="--dreh:${((i * 47) % 40) - 20}deg" alt="Teil">`).join('')}
        </div>
        <button class="pzpfeil spiegel" data-pzrechts aria-label="Nächste Teile" ${seiten < 2 ? 'disabled' : ''}>${ICON.back}</button>
      </div>
      <p class="hinweis" style="text-align:center;padding:6px 0 30px">
        ${p.hand != null ? 'Jetzt die Stelle im Rahmen antippen. Noch einmal auf das Teil tippt es zurück.'
        : 'Ein Teil antippen, dann seinen Platz im Rahmen. Die Pfeile blättern durch die Teile.'}</p>`}
    ${p.fertig ? `<p class="hinweis" style="text-align:center;padding:10px 0 30px">
        ${p.geloest ? pl(p.geloest, 'Bild', 'Bilder') + ' fertig gelegt' : ''}</p>` : ''}`;

  const zeitMalen = () => { const t = $('[data-pzzeit]', v); if (t) t.textContent = pzZeit(p.sekunden); };

  /* Ein Teil in die Hand nehmen oder wieder zurücklegen. */
  const haufen = $('[data-pzhaufen]', v);
  if (haufen) haufen.onclick = e => {
    const el = e.target.closest('[data-teil]');
    if (!el) return;
    const i = +el.dataset.teil;
    p.hand = (p.hand === i) ? null : i;
    gAendern();
    gViewMalen();
  };

  const brett = $('[data-pzbrett]', v);
  brett.onclick = e => {
    const loch = e.target.closest('[data-loch]');
    if (!loch || p.hand == null) return;
    const ziel = +loch.dataset.loch;
    if (ziel !== p.hand) {
      loch.classList.remove('daneben');
      void loch.offsetWidth;
      loch.classList.add('daneben');
      return;
    }
    p.gelegt.push(p.hand);
    p.reihe = p.reihe.filter(x => x !== p.hand);
    p.hand = null;
    p.begonnen = true;
    if (p.gelegt.length === anzahl) {
      p.fertig = true;
      p.geloest++;
      const alt = p.beste[p.anzahl];
      if (!alt || p.sekunden < alt) p.beste[p.anzahl] = p.sekunden;
      GStore.sichern(true);
    } else {
      gAendern();
    }
    gViewMalen();
  };

  const blaettern = d => { p.seite = (p.seite + d + seiten) % seiten; gViewMalen(); };
  const links = $('[data-pzlinks]', v), rechts = $('[data-pzrechts]', v);
  if (links) links.onclick = () => blaettern(-1);
  if (rechts) rechts.onclick = () => blaettern(1);

  $$('[data-pza]', v).forEach(b => b.onclick = () => {
    const a = +b.dataset.pza;
    if (a === p.anzahl) return;
    p.anzahl = a;
    pzNeuLegen(p);
  });
  $('[data-pzneu]', v).onclick = () => pzNeuLegen(p);
  $('[data-pzbild]', v).onclick = () => pzBildBlatt(p);

  pzUhrAn(zeitMalen);
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
