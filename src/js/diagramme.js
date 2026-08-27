/* ============================================================
   Diagramme
   ============================================================ */
let tipEl = null;
function tipZeigen(e, titel, wert) {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.appendChild(tipEl); }
  tipEl.innerHTML = `<div class="tt">${esc(titel)}</div><div class="tv">${esc(wert)}</div>`;
  tipEl.hidden = false;
  const r = tipEl.getBoundingClientRect();
  const x = clamp((e.clientX || 0) - r.width / 2, 8, window.innerWidth - r.width - 8);
  const y = Math.max(8, (e.clientY || 0) - r.height - 14);
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
function tipWeg() { if (tipEl) tipEl.hidden = true; }
document.addEventListener('scroll', tipWeg, true);

function karte(titel, cap, inhaltHtml, legende, tabelle) {
  const d = document.createElement('div');
  d.className = 'chart';
  d.innerHTML = `
    <div class="chart-head"><h3>${esc(titel)}</h3>${cap ? `<div class="cap">${cap}</div>` : ''}</div>
    ${inhaltHtml}
    ${legende ? `<div class="legend">${legende}</div>` : ''}
    ${tabelle ? `<details><summary>Als Tabelle</summary><div class="chart-scroll">${tabelle}</div></details>` : ''}`;
  d.addEventListener('pointerover', e => {
    const el = e.target.closest('[data-tip]');
    if (el) tipZeigen(e, el.dataset.tipT || '', el.dataset.tip);
  });
  d.addEventListener('pointermove', e => {
    const el = e.target.closest('[data-tip]');
    if (el) tipZeigen(e, el.dataset.tipT || '', el.dataset.tip); else tipWeg();
  });
  d.addEventListener('pointerleave', tipWeg);
  return d;
}

