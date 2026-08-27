/* ============================================================
   Themenfelder über alle Bücher hinweg
   ============================================================ */
let notizenUnter = 'themen';

function notizenTabMalen(root) {
  const unter = [['themen', 'Themenfelder'], ['arten', 'Arten'], ['alle', 'Alle Notizen'], ['galerie', 'Galerie']];
  root.innerHTML = `
    <div class="chiprow">
      ${unter.map(([k, l]) => `<button class="chip" data-unter="${k}" aria-pressed="${notizenUnter === k}">${l}</button>`).join('')}
    </div>
    <div id="notizenInhalt" style="margin-top:14px"></div>`;
  $$('[data-unter]', root).forEach(c => c.onclick = () => { notizenUnter = c.dataset.unter; viewMalen(); });

  const ziel = $('#notizenInhalt', root);
  if (notizenUnter === 'themen') gruppenGlobal(ziel, 'thema');
  else if (notizenUnter === 'arten') gruppenGlobal(ziel, 'art');
  else if (notizenUnter === 'alle') alleNotizenGlobal(ziel);
  else galerieGlobal(ziel);
}

/* Themenfelder oder Arten über alle Bücher hinweg. */
function gruppenGlobal(root, art) {
  const nachThema = art === 'thema';
  const zaehl = new Map();
  alleNotizen().forEach(({ buch, notiz }) => {
    const k = (nachThema ? notiz.themaId : notiz.artId) || '__ohne';
    if (!zaehl.has(k)) zaehl.set(k, { n: 0, buecher: new Set() });
    const e = zaehl.get(k); e.n++; e.buecher.add(buch.id);
  });
  const liste = Array.from(zaehl.entries()).map(([k, v]) => ({
    id: k === '__ohne' ? null : k,
    name: k === '__ohne' ? (nachThema ? 'Ohne Themenfeld' : 'Ohne Art') : (nachThema ? themaName(k) : artName(k)),
    farbe: (!nachThema && k !== '__ohne') ? artFarbe(k) : null,
    n: v.n, b: v.buecher.size
  })).sort((a, b) => b.n - a.n);

  root.innerHTML = `
    <div class="section">
      <div class="section-head">
        <h2>${nachThema ? 'Themenfelder' : 'Arten'}</h2>
        <button class="btn btn-sm btn-ghost" data-verwalten>Verwalten</button>
      </div>
      ${liste.length ? '<div data-liste></div>' : `<div class="empty"><strong>Noch nichts da</strong>${nachThema
      ? 'Gib deinen Notizen ein Themenfeld – dann laufen hier die Fäden aus allen Büchern zusammen.'
      : 'Sobald Notizen eine Art tragen, sammeln sie sich hier über alle Bücher.'}</div>`}
    </div>`;
  $('[data-verwalten]', root).onclick = nachThema ? themenVerwalten : artenVerwalten;

  const l = $('[data-liste]', root);
  if (!l) return;
  liste.forEach(t => {
    const row = document.createElement('button');
    row.className = 'grouprow';
    row.innerHTML = `
      ${t.farbe ? `<span class="swatch" style="width:11px;height:11px;border-radius:4px;background:${t.farbe};flex:0 0 auto"></span>` : ''}
      <span class="grow">
        <span class="gname">${esc(t.name)}</span>
        <span class="gmeta">${pl(t.n, 'Notiz', 'Notizen')} aus ${pl(t.b, 'Buch', 'Büchern')}</span>
      </span><span class="count num">${t.n}</span><span class="chev">${ICON.chev}</span>`;
    row.onclick = () => sammlungOeffnen(t.name, nachThema
      ? n => (n.themaId || null) === t.id
      : n => (n.artId || null) === t.id);
    l.appendChild(row);
  });
}

/* Alle Notizen aller Bücher, nach Buch und Seite. */
function alleNotizenGlobal(root) {
  const gesamt = alleNotizen().length;
  root.innerHTML = `
    <div class="section">
      <div class="section-head"><h2>Alle Notizen</h2><span class="eyebrow">${gesamt}</span></div>
      <div data-l></div>
    </div>`;
  const l = $('[data-l]', root);
  if (!gesamt) {
    l.innerHTML = `<div class="empty"><strong>Noch keine Notizen</strong>Öffne ein Buch und schreib die erste.</div>`;
    return;
  }
  buecherNachPlan().forEach(b => {
    if (!b.notizen.length) return;
    const h = document.createElement('div');
    h.className = 'section-head';
    h.style.margin = '16px 0 8px';
    h.innerHTML = `<h2 class="serif" style="font-weight:600">${esc(b.titel)}</h2><span class="eyebrow">${pl(b.notizen.length, 'Notiz', 'Notizen')}</span>`;
    l.appendChild(h);
    b.notizen.slice().sort((a, c) => seiteZahl(a.seite) - seiteZahl(c.seite))
      .forEach(n => l.appendChild(notizKarte(b, n, () => viewMalen())));
  });
}