/* Waagerechte Balken, notfalls gestapelt. */
function balken(items, opts) {
  opts = opts || {};
  const max = Math.max(1, ...items.map(i => i.segmente ? i.segmente.reduce((s, x) => s + x.wert, 0) : i.wert));
  return `<div class="bars">` + items.map(i => {
    const segs = i.segmente || [{ wert: i.wert, farbe: i.farbe || 'var(--s1)', name: i.label }];
    return `<div class="barrow">
      <div class="blab" title="${esc(i.label)}">${esc(i.label)}</div>
      <div class="btrack">
        ${segs.filter(s => s.wert > 0).map(s => `<div class="bseg" style="width:${s.wert / max * 100}%;background:${s.farbe}"
            data-tip="${esc(s.name || i.label)}: ${esc(opts.fmt ? opts.fmt(s.wert) : fmtZahl(s.wert))}" data-tip-t="${esc(i.label)}"></div>`).join('')}
      </div>
      <div class="bval">${i.anzeige != null ? esc(i.anzeige) : esc(opts.fmt ? opts.fmt(i.wert) : fmtZahl(i.wert))}</div>
    </div>`;
  }).join('') + `</div>`;
}
function tabelleHtml(kopf, zeilen) {
  return `<table><thead><tr>${kopf.map((k, i) => `<th${i ? ' class="n"' : ''}>${esc(k)}</th>`).join('')}</tr></thead><tbody>`
    + zeilen.map(z => `<tr>${z.map((c, i) => `<td${i ? ' class="n"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')
    + `</tbody></table>`;
}

/* Senkrechte Balken über die Zeit (SVG). */
function zeitBalken(punkte, fmt) {
  const W = 320, H = 120, padL = 4, padB = 20;
  const max = Math.max(1, ...punkte.map(p => p.wert));
  const bw = (W - padL) / Math.max(1, punkte.length);
  const breite = Math.min(bw * 0.68, 26);
  const bars = punkte.map((p, i) => {
    const h = p.wert / max * (H - padB - 6);
    const x = padL + i * bw + (bw - breite) / 2, y = H - padB - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${breite.toFixed(1)}" height="${Math.max(h, p.wert ? 2 : 0).toFixed(1)}" rx="3" fill="var(--s1)"
      data-tip="${esc(fmt(p.wert))}" data-tip-t="${esc(p.label)}"></rect>`;
  }).join('');
  const schritte = Math.ceil(punkte.length / 6);
  const achse = punkte.map((p, i) => (i % schritte === 0 || i === punkte.length - 1)
    ? `<text x="${padL + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--text-3)">${esc(p.kurz)}</text>` : '').join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img">
    <line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="var(--grid)" stroke-width="1"/>
    <line x1="0" y1="${(H - padB) / 2}" x2="${W}" y2="${(H - padB) / 2}" stroke="var(--grid)" stroke-width="1" stroke-dasharray="2 3"/>
    ${bars}${achse}
    <text x="2" y="10" font-size="9" fill="var(--text-3)">${esc(fmt(max))}</text>
  </svg>`;
}

/* Kumulierte Linie mit Fläche (SVG). */
function linie(punkte, fmt) {
  const W = 320, H = 120, padB = 20;
  const max = Math.max(1, ...punkte.map(p => p.wert));
  const x = i => punkte.length > 1 ? i / (punkte.length - 1) * (W - 8) + 4 : W / 2;
  const y = v => H - padB - (v / max) * (H - padB - 8);
  const d = punkte.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.wert).toFixed(1)).join(' ');
  const flaeche = d + ` L ${x(punkte.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`;
  const letzter = punkte[punkte.length - 1];
  const schritte = Math.ceil(punkte.length / 6);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img">
    <line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="var(--grid)" stroke-width="1"/>
    <path d="${flaeche}" fill="var(--s3)" opacity=".13"/>
    <path d="${d}" fill="none" stroke="var(--s3)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${punkte.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.wert).toFixed(1)}" r="${i === punkte.length - 1 ? 4 : 3.2}"
        fill="${i === punkte.length - 1 ? 'var(--s3)' : 'var(--chart-surface)'}" stroke="var(--s3)" stroke-width="2"
        data-tip="${esc(fmt(p.wert))}" data-tip-t="${esc(p.label)}"/>`).join('')}
    <text x="${x(punkte.length - 1) - 4}" y="${Math.max(12, y(letzter.wert) - 9)}" text-anchor="end" font-size="10" fill="var(--text-2)" font-family="IBM Plex Mono, monospace">${esc(fmt(letzter.wert))}</text>
    ${punkte.map((p, i) => (i % schritte === 0 || i === punkte.length - 1)
      ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--text-3)">${esc(p.kurz)}</text>` : '').join('')}
  </svg>`;
}

function monatsListe(von, bis) {
  const out = [];
  const d = new Date(von.getFullYear(), von.getMonth(), 1);
  const ende = new Date(bis.getFullYear(), bis.getMonth(), 1);
  while (d <= ende && out.length < 72) {
    out.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: MONATE[d.getMonth()] + ' ' + d.getFullYear(), kurz: MONATE[d.getMonth()] });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

let uebersichtAllePlaene = false;
let uebersichtUnter = 'zahlen';

/* ===== Vorhang: eine Ebene am Finger auf- und zuziehen =====
   Vorbild ist der Kartenstapel beim Stöbern: die Fläche folgt der Hand 1:1,
   eine kurze Schwelle oder ein Schwung entscheidet beim Loslassen. Statt zu
   verschieben wird hier von oben aufgedeckt – die Kante liegt unter der
   Fingerkuppe, der Inhalt bleibt an seinem Platz. */
function vorhangSchwelle(hoehe) { return Math.max(96, (hoehe || 640) * 0.14); }

/* Während eine Ebene am Finger hängt, wird der Grund dahinter unscharf –
   ansteigend mit dem Weg, damit man sieht, wie weit man ist. */
let unschaerfeEl = null;
function unschaerfeSetzen(f, weich) {
  const a = clamp(f, 0, 1);
  if (a <= 0.001) {
    if (!unschaerfeEl) return;
    const el = unschaerfeEl;
    unschaerfeEl = null;
    el.style.transition = weich ? 'backdrop-filter .2s ease,-webkit-backdrop-filter .2s ease,opacity .2s ease' : '';
    el.style.backdropFilter = 'blur(0px)';
    el.style.webkitBackdropFilter = 'blur(0px)';
    el.style.opacity = '0';
    setTimeout(() => { if (el.isConnected) el.remove(); }, weich ? 220 : 0);
    return;
  }
  if (!unschaerfeEl) {
    unschaerfeEl = document.createElement('div');
    unschaerfeEl.className = 'unschaerfe';
    document.body.appendChild(unschaerfeEl);
  }
  const px = (a * 9).toFixed(2) + 'px';
  unschaerfeEl.style.transition = weich ? 'backdrop-filter .22s ease,-webkit-backdrop-filter .22s ease' : 'none';
  unschaerfeEl.style.backdropFilter = 'blur(' + px + ')';
  unschaerfeEl.style.webkitBackdropFilter = 'blur(' + px + ')';
  unschaerfeEl.style.opacity = '1';
}
function unschaerfeWeg() { unschaerfeSetzen(0, true); }

function vorhangSetzen(el, y) {
  const h = el.clientHeight || window.innerHeight || 640;
  const k = clamp(y, 0, h);
  const f = k / h;
  el.style.transition = 'none';
  /* Undurchsichtig wie ein Tuch – nur die Kante wirft einen Schatten auf das,
     was noch darunter liegt. */
  el.style.clipPath = 'inset(0px 0px ' + (h - k).toFixed(1) + 'px 0px)';
  el.style.transform = 'translateY(' + (-(1 - f) * 6).toFixed(1) + 'px)';
  el.style.filter = 'drop-shadow(0 7px 16px rgba(0,0,0,.42))';
  el.style.opacity = '1';
  unschaerfeSetzen(f);
  return h;
}

function vorhangLoesen(el, auf, fertig) {
  const h = el.clientHeight || window.innerHeight || 640;
  el.style.transition = 'clip-path .26s cubic-bezier(.2,.8,.3,1),'
    + 'transform .26s cubic-bezier(.2,.8,.3,1),opacity .2s ease';
  el.style.clipPath = auf ? 'inset(0px 0px 0px 0px)' : 'inset(0px 0px ' + h + 'px 0px)';
  el.style.transform = auf ? 'translateY(0px)' : 'translateY(-6px)';
  unschaerfeSetzen(auf ? 1 : 0, true);
  setTimeout(() => {
    if (auf && el.isConnected) {
      el.style.transition = ''; el.style.clipPath = '';
      el.style.transform = ''; el.style.opacity = ''; el.style.filter = '';
      el.classList.remove('zieht');
    }
    /* Liegt die Ebene ganz oben, verdeckt sie den Grund ohnehin. */
    unschaerfeWeg();
    if (fertig) fertig();
  }, auf ? 280 : 240);
}

/* Zurückschieben von unten nach oben. Damit das Blättern in der Liste heil
   bleibt, beginnt der Zug an der Kopfzeile oder dort, wo nichts mehr zu
   scrollen ist. */
/* Eine Ebene vom linken Rand nach rechts wegziehen – wie das Zurückwischen
   auf dem Telefon. Sie folgt 1:1, der Grund dahinter wird dabei wieder scharf.
   Der Zug beginnt bewusst am Rand: mitten auf der Fläche blättern Karten,
   Seiten und Bahnen. */
function ebeneZiehen(node) {
  let x0 = null, y0 = 0, zieht = false, ab = 0, breite = 1, weg = 0;
  let letztX = 0, letztT = 0, tempo = 0;

  const setzen = (x) => {
    node.style.transition = 'none';
    node.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    node.style.willChange = 'transform';
    unschaerfeSetzen(1 - clamp(x / breite, 0, 1));
  };

  node.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || window.__zieht) { x0 = null; return; }
    const t = e.touches[0];
    /* Nur vom linken Rand aus. */
    if (t.clientX > 30) { x0 = null; return; }
    x0 = t.clientX; y0 = t.clientY;
    zieht = false; weg = 0;
    breite = node.getBoundingClientRect().width || window.innerWidth || 360;
    letztX = x0; letztT = Date.now(); tempo = 0;
  }, { passive: true });

  node.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const t = e.touches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
    if (!zieht) {
      if (dx < -8 || (dy > 16 && dy > Math.abs(dx))) { x0 = null; return; }
      if (dx < 12) return;
      zieht = true; ab = dx; window.__zieht = true;
      unschaerfeSetzen(1);
    }
    e.preventDefault();
    const jetzt = Date.now();
    if (jetzt > letztT) { tempo = (t.clientX - letztX) / (jetzt - letztT); letztX = t.clientX; letztT = jetzt; }
    weg = Math.max(0, dx - ab);
    setzen(weg);
  }, { passive: false });

  const los = () => {
    if (x0 == null) return;
    x0 = null;
    if (!zieht) return;
    zieht = false;
    const zu = weg > Math.max(80, breite * 0.26) || tempo > 0.45;
    node.style.transition = 'transform .26s cubic-bezier(.2,.8,.3,1)';
    if (zu) {
      node.style.transform = 'translateX(' + Math.ceil(breite) + 'px)';
      unschaerfeSetzen(0, true);
      setTimeout(() => { window.__zieht = false; layerSchliessen(); }, 200);
    } else {
      node.style.transform = 'translateX(0)';
      unschaerfeSetzen(1, true);
      setTimeout(() => {
        window.__zieht = false;
        node.style.transition = ''; node.style.transform = ''; node.style.willChange = '';
        unschaerfeWeg();
      }, 270);
    }
  };
  node.addEventListener('touchend', los, { passive: true });
  node.addEventListener('touchcancel', los, { passive: true });
}

function vorhangHochBinden(node, koerper) {
  let y0 = null, x0 = 0, zieht = false, ab = 0, hoehe = 1, zu = false;
  let letztY = 0, letztT = 0, tempo = 0;

  const darf = (ziel) => {
    if (ziel && ziel.closest && ziel.closest('.ovl-head')) return true;
    if (!koerper) return true;
    const rest = koerper.scrollHeight - koerper.clientHeight;
    return rest <= 4 || koerper.scrollTop >= rest - 4;
  };
  const fertig = () => { window.__zieht = false; y0 = null; zieht = false; };

  node.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || window.__zieht || !darf(e.target)) { y0 = null; return; }
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
    zieht = false; zu = false;
    hoehe = node.clientHeight || window.innerHeight || 640;
    letztY = y0; letztT = Date.now(); tempo = 0;
  }, { passive: true });

  node.addEventListener('touchmove', e => {
    if (y0 == null) return;
    const t = e.touches[0], dy = t.clientY - y0, dx = Math.abs(t.clientX - x0);
    if (!zieht) {
      if (dy > 6 || (dx > 14 && dx > Math.abs(dy))) { y0 = null; return; }
      if (dy > -10) return;
      zieht = true; ab = dy; window.__zieht = true;
      node.classList.add('zieht');
    }
    e.preventDefault();
    const jetzt = Date.now();
    if (jetzt > letztT) {
      tempo = (t.clientY - letztY) / (jetzt - letztT);
      letztY = t.clientY; letztT = jetzt;
    }
    const y = hoehe + (dy - ab);
    zu = (hoehe - y) > vorhangSchwelle(hoehe) || tempo < -0.45;
    vorhangSetzen(node, y);
  }, { passive: false });

  const los = () => {
    if (y0 == null) return;
    if (!zieht) { fertig(); return; }
    const schliessen = zu;
    vorhangLoesen(node, !schliessen, () => { if (schliessen) layerSchliessen(); });
    fertig();
  };
  node.addEventListener('touchend', los, { passive: true });
  node.addEventListener('touchcancel', los, { passive: true });
}

/* Die Übersicht liegt nicht mehr in der Tableiste, sondern hinter dem
   Fortschritt im Kopf – antippen oder von dort nach unten ziehen. */
function uebersichtOeffnen(gezogen) {
  if (ueOffen) return null;
  const node = document.createElement('div');
  node.className = 'overlay' + (gezogen ? ' zieht' : '');
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Übersicht</div>
        <div class="ovl-sub" data-sub></div></div>
    </div>
    <div class="ovl-body shell" style="padding:12px 0 40px" data-body></div>`;
  const body = $('[data-body]', node);
  const malen = () => {
    const bs = buecherAktiv();
    const gel = bs.filter(b => b.status === 'gelesen').length;
    $('[data-sub]', node).textContent = (aktiverPlan() ? aktiverPlan().name + ' · ' : '')
      + gel + ' von ' + pl(bs.length, 'Werk', 'Werken') + ' gelesen';
    uebersichtMalen(body, malen);
  };
  $('[data-back]', node).onclick = () => layerSchliessen();
  /* Wieder wegschieben: von unten nach oben, derselbe Vorhang rückwärts. */
  vorhangHochBinden(node, body);
  layerOeffnen(node, () => { ueOffen = null; });
  ueOffen = malen;
  malen();
  return node;
}