/* Alle Fotos aller Bücher. */
function galerieGlobal(root) {
  const bilder = [];
  buecherNachPlan().forEach(b => {
    b.notizen.slice().sort((a, c) => seiteZahl(a.seite) - seiteZahl(c.seite))
      .forEach(n => n.bilder.forEach(x => bilder.push({ src: x.src, seite: n.seite, notiz: n, buch: b })));
  });
  root.innerHTML = `
    <div class="section">
      <div class="section-head"><h2>Galerie</h2><span class="eyebrow">${pl(bilder.length, 'Foto', 'Fotos')}</span></div>
      ${bilder.length ? '<div class="gal" data-g></div>' : `<div class="empty"><strong>Noch keine Fotos</strong>Alle abfotografierten Seiten aus allen Büchern landen hier.</div>`}
    </div>`;
  const g = $('[data-g]', root);
  if (!g) return;
  bilder.forEach((bi, i) => {
    const btn = document.createElement('button');
    btn.innerHTML = `<img src="${bi.src}" alt="Foto aus ${esc(bi.buch.titel)}">
      <span class="cap">${bi.seite ? 'S. ' + esc(seiteText(bi.seite)) : ''}</span>`;
    btn.onclick = () => bildGrossMitNotiz(bi.buch, bilder, i, () => viewMalen());
    g.appendChild(btn);
  });
}