function uebersichtMalen(root, neuMalen) {
  const unter = [['zahlen', 'Zahlen'], ['zusammen', 'Zusammenfassungen'], ['autoren', 'Autoren'], ['tage', 'Tage']];
  root.innerHTML = `
    <div class="chiprow">
      ${unter.map(([k, l]) => `<button class="chip" data-ub="${k}" aria-pressed="${uebersichtUnter === k}">${l}</button>`).join('')}
    </div>
    <div id="ueInhalt" style="margin-top:14px"></div>`;
  $$('[data-ub]', root).forEach(c => c.onclick = () => {
    uebersichtUnter = c.dataset.ub;
    (neuMalen || viewMalen)();
  });
  const ziel = $('#ueInhalt', root);
  if (uebersichtUnter === 'zahlen') zahlenMalen(ziel);
  else if (uebersichtUnter === 'zusammen') zusammenfassungenMalen(ziel);
  else if (uebersichtUnter === 'autoren') autorenMalen(ziel);
  else tageMalen(ziel);
}

/* Kleine Punktreihe für den Schwierigkeitsgrad. */
function stufeHtml(n) {
  if (!n) return '';
  return '<span class="stufe" title="Schwierigkeit ' + n + ' von 5">' +
    [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'an' : ''}"></i>`).join('') + '</span>';
}
const STUFEN = { 1: 'leicht', 2: 'überschaubar', 3: 'fordernd', 4: 'schwer', 5: 'sehr schwer' };