/* Notizen aus allen Büchern, die einem Filter entsprechen. */
function sammlungOeffnen(name, passt) {
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">${esc(name)}</div><div class="ovl-sub">alle Bücher</div></div>
    </div>
    <div class="ovl-body" style="padding:12px 14px 40px" data-liste></div>`;
  const malen = () => {
    const l = $('[data-liste]', node);
    l.innerHTML = '';
    const nachBuch = new Map();
    alleNotizen().filter(x => passt(x.notiz)).forEach(x => {
      if (!nachBuch.has(x.buch.id)) nachBuch.set(x.buch.id, []);
      nachBuch.get(x.buch.id).push(x.notiz);
    });
    if (!nachBuch.size) { l.innerHTML = `<div class="empty"><strong>Leer</strong>Hier gibt es keine Notiz mehr.</div>`; return; }
    nachBuch.forEach((notizen, buchId) => {
      const b = buchById(buchId);
      const h = document.createElement('div');
      h.className = 'section-head';
      h.style.margin = '14px 0 8px';
      h.innerHTML = `<h2 class="serif" style="font-weight:600">${esc(b.titel)}</h2><span class="eyebrow">${esc(b.autor)}</span>`;
      l.appendChild(h);
      notizen.sort((a, c) => seiteZahl(a.seite) - seiteZahl(c.seite))
        .forEach(n => l.appendChild(notizKarte(b, n, malen)));
    });
  };
  $('[data-back]', node).onclick = () => layerSchliessen();
  layerOeffnen(node, () => viewMalen());
  malen();
}

function themenVerwalten() {
  const s = blatt('Themenfelder verwalten', '<div data-l></div>', { fokus: false });
  const malen = () => {
    const l = $('[data-l]', s);
    const benutzt = id => alleNotizen().filter(x => x.notiz.themaId === id).length;
    l.innerHTML = DB.themen.length
      ? `<div class="list-card">${DB.themen.map(t => `
          <div class="rowline">
            <span class="grow"><span class="rn">${esc(t.name)}</span><span class="rm">${benutzt(t.id)} Notizen</span></span>
            <button class="icon-btn" data-um="${t.id}" aria-label="Umbenennen">${ICON.edit}</button>
            <button class="icon-btn" data-del="${t.id}" aria-label="Löschen">${ICON.trash}</button>
          </div>`).join('')}</div>`
      : `<p class="hinweis">Noch keine Themenfelder. Sie entstehen beim Schreiben einer Notiz.</p>`;
    l.insertAdjacentHTML('beforeend', `<button class="btn btn-block" style="margin-top:12px" data-neu>${ICON.plus} Themenfeld anlegen</button>
      <p class="hinweis">Beim Umbenennen auf einen bereits vorhandenen Namen werden beide Themenfelder zusammengeführt.</p>`);

    $$('[data-um]', l).forEach(btn => btn.onclick = () => {
      const t = themaById(btn.dataset.um);
      const s2 = blatt('Umbenennen', `<div class="field"><input type="text" data-n value="${esc(t.name)}"></div>
        <button class="btn btn-primary btn-block" data-ok>Sichern</button>`);
      $('[data-ok]', s2).onclick = () => {
        const neu = $('[data-n]', s2).value.trim();
        if (!neu) return;
        aendern(() => {
          const ziel = DB.themen.find(x => x.id !== t.id && x.name.toLowerCase() === neu.toLowerCase());
          if (ziel) {
            DB.buecher.forEach(b => b.notizen.forEach(n => { if (n.themaId === t.id) n.themaId = ziel.id; }));
            DB.themen = DB.themen.filter(x => x.id !== t.id);
          } else t.name = neu;
        });
        layerSchliessen(); malen(); viewMalen();
      };
    });
    $$('[data-del]', l).forEach(btn => btn.onclick = async () => {
      const t = themaById(btn.dataset.del);
      const ok = await bestaetigen('Themenfeld löschen?', `„${esc(t.name)}“ verschwindet. Die ${benutzt(t.id)} Notizen bleiben erhalten und stehen dann unter „Ohne Themenfeld“.`, 'Löschen', true);
      if (!ok) return;
      aendern(() => {
        DB.buecher.forEach(b => b.notizen.forEach(n => { if (n.themaId === t.id) n.themaId = null; }));
        DB.themen = DB.themen.filter(x => x.id !== t.id);
      });
      malen(); viewMalen();
    });
    $('[data-neu]', l).onclick = () => {
      const s2 = blatt('Neues Themenfeld', `<div class="field"><input type="text" data-n placeholder="z.B. Entfremdung"></div>
        <button class="btn btn-primary btn-block" data-ok>Anlegen</button>`);
      $('[data-ok]', s2).onclick = () => {
        const n = $('[data-n]', s2).value.trim();
        if (!n) return;
        aendern(() => themaFindenOderAnlegen(n));
        layerSchliessen(); malen(); viewMalen();
      };
    };
  };
  malen();
}

/* ============================================================
   Suche über alles
   ============================================================ */
function sucheOeffnen() {
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><input type="text" data-q placeholder="Bücher, Autoren, Notizen, Themen …" autocomplete="off"></div>
    </div>
    <div class="ovl-body" style="padding:12px 14px 40px" data-erg>
      <p class="hinweis">Tippe los. Gesucht wird in Titeln, Autoren, Beschreibungen, Notizen und Themenfeldern.</p>
    </div>`;
  const erg = $('[data-erg]', node);
  const suchen = () => {
    const q = $('[data-q]', node).value.trim().toLowerCase();
    if (q.length < 2) { erg.innerHTML = `<p class="hinweis">Mindestens zwei Zeichen.</p>`; return; }
    const buecher = DB.buecher.filter(b =>
      [b.titel, b.autor, b.beschreibung, b.ausgabe].some(x => (x || '').toLowerCase().includes(q)));
    const notizen = alleNotizen().filter(({ notiz }) =>
      (notiz.text || '').toLowerCase().includes(q) || themaName(notiz.themaId).toLowerCase().includes(q));
    erg.innerHTML = '';
    if (!buecher.length && !notizen.length) { erg.innerHTML = `<div class="empty"><strong>Nichts gefunden</strong>Für „${esc(q)}“ gibt es keinen Treffer.</div>`; return; }
    if (buecher.length) {
      erg.insertAdjacentHTML('beforeend', `<div class="eyebrow" style="margin:4px 0 8px">${buecher.length} ${buecher.length === 1 ? 'Buch' : 'Bücher'}</div>`);
      buecher.slice(0, 30).forEach(b => {
        const r = document.createElement('button');
        r.className = 'grouprow';
        r.innerHTML = `<span class="grow"><span class="gname serif">${esc(b.titel)}</span><span class="gmeta">${esc(b.autor)}${b.jahr != null ? ' · ' + esc(jahrText(b.jahr)) : ''}</span></span><span class="chev">${ICON.chev}</span>`;
        r.onclick = () => buchOeffnen(b.id);
        erg.appendChild(r);
      });
    }
    if (notizen.length) {
      erg.insertAdjacentHTML('beforeend', `<div class="eyebrow" style="margin:16px 0 8px">${notizen.length} ${notizen.length === 1 ? 'Notiz' : 'Notizen'}</div>`);
      notizen.slice(0, 40).forEach(({ buch, notiz }) => {
        const k = notizKarte(buch, notiz, suchen);
        k.insertAdjacentHTML('afterbegin', `<div class="eyebrow" style="margin-bottom:6px">${esc(buch.titel)}</div>`);
        erg.appendChild(k);
      });
    }
  };
  let t;
  $('[data-q]', node).oninput = () => { clearTimeout(t); t = setTimeout(suchen, 180); };
  $('[data-back]', node).onclick = () => layerSchliessen();
  layerOeffnen(node);
  setTimeout(() => $('[data-q]', node).focus(), 80);
}