/* Je Block die Bücher, jedes zum Auf- und Zuklappen. */
function zusammenfassungenMalen(root) {
  const bloecke = bloeckeSortiert();
  if (!bloecke.length) {
    root.innerHTML = `<div class="empty"><strong>Nichts zusammenzufassen</strong>Sobald Blöcke und Bücher da sind, stehen hier alle Beschreibungen untereinander.</div>`;
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'section';
  root.appendChild(wrap);
  bloecke.forEach((blk, i) => {
    const bs = buecherIn(blk.id);
    if (!bs.length) return;
    wrap.insertAdjacentHTML('beforeend',
      `<div class="blockkopf"><h3>${String(i + 1).padStart(2, '0')} · ${esc(blk.name)}</h3><span class="eyebrow">${pl(bs.length, 'Werk', 'Werke')}</span></div>`);
    bs.forEach(b => {
      const d = document.createElement('details');
      d.className = 'akk';
      d.innerHTML = `
        <summary>
          <span class="grow" style="flex:1;min-width:0">
            <span class="at">${esc(b.titel)}</span>
            ${b.kurz ? `<span class="ak">${esc(b.kurz)}</span>` : ''}
            <span class="am">
              <span>${esc(b.autor)}</span>
              ${b.jahr != null ? `<span class="num">${esc(jahrText(b.jahr))}</span>` : ''}
              ${b.seiten ? `<span class="num">${b.seitenUnsicher ? '~' : ''}${b.seiten} S.</span>` : ''}
              ${b.schwierigkeit ? stufeHtml(b.schwierigkeit) : ''}
            </span>
          </span>
          <span class="chev">${ICON.chev}</span>
        </summary>
        <div class="ab">${b.beschreibung ? esc(b.beschreibung).replace(/\n/g, '<br>') : '<em style="color:var(--text-3)">Noch keine Beschreibung.</em>'}</div>`;
      d.querySelector('.ab').addEventListener('click', () => buchOeffnen(b.id));
      wrap.appendChild(d);
    });
  });
}

/* ---------- Autoren ---------- */
function ersterSatz(text, max) {
  if (!text) return '';
  const m = String(text).match(/^[^.!?]*[.!?]/);
  let t = (m ? m[0] : String(text)).trim();
  if (max && t.length > max) t = t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  return t;
}

/* Autoren aus einer Buchmenge, mit Lebensdaten, Biographie und Einflüssen. */
function autorenIndex(buecher) {
  const map = new Map();
  buecher.forEach(b => {
    const liste = buchAutoren(b);
    (liste.length ? liste : [{ name: 'Ohne Autor', geb: null, gest: null, bio: '', einfluss: [] }]).forEach(a => {
      const name = a.name || 'Ohne Autor';
      if (!map.has(name)) map.set(name, { name, buecher: [], geb: null, gest: null, bio: '', einfluss: [] });
      const e = map.get(name);
      if (!e.buecher.includes(b)) e.buecher.push(b);
      if (e.geb == null && a.geb != null) e.geb = a.geb;
      if (e.gest == null && a.gest != null) e.gest = a.gest;
      if (!e.bio && a.bio) e.bio = a.bio;
      (a.einfluss || []).forEach(x => { if (!e.einfluss.includes(x)) e.einfluss.push(x); });
    });
  });
  return map;
}
/* Namen aus der Einflussliste auf die Autoren der Liste abbilden. */
function autorAufloesen(map, name) {
  if (map.has(name)) return name;
  const treffer = Array.from(map.keys()).filter(k => k === name || k.startsWith(name + ' ') || k.startsWith(name + ','));
  return treffer.length === 1 ? treffer[0] : null;
}
/* Wen hat wer beeinflusst – die Umkehrung der Einflussangaben. */
function einflussAufIndex(map) {
  const inv = new Map();
  map.forEach(a => a.einfluss.forEach(q => {
    const ziel = autorAufloesen(map, q);
    if (!ziel) return;
    if (!inv.has(ziel)) inv.set(ziel, []);
    if (!inv.get(ziel).includes(a.name)) inv.get(ziel).push(a.name);
  }));
  return inv;
}

function autorenMalen(root) {
  const bloecke = bloeckeSortiert();
  const alle = autorenIndex(buecherAktiv());
  const inv = einflussAufIndex(alle);

  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.innerHTML = `
    <div class="section-head"><h2>Autoren</h2><span class="eyebrow">${alle.size}</span></div>
    <div class="btn-row" style="margin-bottom:14px">
      <button class="btn" data-netz style="flex:1">${ICON.tags} Vernetzung</button>
      <button class="btn" data-zeit style="flex:1">${ICON.chart} Zeitstrahl</button>
    </div>`;
  root.appendChild(wrap);
  $('[data-netz]', wrap).onclick = () => netzOeffnen();
  $('[data-zeit]', wrap).onclick = () => zeitstrahlOeffnen();

  if (!alle.size) {
    wrap.insertAdjacentHTML('beforeend',
      `<div class="empty" style="margin:0"><strong>Noch keine Autoren</strong>Sie ergeben sich aus den Büchern deiner Liste.</div>`);
    return;
  }

  const gezeigt = new Set();
  bloecke.forEach((blk, i) => {
    const bs = buecherIn(blk.id);
    if (!bs.length) return;
    const namen = [];
    bs.forEach(b => buchAutoren(b).forEach(a => {
      const n = a.name || 'Ohne Autor';
      if (!namen.includes(n)) namen.push(n);
    }));
    if (!namen.length) return;
    wrap.insertAdjacentHTML('beforeend',
      `<div class="blockkopf"><h3>${String(i + 1).padStart(2, '0')} · ${esc(blk.name)}</h3><span class="eyebrow">${pl(namen.length, 'Autor', 'Autoren')}</span></div>`);
    namen.forEach(n => {
      gezeigt.add(n);
      wrap.appendChild(autorZeile(alle.get(n), alle, inv, bs));
    });
  });

  /* Autoren aus Büchern ohne gültigen Block */
  const rest = Array.from(alle.values()).filter(a => !gezeigt.has(a.name));
  if (rest.length) {
    wrap.insertAdjacentHTML('beforeend', `<div class="blockkopf"><h3>Ohne Block</h3><span class="eyebrow">${rest.length}</span></div>`);
    rest.forEach(a => wrap.appendChild(autorZeile(a, alle, inv, null)));
  }
}

function autorZeile(a, alle, inv, nurAusBlock) {
  if (!a) return document.createElement('div');
  const lebt = lebensdaten(a.geb, a.gest);
  const werke = nurAusBlock ? a.buecher.filter(b => nurAusBlock.includes(b)) : a.buecher;
  const wirkt = (inv.get(a.name) || []).length;
  const kurz = ersterSatz(a.bio, 160);

  const node = document.createElement('div');
  node.className = 'arow';
  node.innerHTML = `
    <button class="apane" data-auf>
      <span class="ai">
        <span class="an">${esc(a.name)}</span>
        <span class="am">
          ${lebt ? `<span class="num">${esc(lebt)}</span>` : ''}
          <span>${pl(werke.length, 'Werk', 'Werke')}</span>
          <span>${werke.filter(b => b.status === 'gelesen').length} gelesen</span>
          ${wirkt ? `<span style="color:var(--wirkt)">wirkt auf ${wirkt}</span>` : ''}
        </span>
      </span>
      <span class="chev">${ICON.chev}</span>
    </button>
    <div class="apane">
      <span class="ai">
        <span class="kt">In Kürze</span>
        <span class="kx">${kurz ? esc(kurz) : '<em style="color:var(--text-3)">Noch keine Biographie.</em>'}</span>
      </span>
    </div>`;
  $('[data-auf]', node).onclick = () => autorOeffnen(a, alle, inv);
  return node;
}

/* Ein Autor als eigene Ansicht: Biographie, Einflüsse, Werke. */
function autorOeffnen(a, alle, inv) {
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif" data-t></div><div class="ovl-sub" data-s></div></div>
      <button class="icon-btn" data-bio aria-label="Bearbeiten">${ICON.edit}</button>
    </div>
    <div class="ovl-body" style="padding:14px 14px 40px" data-b></div>`;

  const malen = () => {
    const frisch = autorenIndex(buecherAktiv());
    const inv2 = einflussAufIndex(frisch);
    const akt = frisch.get(a.name) || a;
    $('[data-t]', node).textContent = akt.name;
    $('[data-s]', node).textContent = [lebensdaten(akt.geb, akt.gest), pl(akt.buecher.length, 'Werk', 'Werke')].filter(Boolean).join(' · ');

    const von = akt.einfluss;
    const auf = inv2.get(akt.name) || [];
    const chip = (n, klickbar) => `<span class="en${klickbar ? ' link' : ''}"${klickbar ? ` data-spring="${esc(n)}"` : ''}>${esc(n)}</span>`;

    const b = $('[data-b]', node);
    b.innerHTML = `
      ${akt.bio
        ? `<p class="desc">${esc(akt.bio).replace(/\n/g, '<br>')}</p>`
        : `<div class="empty" style="margin:0"><strong>Noch keine Biographie</strong>Ein paar Sätze zum Leben – wer war das, und woraus kommt dieses Buch?</div>`}
      <div class="einfluss" style="margin-top:16px">
        <div>
          <div class="eg">Beeinflusst von</div>
          <div class="er">${von.length
        ? von.map(n => chip(n, !!autorAufloesen(frisch, n))).join('')
        : '<span class="en" style="opacity:.6">nichts eingetragen</span>'}</div>
        </div>
        <div class="wirkt">
          <div class="eg">Wirkt auf</div>
          <div class="er">${auf.length
        ? auf.map(n => chip(n, true)).join('')
        : '<span class="en" style="opacity:.6">niemanden in dieser Liste</span>'}</div>
        </div>
      </div>
      <div class="section-head" style="margin:20px 0 9px"><h2>Werke in deinen Listen</h2><span class="eyebrow">${akt.buecher.length}</span></div>
      <div data-werke></div>`;

    const w = $('[data-werke]', b);
    akt.buecher.forEach(x => {
      const r = document.createElement('button');
      r.className = 'grouprow';
      r.innerHTML = `<span class="grow">
          <span class="gname serif">${esc(x.titel)}</span>
          <span class="gmeta">${x.jahr != null ? esc(jahrText(x.jahr)) + ' · ' : ''}${STATUS[x.status]}${x.seiten ? ' · ' + x.seiten + ' S.' : ''}</span>
        </span><span class="chev">${ICON.chev}</span>`;
      r.onclick = () => buchOeffnen(x.id);
      w.appendChild(r);
    });
    $$('[data-spring]', b).forEach(x => x.onclick = () => {
      const ziel = autorAufloesen(frisch, x.dataset.spring);
      if (ziel) autorOeffnen(frisch.get(ziel), frisch, inv2);
    });
  };

  $('[data-back]', node).onclick = () => layerSchliessen();
  $('[data-bio]', node).onclick = () => autorBearbeiten(a, () => { malen(); viewMalen(); });
  layerOeffnen(node, () => viewMalen());
  malen();
}

function autorBearbeiten(a, nachher) {
  const betroffen = DB.buecher.filter(b => buchAutoren(b).some(x => x.name === a.name));
  const s = blatt(a.name, `
    <div class="field">
      <label>Biographie</label>
      <textarea data-bio style="min-height:170px;font-family:'Literata',Georgia,serif;line-height:1.65">${esc(a.bio || '')}</textarea>
    </div>
    <div class="field">
      <label>Beeinflusst von</label>
      <textarea data-ein style="min-height:64px" placeholder="Namen mit Komma trennen">${esc((a.einfluss || []).join(', '))}</textarea>
      <span class="hint">Wer auf wen wirkt, ergibt sich daraus von selbst: Steht hier ein Name aus deiner Liste, taucht dieser Autor drüben unter „Wirkt auf“ auf.</span>
    </div>
    <p class="hinweis" style="padding:0 0 10px">Gilt für alle ${pl(betroffen.length, 'Eintrag', 'Einträge')} dieses Autors.</p>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`, { fokus: false });
  $('[data-ok]', s).onclick = () => {
    const bio = $('[data-bio]', s).value.trim();
    const ein = $('[data-ein]', s).value.split(',').map(x => x.trim()).filter(Boolean);
    aendern(() => betroffen.forEach(b => {
      b.autoren = buchAutoren(b).map(x => x.name === a.name ? Object.assign({}, x, { bio, einfluss: ein.slice() }) : x);
      if (b.autoren[0] && b.autoren[0].name === a.name) { b.autorBio = bio; b.autorEinfluss = ein.slice(); }
    }));
    layerSchliessen();
    if (nachher) nachher();
  };
}

/* Der Steckbrief eines Autors: Einflüsse in beide Richtungen und seine Werke.
   Vernetzung und Zeitstrahl zeigen denselben Kasten. */
function autorSteckbriefMalen(name, alle, inv, info, aufloesen) {
  const a = alle.get(name);
  if (!a) { info.innerHTML = ''; return; }
  const von = a.einfluss.filter(q => autorAufloesen(alle, q));
  const auf = inv.get(name) || [];
  const nurText = a.einfluss.filter(q => !autorAufloesen(alle, q));
  /* Wer in beiden Reihen steht, steht in einer gegenseitigen Beziehung. */
  const aufgeloest = von.map(q => autorAufloesen(alle, q));
  const beide = new Set(auf.filter(n => aufgeloest.includes(n)));
  const kl = q => {
    const n = autorAufloesen(alle, q) || q;
    return 'en link' + (beide.has(n) ? ' beides' : '');
  };
  const lebt = lebensdaten(a.geb, a.gest);
  info.innerHTML = `
    <div class="section-head"><h2>${esc(name)}</h2>
      ${lebt ? `<span class="eyebrow num">${esc(lebt)}</span>` : ''}
      <button class="btn btn-sm btn-ghost" data-weg>Auswahl lösen</button></div>
    <div class="einfluss">
      <div><div class="eg">Beeinflusst von</div><div class="er">${(von.length || nurText.length)
      ? von.map(n => `<span class="${kl(n)}" data-waehl="${esc(n)}">${esc(n)}</span>`).join('')
      + nurText.map(n => `<span class="en">${esc(n)}</span>`).join('')
      : '<span class="en" style="opacity:.6">niemandem hier</span>'}</div></div>
      <div class="wirkt"><div class="eg">Wirkt auf</div><div class="er">${auf.length
      ? auf.map(n => `<span class="${kl(n)}" data-waehl="${esc(n)}">${esc(n)}</span>`).join('')
      : '<span class="en" style="opacity:.6">niemanden hier</span>'}</div></div>
      ${beide.size ? `<p class="hinweis" style="padding:2px 0 0;color:var(--beides)">
        Gegenseitig: ${Array.from(beide).map(esc).join(', ')}</p>` : ''}
    </div>
    <div class="section-head" style="margin:18px 0 9px"><h2>Werke in deinen Listen</h2><span class="eyebrow">${a.buecher.length}</span></div>
    <div data-werke></div>`;
  const weg = $('[data-weg]', info);
  if (weg) weg.onclick = () => aufloesen();
  const w = $('[data-werke]', info);
  a.buecher.forEach(x => {
    const r = document.createElement('button');
    r.className = 'grouprow';
    r.innerHTML = `<span class="grow">
        <span class="gname serif">${esc(x.titel)}</span>
        <span class="gmeta">${x.jahr != null ? esc(jahrText(x.jahr)) + ' · ' : ''}${STATUS[x.status]}${x.seiten ? ' · ' + x.seiten + ' S.' : ''}</span>
      </span><span class="chev">${ICON.chev}</span>`;
    r.onclick = () => buchOeffnen(x.id);
    w.appendChild(r);
  });
}

/* Alle Einflusslinien einer Autorenmenge, aufgelöst auf tatsächliche Namen. */
function einflussKanten(alle) {
  const kanten = [];
  alle.forEach(a => a.einfluss.forEach(q => {
    const von = autorAufloesen(alle, q);
    if (von && von !== a.name) kanten.push({ von, auf: a.name });
  }));
  return kanten;
}

/* ---------- Vernetzung: wer wirkt auf wen ---------- */
function netzOeffnen() {
  const alle = autorenIndex(buecherAktiv());
  const inv = einflussAufIndex(alle);
  const namen = Array.from(alle.values())
    .sort((a, b) => (a.geb == null ? 9999 : a.geb) - (b.geb == null ? 9999 : b.geb));
  const kanten = einflussKanten(alle);

  let gewaehlt = null;
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Vernetzung</div>
        <div class="ovl-sub">${pl(kanten.length, 'Linie', 'Linien')} zwischen ${pl(namen.length, 'Autor', 'Autoren')}</div></div>
    </div>
    <div class="ovl-body" style="padding:12px 14px 40px">
      <p class="hinweis" style="padding:0 0 10px">
        Nach Geburtsjahr gereiht. Eine Linie führt von dem, der wirkt, zu dem, auf den gewirkt wird.
        Tippe einen Namen an, um nur seine Linien zu sehen.
      </p>
      <div class="netzlegende">
        <span><i style="background:var(--accent)"></i>beeinflusst von</span>
        <span><i style="background:var(--wirkt)"></i>wirkt auf</span>
        <span><i style="background:var(--beides)"></i>gegenseitig</span>
      </div>
      <div class="netz" data-netz></div>
      <div data-info style="margin-top:14px"></div>
    </div>`;

  const behaelter = $('[data-netz]', node);
  const H = 28, GUT = 118;
  /* Zwei Autoren, die einander beeinflusst haben: beide Linien gehören dann
     zusammen und bekommen die dritte Farbe. */
  const paare = new Set(kanten.map(k => k.von + '\u0000' + k.auf));
  const gegenseitig = k => paare.has(k.auf + '\u0000' + k.von);

  const malen = () => {
    behaelter.innerHTML = '';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'netzsvg');
    svg.setAttribute('width', GUT);
    svg.setAttribute('height', namen.length * H);
    svg.setAttribute('viewBox', '0 0 ' + GUT + ' ' + (namen.length * H));
    behaelter.appendChild(svg);

    namen.forEach((a, i) => {
      const z = document.createElement('div');
      z.className = 'netzzeile';
      const beteiligt = !gewaehlt || gewaehlt === a.name ||
        kanten.some(k => (k.von === gewaehlt && k.auf === a.name) || (k.auf === gewaehlt && k.von === a.name));
      if (gewaehlt === a.name) z.classList.add('aktiv');
      if (!beteiligt) z.classList.add('blass');
      z.innerHTML = `<span class="nj num">${a.geb != null ? esc(jahrText(a.geb)).replace(' v. Chr.', ' v') : '–'}</span>
        <span class="nn">${esc(a.name)}</span>`;
      z.style.marginRight = GUT + 'px';
      z.onclick = () => { gewaehlt = (gewaehlt === a.name) ? null : a.name; malen(); };
      behaelter.appendChild(z);
    });

    const y = n => namen.findIndex(a => a.name === n) * H + H / 2;
    kanten.forEach(k => {
      const y1 = y(k.von), y2 = y(k.auf);
      if (y1 < 0 || y2 < 0) return;
      const aktiv = gewaehlt && (k.von === gewaehlt || k.auf === gewaehlt);
      /* Dieselben Farben wie die Namenschips darunter: was auf den Gewählten
         wirkt, im Akzent – was von ihm ausgeht, in der Gegenfarbe. Geht es in
         beide Richtungen, gilt die dritte Farbe. */
      const farbe = !aktiv ? (gegenseitig(k) ? 'color-mix(in srgb,var(--beides) 55%,var(--border-strong))' : 'var(--border-strong)')
        : gegenseitig(k) ? 'var(--beides)'
          : (k.von === gewaehlt ? 'var(--wirkt)' : 'var(--accent)');
      const bauch = Math.min(GUT - 8, 14 + Math.abs(y2 - y1) * 0.32);
      const pfad = document.createElementNS(svgNS, 'path');
      pfad.setAttribute('d', `M 2 ${y1} Q ${bauch} ${(y1 + y2) / 2} 2 ${y2}`);
      pfad.setAttribute('fill', 'none');
      pfad.setAttribute('stroke', farbe);
      pfad.setAttribute('stroke-width', aktiv ? 1.8 : 1);
      pfad.setAttribute('opacity', gewaehlt ? (aktiv ? 1 : 0.12) : 0.5);
      svg.appendChild(pfad);
      const punkt = document.createElementNS(svgNS, 'circle');
      punkt.setAttribute('cx', 2); punkt.setAttribute('cy', y2); punkt.setAttribute('r', aktiv ? 3 : 2);
      punkt.setAttribute('fill', farbe);
      punkt.setAttribute('opacity', gewaehlt ? (aktiv ? 1 : 0.12) : 0.6);
      svg.appendChild(punkt);
    });

    const info = $('[data-info]', node);
    if (!gewaehlt) {
      const zaehl = namen.map(a => ({ n: a.name, w: (inv.get(a.name) || []).length })).filter(x => x.w > 0)
        .sort((a, b) => b.w - a.w).slice(0, 5);
      const isoliert = namen.filter(a =>
        !a.einfluss.some(q => autorAufloesen(alle, q)) && !(inv.get(a.name) || []).length);
      info.innerHTML = (zaehl.length
        ? `<div class="section-head"><h2>Wirkt am weitesten</h2></div>
           <div class="list-card">${zaehl.map(x => `<button class="rowline" data-waehl="${esc(x.n)}" style="width:100%;text-align:left">
             <span class="grow"><span class="rn">${esc(x.n)}</span>
             <span class="rm">wirkt auf ${pl(x.w, 'Autor', 'Autoren')} dieser Liste</span></span>
             <span class="chev">${ICON.chev}</span></button>`).join('')}</div>`
        : `<p class="hinweis">Noch keine Einflüsse eingetragen. Du findest das Feld beim Autor unter „Biographie &amp; Einfluss“.</p>`)
        + (isoliert.length
          ? `<div class="section-head" style="margin-top:18px"><h2>Ohne Vernetzung in dieser Liste</h2><span class="eyebrow">${isoliert.length}</span></div>
             <div class="list-card">${isoliert.map(a => `<button class="rowline" data-waehl="${esc(a.name)}" style="width:100%;text-align:left">
               <span class="grow"><span class="rn">${esc(a.name)}</span>
               <span class="rm">${a.einfluss.length ? 'beeinflusst von ' + a.einfluss.map(esc).join(', ') : 'keine Einflüsse eingetragen'}</span></span>
               <span class="chev">${ICON.chev}</span></button>`).join('')}</div>`
          : '');
    } else {
      autorSteckbriefMalen(gewaehlt, alle, inv, info, () => { gewaehlt = null; malen(); });
    }
    /* Ein Name unten wählt oben aus und holt die Zeile ins Bild. */
    $$('[data-waehl]', info).forEach(x => x.onclick = () => {
      const ziel = autorAufloesen(alle, x.dataset.waehl);
      if (!ziel) return;
      gewaehlt = ziel;
      malen();
      const i = namen.findIndex(a => a.name === ziel);
      const zeile = behaelter.children[i + 1];
      if (zeile && zeile.scrollIntoView) zeile.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  $('[data-back]', node).onclick = () => layerSchliessen();
  layerOeffnen(node);
  malen();
}

/* ---------- Zeitstrahl: Lebzeiten und Erscheinungsjahre ----------
   Die Skala wird aus den Daten gebaut: belegte Zeitspannen bekommen Platz,
   leere Jahrhunderte werden zu einem Bruch zusammengezogen. So passt die
   Antike neben die Neuzeit, ohne dass dazwischen Leere steht. */
function zeitSkala(spannen, px, minLuecke, bruchBreite) {
  const s = spannen.filter(x => x && x.von != null && x.bis != null)
    .map(x => ({ von: Math.min(x.von, x.bis) - 6, bis: Math.max(x.von, x.bis) + 6 }))
    .sort((a, b) => a.von - b.von);
  const teile = [];
  s.forEach(x => {
    const letzt = teile[teile.length - 1];
    if (letzt && x.von - letzt.bis <= minLuecke) letzt.bis = Math.max(letzt.bis, x.bis);
    else teile.push({ von: x.von, bis: x.bis });
  });
  let cursor = 0;
  teile.forEach((t, i) => {
    t.x0 = cursor;
    t.breite = Math.max(30, (t.bis - t.von) * px);
    cursor += t.breite;
    t.x1 = cursor;
    if (i < teile.length - 1) { t.bruchX = cursor; cursor += bruchBreite; }
  });
  const x = jahr => {
    for (const t of teile) {
      if (jahr >= t.von && jahr <= t.bis) return t.x0 + (jahr - t.von) * px;
    }
    /* Zwischen zwei Abschnitten: an den nächstgelegenen Rand legen. */
    let best = teile[0], dist = Infinity;
    teile.forEach(t => {
      const d = jahr < t.von ? t.von - jahr : jahr - t.bis;
      if (d < dist) { dist = d; best = t; }
    });
    return jahr < best.von ? best.x0 : best.x1;
  };
  return { teile, x, breite: cursor };
}

function zeitstrahlOeffnen() {
  const alle = autorenIndex(buecherAktiv());
  const jetzt = new Date().getFullYear();
  const liste = Array.from(alle.values()).filter(a => a.geb != null).sort((a, b) => a.geb - b.geb);
  const ohne = Array.from(alle.values()).filter(a => a.geb == null);

  if (!liste.length) {
    toast('Noch keine Lebensdaten eingetragen.');
    return;
  }

  const PX = 2.9, LUECKE = 60, BRUCH = 18;
  const spannen = [];
  liste.forEach(a => {
    spannen.push({ von: a.geb, bis: a.gest != null ? a.gest : jetzt });
    a.buecher.forEach(b => { if (b.jahr != null) spannen.push({ von: b.jahr, bis: b.jahr }); });
  });
  const skala = zeitSkala(spannen, PX, LUECKE, BRUCH);
  const breite = Math.max(700, Math.round(skala.breite) + 20);

  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Zeitstrahl</div>
        <div class="ovl-sub">${pl(liste.length, 'Autor', 'Autoren')} · ${pl(skala.teile.length, 'Abschnitt', 'Abschnitte')}</div></div>
    </div>
    <div class="ovl-body" style="padding:12px 14px 40px">
      <p class="hinweis" style="padding:0 0 10px">
        Der Balken ist die Lebenszeit, jeder Punkt ein Buch im Jahr seiner Erstveröffentlichung –
        grün heißt gelesen. Wo Jahrhunderte ohne Einträge liegen, ist die Skala schraffiert
        zusammengezogen. Seitlich wischen, Punkte antippen. Ein Tipp auf einen Namen hebt ihn
        samt seiner Einflüsse hervor.
      </p>
      <div class="zsRahmen"><div class="zsInner" style="width:${breite}px" data-zs></div></div>
      <div data-info style="margin-top:14px"></div>
      <div data-rest style="margin-top:14px"></div>
    </div>`;

  /* Achse: der feinste Takt, bei dem die Zahlen noch nebeneinander passen –
     bei der jetzigen Auflösung sind das Zwanzigerschritte. */
  const ABSTAND = 52;
  const schritt = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find(x => x * PX >= ABSTAND) || 1000;
  let html = '<div class="zsAchse">';
  const striche = [];
  skala.teile.forEach(t => {
    const start = Math.ceil(t.von / schritt) * schritt;
    for (let j = start; j <= t.bis; j += schritt) {
      const x = skala.x(j);
      /* Ganz am linken Rand würde die zentrierte Zahl halb abgeschnitten. */
      html += `<span class="${x < 18 ? 'links' : ''}" style="left:${x < 18 ? 2 : x}px">${esc(jahrText(j).replace(' v. Chr.', ' v'))}</span>`;
      striche.push(x);
    }
  });
  html += '</div>';
  striche.forEach(x => { html += `<div class="zsGitter" style="left:${x}px"></div>`; });
  skala.teile.forEach(t => { if (t.bruchX != null) html += `<div class="zsBruch" style="left:${t.bruchX}px"></div>`; });

  liste.forEach((a, reihe) => {
    const ende = a.gest != null ? a.gest : jetzt;
    const l = skala.x(a.geb), b = Math.max(18, skala.x(ende) - l);
    html += `<div class="zsZeile${reihe % 2 ? ' alt' : ''}" data-zeile="${esc(a.name)}">
      <div class="zsBalken" style="left:${l}px;width:${b}px"></div>
      <button class="zsName" data-autor="${esc(a.name)}" style="left:${l + 4}px">${esc(a.name)}</button>`;
    a.buecher.filter(x => x.jahr != null).forEach(b2 => {
      html += `<div class="zsPunkt${b2.status === 'gelesen' ? ' gelesen' : ''}" style="left:${skala.x(b2.jahr)}px"
        data-buch="${b2.id}" title="${esc(b2.titel)} (${esc(jahrText(b2.jahr))})"></div>`;
    });
    html += '</div>';
  });

  const inner = $('[data-zs]', node);
  inner.innerHTML = html;
  $$('[data-buch]', inner).forEach(p => p.onclick = () => {
    const b = buchById(p.dataset.buch);
    if (b) toast(b.titel + ' · ' + jahrText(b.jahr) + ' · zweimal tippen öffnet das Buch');
  });
  $$('[data-buch]', inner).forEach(p => p.ondblclick = () => buchOeffnen(p.dataset.buch));

  /* Ein Name im Strahl wählt den Autor: seine Zeile tritt hervor, die
     Autoren am anderen Ende einer Einflusslinie bleiben mitbetont, der
     Rest tritt zurück. Darunter derselbe Steckbrief wie in der Vernetzung. */
  const inv = einflussAufIndex(alle);
  const kanten = einflussKanten(alle);
  const info = $('[data-info]', node);
  let gewaehlt = null;

  const markieren = () => {
    $$('[data-zeile]', inner).forEach(z => {
      const n = z.dataset.zeile;
      const verbunden = !!gewaehlt && n !== gewaehlt &&
        kanten.some(k => (k.von === gewaehlt && k.auf === n) || (k.auf === gewaehlt && k.von === n));
      z.classList.toggle('aktiv', gewaehlt === n);
      z.classList.toggle('verbunden', verbunden);
      z.classList.toggle('blass', !!gewaehlt && n !== gewaehlt && !verbunden);
    });
    if (!gewaehlt) { info.innerHTML = ''; return; }
    autorSteckbriefMalen(gewaehlt, alle, inv, info, () => { gewaehlt = null; markieren(); });
    /* Aus dem Steckbrief heraus zum nächsten Autor springen. */
    $$('[data-waehl]', info).forEach(x => x.onclick = () => {
      const ziel = autorAufloesen(alle, x.dataset.waehl);
      if (!ziel) return;
      gewaehlt = ziel;
      markieren();
      const z = $(`[data-zeile="${CSS.escape(ziel)}"]`, inner);
      if (z) z.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  $$('[data-autor]', inner).forEach(n => n.onclick = () => {
    gewaehlt = (gewaehlt === n.dataset.autor) ? null : n.dataset.autor;
    markieren();
  });

  if (ohne.length) {
    $('[data-rest]', node).innerHTML = `<div class="section-head"><h2>Ohne Lebensdaten</h2></div>
      <p class="hinweis" style="padding:0">${ohne.map(a => esc(a.name)).join(' · ')}</p>`;
  }

  $('[data-back]', node).onclick = () => layerSchliessen();
  layerOeffnen(node);
}

/* Tagesprotokolle: was an welchem Tag gelesen wurde. */
function tageMalen(root) {
  const tage = tageMitSitzungen();
  const ziel = +DB.einstellungen.zielSeiten || 0;
  const wrap = document.createElement('div');
  wrap.className = 'section';
  root.appendChild(wrap);

  const z = zielHeute();
  wrap.insertAdjacentHTML('beforeend', `
    <div class="list-card" style="margin-bottom:16px">
      <div class="rowline">
        <span class="grow">
          <span class="rn">Tagesziel</span>
          <span class="rm">${ziel ? ziel + ' Seiten pro Tag · heute ' + z.gelesen : 'Noch keins gesetzt'}</span>
        </span>
        <button class="btn btn-sm" data-ziel>${ziel ? 'Ändern' : 'Setzen'}</button>
      </div>
    </div>`);
  $('[data-ziel]', wrap).onclick = () => zielBearbeiten();

  if (!tage.length) {
    wrap.insertAdjacentHTML('beforeend',
      `<div class="empty" style="margin:0"><strong>Noch keine Tage</strong>Jede Lese-Sitzung schreibt einen Eintrag. Starte die Stoppuhr oder trage eine Sitzung von Hand ein.</div>`);
    return;
  }

  /* Balken der letzten drei Wochen */
  const heuteD = new Date();
  const punkte = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(heuteD.getFullYear(), heuteD.getMonth(), heuteD.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const t = tage.find(x => x.datum === iso);
    punkte.push({ label: fmtDatum(iso), kurz: String(d.getDate()), wert: t ? t.seiten : 0 });
  }
  wrap.appendChild(karte('Seiten pro Tag', 'Die letzten drei Wochen.' + (ziel ? ' Die gestrichelte Linie ist dein Ziel.' : ''),
    zeitBalken(punkte, v => fmtZahl(v) + ' Seiten'), '',
    tabelleHtml(['Tag', 'Seiten'], punkte.map(x => [x.label, fmtZahl(x.wert)]))));

  const geschaffte = ziel ? tage.filter(t => t.seiten >= ziel).length : 0;
  const summe = tage.reduce((s, t) => s + t.seiten, 0);
  const tiles = document.createElement('div');
  tiles.className = 'tiles';
  tiles.innerHTML = [
    ['Lesetage', String(tage.length), 'mit mindestens einer Sitzung'],
    ['Seiten je Lesetag', fmtZahl(Math.round(summe / tage.length)), 'im Schnitt'],
    ziel ? ['Ziel erreicht', geschaffte + ' <small>/ ' + tage.length + '</small>', Math.round(geschaffte / tage.length * 100) + ' % der Lesetage'] : null
  ].filter(Boolean).map(([k, v, sub]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${esc(sub)}</div></div>`).join('');
  wrap.appendChild(tiles);

  wrap.insertAdjacentHTML('beforeend', `<div class="section-head" style="margin:18px 0 9px"><h2>Protokoll</h2><span class="eyebrow">${tage.length}</span></div>`);
  const karteEl = document.createElement('div');
  karteEl.className = 'list-card';
  tage.slice(0, 120).forEach(t => {
    const geschafft = ziel && t.seiten >= ziel;
    const r = document.createElement('div');
    r.className = 'rowline';
    r.innerHTML = `
      <span class="grow">
        <span class="rn num">${fmtDatum(t.datum)}${geschafft ? ' <span style="color:var(--good)">✓</span>' : ''}</span>
        <span class="rm">${t.seiten ? t.seiten + ' Seiten · ' : ''}${fmtDauer(t.minuten)} · ${pl(t.buecher, 'Buch', 'Bücher')}</span>
      </span>
      ${ziel ? `<span class="zbar" style="width:64px;height:5px;border-radius:99px;background:var(--surface-3);overflow:hidden">
        <i style="display:block;height:100%;border-radius:99px;background:${geschafft ? 'var(--good)' : 'var(--accent)'};width:${clamp(t.seiten / ziel * 100, 0, 100)}%"></i></span>` : ''}`;
    karteEl.appendChild(r);
  });
  wrap.appendChild(karteEl);
}

function zahlenMalen(root) {
  root.innerHTML = '';
  if (!DB.buecher.length) {
    root.innerHTML = `<div class="empty"><strong>Nichts auszuwerten</strong>Sobald Bücher im Plan stehen, entstehen hier die Graphen.</div>`;
    return;
  }
  const plan = aktiverPlan();
  const ueberAlles = uebersichtAllePlaene || !plan;
  const bloecke = ueberAlles ? alleBloeckeSortiert() : bloeckeVonPlan(plan.id);

  if (DB.lesepleane.length > 1) {
    const chips = document.createElement('div');
    chips.className = 'chiprow';
    chips.style.marginBottom = '12px';
    chips.innerHTML = `
      <button class="chip" data-u="plan" aria-pressed="${!ueberAlles}">${esc(plan ? plan.name : 'leseliste')}</button>
      <button class="chip" data-u="alle" aria-pressed="${ueberAlles}">Alle leselisten</button>`;
    $$('[data-u]', chips).forEach(c => c.onclick = () => { uebersichtAllePlaene = c.dataset.u === 'alle'; viewMalen(); });
    root.appendChild(chips);
  }

  const wrap = document.createElement('div');
  wrap.className = 'section';
  root.appendChild(wrap);

  const alle = ueberAlles ? DB.buecher : buecherImPlan(plan.id);
  if (!alle.length) {
    wrap.innerHTML = `<div class="empty" style="margin:0"><strong>„${esc(plan.name)}" ist leer</strong>Lege Bücher an, dann entstehen hier die Graphen.</div>`;
    return;
  }
  const gelesen = alle.filter(b => b.status === 'gelesen');
  const seitenGes = alle.reduce((s, b) => s + (b.seiten || 0), 0);
  const seitenGelesen = gelesen.reduce((s, b) => s + (b.seiten || 0), 0);
  const minGes = alle.reduce((s, b) => s + buchMinuten(b), 0);
  const seitenAusSessions = alle.reduce((s, b) => s + buchSeitenGelesen(b), 0);
  const tempoGes = (minGes > 30 && seitenAusSessions) ? seitenAusSessions / (minGes / 60) : null;
  const kosten = alle.reduce((s, b) => s + (b.preis || 0), 0);
  const mitPreis = alle.filter(b => b.preis != null);
  const notizen = alle.reduce((s, b) => s + b.notizen.length, 0);

  /* Prognose aus dem Tempo der letzten Sitzungen */
  const sess = [];
  alle.forEach(b => b.sessions.forEach(s => sess.push(s)));
  sess.sort((a, b) => a.datum < b.datum ? -1 : 1);
  let prognose = '–';
  if (sess.length >= 2 && seitenAusSessions > 0) {
    const tage = Math.max(1, (new Date(sess[sess.length - 1].datum) - new Date(sess[0].datum)) / 86400000);
    const proTag = seitenAusSessions / tage;
    const rest = Math.max(0, seitenGes - seitenGelesen);
    if (proTag > 0.2 && rest > 0) {
      const d = new Date(Date.now() + rest / proTag * 86400000);
      prognose = d.getFullYear() > new Date().getFullYear() + 40 ? 'sehr fern' : MONATE[d.getMonth()] + ' ' + d.getFullYear();
    } else if (!rest) prognose = 'geschafft';
  }

  const tiles = document.createElement('div');
  tiles.className = 'tiles';
  tiles.innerHTML = [
    ['Gelesen', gelesen.length + ' <small>/ ' + alle.length + '</small>', Math.round(alle.length ? gelesen.length / alle.length * 100 : 0) + ' % der Liste'],
    ['Seiten gelesen', fmtZahl(seitenGelesen), 'von ' + fmtZahl(seitenGes)],
    ['Lesezeit', fmtDauerKurz(minGes), pl(sess.length, 'Sitzung', 'Sitzungen')],
    ['Tempo', tempoGes ? fmtZahl(tempoGes) + ' <small>S./h</small>' : '–', 'aus den Sitzungen'],
    ['Kosten', kosten ? fmtGeld(kosten) : '–', mitPreis.length + ' von ' + alle.length + ' mit Preis'],
    ['Notizen', fmtZahl(notizen), pl(DB.themen.length, 'Themenfeld', 'Themenfelder')],
    ['Fehlt mir', String(alle.filter(fehltMir).length), (() => {
      const s = alle.filter(fehltMir).reduce((x, b) => x + (b.preis || 0), 0);
      return s ? fmtGeld(s) + ' eingetragen' : 'ohne Preisangabe';
    })()],
    ['Fertig etwa', prognose, 'bei bisherigem Tempo']
  ].map(([k, v, s]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${esc(s)}</div></div>`).join('');
  wrap.appendChild(tiles);

  /* --- Fortschritt über die Zeit --- */
  if (sess.length) {
    const von = new Date(sess[0].datum), bis = new Date();
    const monate = monatsListe(von, bis);
    const proMonat = {};
    sess.forEach(s => {
      const k = s.datum.slice(0, 7);
      const seiten = (s.von != null && s.bis != null && s.bis > s.von) ? s.bis - s.von : 0;
      proMonat[k] = (proMonat[k] || 0) + seiten;
    });
    const punkte = monate.map(m => ({ label: m.label, kurz: m.kurz, wert: proMonat[m.key] || 0 }));
    wrap.appendChild(karte('Seiten pro Monat', 'Aus den Lese-Sitzungen, also nur dort, wo du Seite von und bis eingetragen hast.',
      zeitBalken(punkte, v => fmtZahl(v) + ' Seiten'), '',
      tabelleHtml(['Monat', 'Seiten'], punkte.map(p => [p.label, fmtZahl(p.wert)]))));

    /* Bücher kumuliert – Abschluss aus der letzten Sitzung eines gelesenen Buches */
    const fertig = gelesen.map(b => {
      const ss = b.sessions.slice().sort((x, y) => x.datum < y.datum ? -1 : 1);
      return ss.length ? ss[ss.length - 1].datum : null;
    }).filter(Boolean).sort();
    if (fertig.length) {
      let k = 0;
      const punkte2 = monate.map(m => {
        k += fertig.filter(d => d.slice(0, 7) === m.key).length;
        return { label: m.label, kurz: m.kurz, wert: k };
      });
      wrap.appendChild(karte('Gelesene Bücher, aufsummiert',
        `Abgeleitet aus der letzten Sitzung je Buch. ${gelesen.length - fertig.length > 0 ? (gelesen.length - fertig.length) + ' gelesene Bücher ohne Sitzung fehlen in dieser Kurve.' : ''}`,
        linie(punkte2, v => fmtZahl(v) + ' Bücher'), '',
        tabelleHtml(['Monat', 'Bücher'], punkte2.map(p => [p.label, fmtZahl(p.wert)]))));
    }
  } else {
    wrap.appendChild(karte('Fortschritt über die Zeit', '',
      `<div class="hinweis">Noch keine Lese-Sitzung erfasst. Starte im Buch unter „Lesen“ die Stoppuhr oder trage eine Sitzung von Hand ein – danach entsteht hier die Kurve.</div>`));
  }

  /* --- Blöcke im Vergleich --- */
  const bl = bloecke.map(blk => {
    const bs = buecherIn(blk.id);
    const g = bs.filter(x => x.status === 'gelesen').reduce((s, x) => s + (x.seiten || 0), 0);
    const o = bs.reduce((s, x) => s + (x.seiten || 0), 0) - g;
    return { label: blk.name, segmente: [{ wert: g, farbe: 'var(--good)', name: 'gelesen' }, { wert: o, farbe: 'var(--border-strong)', name: 'offen' }], wert: g + o, anzeige: fmtZahl(g + o) + ' S.', gelesen: g, offen: o, werke: bs.length };
  }).filter(x => x.wert > 0);
  if (bl.length) {
    wrap.appendChild(karte('Blöcke nach Seitenumfang', 'Wie viel Papier hinter jedem Block steckt – und wie viel davon schon gelesen ist.',
      balken(bl, { fmt: v => fmtZahl(v) + ' S.' }),
      `<span><i style="background:var(--good)"></i>gelesen</span><span><i style="background:var(--border-strong)"></i>offen</span>`,
      tabelleHtml(['Block', 'Werke', 'Gelesen (S.)', 'Offen (S.)'], bl.map(x => [x.label, x.werke, fmtZahl(x.gelesen), fmtZahl(x.offen)]))));
  }

  /* --- Kosten --- */
  if (mitPreis.length) {
    const proBlock = bloecke.map(blk => ({
      label: blk.name,
      wert: buecherIn(blk.id).reduce((s, b) => s + (b.preis || 0), 0)
    })).filter(x => x.wert > 0).sort((a, b) => b.wert - a.wert);
    const seitenMitPreis = mitPreis.reduce((s, b) => s + (b.seiten || 0), 0);
    const centProSeite = seitenMitPreis ? kosten / seitenMitPreis * 100 : null;
    const teuerste = mitPreis.slice().sort((a, b) => (b.preis || 0) - (a.preis || 0)).slice(0, 8)
      .map(b => ({ label: b.titel, wert: b.preis, farbe: 'var(--s2)' }));
    wrap.appendChild(karte('Kosten je Block', `Summe ${fmtGeld(kosten)}, im Schnitt ${fmtGeld(kosten / mitPreis.length)} je Buch${centProSeite ? ', ' + fmtZahl(centProSeite, 1) + ' Cent je Seite' : ''}. Ein Kaufdatum wird nicht erfasst, deshalb gibt es keine Kostenkurve über die Zeit.`,
      balken(proBlock, { fmt: fmtGeld }), '',
      tabelleHtml(['Block', 'Kosten'], proBlock.map(x => [x.label, fmtGeld(x.wert)]))));
    if (teuerste.length > 1) {
      wrap.appendChild(karte('Teuerste Bücher', '', balken(teuerste, { fmt: fmtGeld }), '',
        tabelleHtml(['Buch', 'Preis'], teuerste.map(x => [x.label, fmtGeld(x.wert)]))));
    }
  }

  /* --- Lesetempo --- */
  const tempi = alle.map(b => ({ b, t: buchTempo(b) })).filter(x => x.t)
    .sort((a, b) => b.t - a.t).slice(0, 12)
    .map(x => ({ label: x.b.titel, wert: x.t, farbe: 'var(--s7)' }));
  if (tempi.length) {
    wrap.appendChild(karte('Lesetempo je Buch', 'Seiten pro Stunde, aus deinen Sitzungen. Wo du langsam liest, steckt meist die Arbeit.',
      balken(tempi, { fmt: v => fmtZahl(v) + ' S./h' }), '',
      tabelleHtml(['Buch', 'Seiten/h'], tempi.map(x => [x.label, fmtZahl(x.wert)]))));
  }

  /* --- Notizen --- */
  const nachArt = DB.arten.map(a => ({
    label: a.name, farbe: 'var(--' + a.farbe + ')',
    wert: alle.reduce((s, b) => s + b.notizen.filter(n => n.artId === a.id).length, 0)
  })).filter(x => x.wert > 0).sort((a, b) => b.wert - a.wert);
  if (nachArt.length) {
    wrap.appendChild(karte('Notizen nach Art', 'Was für Spuren du hinterlässt.',
      balken(nachArt), nachArt.map(x => `<span><i style="background:${x.farbe}"></i>${esc(x.label)}</span>`).join(''),
      tabelleHtml(['Art', 'Notizen'], nachArt.map(x => [x.label, x.wert]))));
  }
  const nachThema = DB.themen.map(t => ({
    label: t.name, farbe: 'var(--s1)',
    wert: alle.reduce((s, b) => s + b.notizen.filter(n => n.themaId === t.id).length, 0)
  })).filter(x => x.wert > 0).sort((a, b) => b.wert - a.wert);
  if (nachThema.length) {
    const top = nachThema.slice(0, 8);
    const rest = nachThema.slice(8).reduce((s, x) => s + x.wert, 0);
    if (rest) top.push({ label: 'Weitere ' + (nachThema.length - 8), wert: rest, farbe: 'var(--text-3)' });
    wrap.appendChild(karte('Notizen nach Themenfeld', 'Buchübergreifend – das sind die Fäden, an denen du ziehst.',
      balken(top), '', tabelleHtml(['Themenfeld', 'Notizen'], nachThema.map(x => [x.label, x.wert]))));
  }
}
