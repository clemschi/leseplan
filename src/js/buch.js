/* ============================================================
   Buchansicht: wischen zwischen Beschreibung, Themen, Arten, Lesen
   ============================================================ */
const SEITEN = [
  { id: 'beschreibung', label: 'Beschreibung' },
  { id: 'autor', label: 'Autor' },
  { id: 'themen', label: 'Themenfelder' },
  { id: 'arten', label: 'Arten' },
  { id: 'notizen', label: 'Alle Notizen' },
  { id: 'galerie', label: 'Galerie' }
];

function buchOeffnen(buchId, startSeite) {
  const b = buchById(buchId);
  if (!b) return;
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back aria-label="Zurück">${ICON.back}</button>
      <div class="grow">
        <div class="ovl-title serif" data-t></div>
        <div class="ovl-sub" data-s></div>
      </div>
      <button class="status-btn" data-status aria-label="Status ändern"></button>
      <button class="icon-btn" data-edit aria-label="Buch bearbeiten">${ICON.edit}</button>
    </div>
    <div class="pagertabs">${SEITEN.map((s, i) => `<button data-go="${i}" aria-selected="${i === 0}">${s.label}</button>`).join('')}</div>
    <div class="pager">${SEITEN.map(s => `<section class="page" data-page="${s.id}"></section>`).join('')}</div>`;

  const pager = $('.pager', node);
  const tabs = $$('[data-go]', node);

  const kopf = () => {
    const blk = blockById(b.blockId);
    $('[data-t]', node).textContent = b.titel;
    $('[data-s]', node).textContent = [b.autor, blk && blk.name].filter(Boolean).join(' · ');
    const st = $('[data-status]', node);
    st.dataset.status = b.status;
    st.title = STATUS[b.status];
    st.innerHTML = b.status === 'gelesen' ? ICON.check : b.status === 'lese' ? ICON.read : '';
  };
  const allesMalen = () => {
    kopf();
    seiteBeschreibung(b, $('[data-page="beschreibung"]', node), allesMalen);
    seiteAutor(b, $('[data-page="autor"]', node), allesMalen);
    seiteGruppen(b, $('[data-page="themen"]', node), 'thema', allesMalen);
    seiteGruppen(b, $('[data-page="arten"]', node), 'art', allesMalen);
    seiteAlleNotizen(b, $('[data-page="notizen"]', node), allesMalen);
    seiteGalerie(b, $('[data-page="galerie"]', node), allesMalen);
    viewMalen();
  };

  $('[data-back]', node).onclick = () => layerSchliessen();
  $('[data-edit]', node).onclick = () => buchBearbeiten(b, b.blockId, allesMalen);
  $('[data-status]', node).onclick = () => {
    const folge = { offen: 'lese', lese: 'gelesen', gelesen: 'offen' };
    aendern(() => { b.status = folge[b.status] || 'offen'; });
    allesMalen();
    toast(STATUS[b.status]);
  };
  /* Der Reiter folgt dem Wischen sofort – kein Nachlaufen. */
  let aktiveSeite = 0;
  const reiterSetzen = i => {
    if (i === aktiveSeite) return;
    aktiveSeite = i;
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    const akt = tabs[i];
    if (akt) akt.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  };
  tabs.forEach((t, i) => t.onclick = () => {
    reiterSetzen(i);
    pager.scrollTo({ left: pager.clientWidth * i, behavior: 'smooth' });
  });
  pager.addEventListener('scroll', () => {
    reiterSetzen(Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth)));
  }, { passive: true });

  layerOeffnen(node);
  allesMalen();
  if (startSeite) {
    const i = SEITEN.findIndex(s => s.id === startSeite);
    if (i > 0) requestAnimationFrame(() => { pager.scrollLeft = pager.clientWidth * i; tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i))); });
  }
}

/* ---------- Seite 1: Beschreibung und Daten ---------- */
function seiteBeschreibung(b, root, neuMalen) {
  const min = buchMinuten(b), tempo = buchTempo(b);
  const lebt = lebensdaten(b.autorGeb, b.autorGest);
  const tLauf = laufenderTimer();
  const laeuftHier = !!(tLauf && tLauf.buchId === b.id);
  root.innerHTML = `
    ${b.beschreibung
      ? `<p class="desc">${esc(b.beschreibung).replace(/\n/g, '<br>')}</p>`
      : `<div class="empty" style="margin:0"><strong>Noch keine Beschreibung</strong>Schreib in zwei, drei Sätzen auf, worum es geht – das steht dann immer als Erstes hier.</div>`}
    <div style="margin-top:12px"><button class="btn btn-sm" data-edit-desc>${ICON.edit} Beschreibung ${b.beschreibung ? 'ändern' : 'schreiben'}</button></div>

    <div class="factgrid">
      <div class="fact"><div class="k">Erschienen</div><div class="v" style="${b.jahr != null && b.jahr < 0 ? 'font-size:12.5px' : ''}">${esc(jahrText(b.jahr))}</div></div>
      <div class="fact"><div class="k">Seiten</div><div class="v">${b.seiten != null ? (b.seitenUnsicher ? '~' : '') + b.seiten : '–'}</div></div>
      <div class="fact"><div class="k">Preis</div><div class="v">${b.preis != null ? fmtGeld(b.preis) : '–'}</div></div>
      <div class="fact"><div class="k">Besitz</div><div class="v" style="font-size:12.5px;color:${(BESITZ[b.besitz] || BESITZ.fehlt).farbe}">${esc((BESITZ[b.besitz] || BESITZ.fehlt).name)}</div></div>
      <div class="fact"><div class="k">Autor</div><div class="v" style="font-size:12.5px">${lebt ? esc(String(lebt)) : '–'}</div></div>
      <div class="fact"><div class="k">Lesezeit</div><div class="v">${min ? fmtDauer(min) : '–'}</div></div>
      <div class="fact"><div class="k">Tempo</div><div class="v">${tempo ? fmtZahl(tempo) + ' <small>S./h</small>' : '–'}</div></div>
      <div class="fact"><div class="k">Notizen</div><div class="v">${b.notizen.length}</div></div>
      <div class="fact"><div class="k">Status</div><div class="v" style="font-size:12.5px">${STATUS[b.status]}</div></div>
      <div class="fact"><div class="k">Schwierigkeit</div><div class="v" style="font-size:12.5px">${b.schwierigkeit ? stufeHtml(b.schwierigkeit) + ' <small>' + esc(STUFEN[b.schwierigkeit]) + '</small>' : '–'}</div></div>
    </div>
    ${b.ausgabe ? `<p class="muted" style="font-size:12px;margin-top:10px">Ausgabe: ${esc(b.ausgabe)}</p>` : ''}
    ${b.link ? `<p style="font-size:12px;margin-top:8px"><a href="${esc(b.link)}" target="_blank" rel="noopener noreferrer"
      style="color:var(--accent);word-break:break-all">${esc(b.link)}</a></p>` : ''}
    ${b.kurz ? `<p class="muted" style="font-size:12.5px;margin-top:10px;font-family:'Literata',Georgia,serif">In Kürze: ${esc(b.kurz)}</p>` : ''}
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-primary" data-neu-notiz style="flex:1">${ICON.plus} Notiz anlegen</button>
      <button class="btn" data-alle-notizen>Alle Notizen (${b.notizen.length})</button>
    </div>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn" data-lesen style="flex:1">${laeuftHier ? ICON.pause + ' Sitzung beenden' : ICON.play + ' Sitzung starten'}</button>
      <button class="btn" data-sitzungen>Sitzungen (${b.sessions.length})</button>
    </div>`;
  $('[data-edit-desc]', root).onclick = () => beschreibungBearbeiten(b, neuMalen);
  $('[data-neu-notiz]', root).onclick = () => notizBearbeiten(b, null, {}, neuMalen);
  $('[data-alle-notizen]', root).onclick = () => notizListe(b, { alle: true }, neuMalen);
  $('[data-lesen]', root).onclick = () => { laeuftHier ? sitzungBeenden() : sitzungStarten(b.id); neuMalen(); };
  $('[data-sitzungen]', root).onclick = () => sitzungenOeffnen(b, neuMalen);
}

/* Stoppuhr, Sitzungen und Lesetempo eines Buches als eigene Ansicht. */
function sitzungenOeffnen(b, neuMalen) {
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Lesen</div><div class="ovl-sub">${esc(b.titel)}</div></div>
    </div>
    <div class="ovl-body" style="padding:14px 14px 40px" data-body></div>`;
  const malen = () => {
    seiteLesen(b, $('[data-body]', node), () => { malen(); if (neuMalen) neuMalen(); });
  };
  $('[data-back]', node).onclick = () => layerSchliessen();
  layerOeffnen(node, () => { if (neuMalen) neuMalen(); });
  malen();
}

function beschreibungBearbeiten(b, neuMalen) {
  const s = blatt('Beschreibung', `
    <div class="field">
      <label>Worum geht es?</label>
      <textarea data-t style="min-height:180px;font-family:'Literata',Georgia,serif;line-height:1.65">${esc(b.beschreibung || '')}</textarea>
      <span class="hint">Diese Sätze stehen als Erstes, wenn du das Buch öffnest.</span>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`);
  $('[data-ok]', s).onclick = () => {
    aendern(() => { b.beschreibung = $('[data-t]', s).value.trim(); });
    layerSchliessen(); neuMalen();
  };
}

/* ---------- Seite Autor ---------- */
function seiteAutor(b, root, neuMalen) {
  const liste = buchAutoren(b);
  root.innerHTML = liste.length ? '' :
    `<div class="empty" style="margin:0"><strong>Kein Autor eingetragen</strong>Trag ihn im Buch unter „Bearbeiten“ nach.</div>`;

  liste.forEach((a, i) => {
    const lebt = lebensdaten(a.geb, a.gest);
    const weitere = DB.buecher.filter(x => x.id !== b.id && buchAutoren(x).some(y => y.name === a.name));
    const abschnitt = document.createElement('div');
    abschnitt.style.marginBottom = '22px';
    abschnitt.innerHTML = `
      <div class="section-head" style="padding:0;${i ? 'border-top:1px solid var(--border);padding-top:16px;' : ''}">
        <h2 class="serif" style="font-size:17px;font-weight:600">${esc(a.name)}</h2>
        ${lebt ? `<span class="eyebrow num">${esc(lebt)}</span>` : ''}
      </div>
      ${a.bio
        ? `<p class="desc" style="margin-top:10px">${esc(a.bio).replace(/\n/g, '<br>')}</p>`
        : `<div class="empty" style="margin:12px 0 0"><strong>Noch keine Biographie</strong>Ein paar Sätze zum Leben – wer war das, und woraus kommt dieses Buch?</div>`}
      ${a.einfluss.length ? `<div class="einfluss" style="margin-top:12px">
        <div><div class="eg">Beeinflusst von</div><div class="er">${a.einfluss.map(n => `<span class="en">${esc(n)}</span>`).join('')}</div></div>
      </div>` : ''}
      <div style="margin-top:12px"><button class="btn btn-sm" data-bio>${ICON.edit} Biographie &amp; Einfluss</button></div>
      ${weitere.length ? `<div class="section-head" style="padding:0;margin:18px 0 9px">
        <h2>Weitere Werke in deinen Listen</h2><span class="eyebrow">${weitere.length}</span></div>
        <div data-weitere></div>` : ''}`;

    $('[data-bio]', abschnitt).onclick = () => autorBearbeiten(a, neuMalen);
    const w = $('[data-weitere]', abschnitt);
    if (w) weitere.forEach(x => {
      const r = document.createElement('button');
      r.className = 'grouprow';
      r.innerHTML = `<span class="grow">
          <span class="gname serif">${esc(x.titel)}</span>
          <span class="gmeta">${x.jahr != null ? esc(jahrText(x.jahr)) + ' · ' : ''}${STATUS[x.status]}</span>
        </span><span class="chev">${ICON.chev}</span>`;
      r.onclick = () => { layerSchliessen(); setTimeout(() => buchOeffnen(x.id), 80); };
      w.appendChild(r);
    });
    root.appendChild(abschnitt);
  });
}

/* ---------- Seiten 2 und 3: Themenfelder und Arten ---------- */
function seiteGruppen(b, root, art, neuMalen) {
  const nachThema = art === 'thema';
  const map = new Map();
  b.notizen.forEach(n => {
    const key = (nachThema ? n.themaId : n.artId) || '__ohne';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  });
  const gruppen = Array.from(map.entries()).sort((a, c) => c[1].length - a[1].length);

  root.innerHTML = `
    <div class="section-head" style="padding:0">
      <h2>${nachThema ? 'Themenfelder in diesem Buch' : 'Notizen nach Art'}</h2>
      <button class="btn btn-sm" data-neu>${ICON.plus} Notiz</button>
    </div>
    ${gruppen.length ? '' : `<div class="empty" style="margin:8px 0 0"><strong>Noch keine Notizen</strong>${nachThema
      ? 'Sobald du Notizen anlegst und ihnen ein Themenfeld gibst, sammeln sie sich hier.'
      : 'Zitat, Gedanke, Frage, Kritik – hier liegen sie später nach Art sortiert.'}</div>`}
    <div data-liste style="margin-top:10px"></div>`;

  const liste = $('[data-liste]', root);
  gruppen.forEach(([key, notizen]) => {
    const ohne = key === '__ohne';
    const name = ohne ? (nachThema ? 'Ohne Themenfeld' : 'Ohne Art') : (nachThema ? themaName(key) : artName(key));
    const farbe = !nachThema && !ohne ? artFarbe(key) : null;
    const seiten = notizen.map(n => seiteZahl(n.seite)).filter(x => isFinite(x)).sort((a, c) => a - c);
    const row = document.createElement('button');
    row.className = 'grouprow';
    row.innerHTML = `
      ${farbe ? `<span class="chip" style="border-color:${farbe};color:${farbe};background:transparent;padding:3px 9px"><span class="swatch" style="background:${farbe}"></span></span>` : ''}
      <span class="grow">
        <span class="gname">${esc(name)}</span>
        <span class="gmeta">${notizen.length} ${notizen.length === 1 ? 'Notiz' : 'Notizen'}${seiten.length ? ' · S. ' + seiten[0] + (seiten.length > 1 ? '–' + seiten[seiten.length - 1] : '') : ''}</span>
      </span>
      <span class="count num">${notizen.length}</span>
      <span class="chev">${ICON.chev}</span>`;
    row.onclick = () => notizListe(b, nachThema ? { themaId: ohne ? null : key } : { artId: ohne ? null : key }, neuMalen);
    liste.appendChild(row);
  });

  $('[data-neu]', root).onclick = () => notizBearbeiten(b, null, {}, neuMalen);
}

/* ---------- Seite 4: alle Notizen, nach Seitenzahl ---------- */
function seiteAlleNotizen(b, root, neuMalen) {
  const notizen = b.notizen.slice().sort((a, c) => seiteZahl(a.seite) - seiteZahl(c.seite));
  root.innerHTML = `
    <div class="section-head" style="padding:0">
      <h2>Alle Notizen (${b.notizen.length})</h2>
      <button class="btn btn-sm" data-neu>${ICON.plus} Notiz</button>
    </div>
    ${notizen.length ? '' : `<div class="empty" style="margin:8px 0 0"><strong>Noch keine Notizen</strong>Hier stehen später alle Notizen dieses Buches, nach Seitenzahl gereiht.</div>`}
    <div data-l style="margin-top:10px"></div>`;
  const l = $('[data-l]', root);
  notizen.forEach(n => l.appendChild(notizKarte(b, n, neuMalen)));
  $('[data-neu]', root).onclick = () => notizBearbeiten(b, null, {}, neuMalen);
}

/* ---------- Seite 5: alle Fotos des Buches ---------- */
function seiteGalerie(b, root, neuMalen) {
  const bilder = [];
  b.notizen.slice().sort((a, c) => seiteZahl(a.seite) - seiteZahl(c.seite))
    .forEach(n => n.bilder.forEach(x => bilder.push({ id: x.id, src: x.src, seite: n.seite, notiz: n })));
  root.innerHTML = `
    <div class="section-head" style="padding:0">
      <h2>Galerie (${pl(bilder.length, 'Foto', 'Fotos')})</h2>
      ${bilder.length ? `<span class="eyebrow">aus ${pl(b.notizen.filter(n => n.bilder.length).length, 'Notiz', 'Notizen')}</span>` : ''}
    </div>
    ${bilder.length
      ? `<div class="gal" data-g style="margin-top:10px"></div>
         <p class="hinweis">Tippen zeigt das Foto groß; von dort geht es zur Notiz.</p>`
      : `<div class="empty" style="margin:8px 0 0"><strong>Noch keine Fotos</strong>Fotografiere in einer Notiz eine Seite ab – alle Bilder des Buches sammeln sich hier.</div>`}`;

  const g = $('[data-g]', root);
  if (!g) return;
  bilder.forEach((bi, i) => {
    const btn = document.createElement('button');
    btn.innerHTML = `<img src="${bi.src}" alt="Foto${bi.seite ? ' zu Seite ' + esc(seiteText(bi.seite)) : ''}">
      ${bi.seite ? `<span class="cap">S. ${esc(seiteText(bi.seite))}</span>` : ''}`;
    btn.onclick = () => bildGrossMitNotiz(b, bilder, i, neuMalen);
    g.appendChild(btn);
  });
}

/* Großansicht aus der Galerie, mit Sprung zur zugehörigen Notiz. */
function bildGrossMitNotiz(buch, bilder, start, neuMalen) {
  let i = start;
  const node = document.createElement('div');
  node.className = 'lightbox';
  node.innerHTML = `<img alt="Foto">
    <div class="lb-bar">
      <button class="btn btn-sm btn-ghost" data-prev>Zurück</button>
      <span class="num" data-z></span>
      <span style="display:flex;gap:8px">
        <button class="btn btn-sm" data-notiz>Zur Notiz</button>
        <button class="btn btn-sm" data-next>Weiter</button>
        <button class="btn btn-sm btn-ghost" data-zu>Schließen</button>
      </span>
    </div>`;
  const malen = () => {
    $('img', node).src = bilder[i].src;
    $('[data-z]', node).textContent = (i + 1) + ' / ' + bilder.length + (bilder[i].seite ? '  ·  S. ' + seiteText(bilder[i].seite) : '');
  };
  layerOeffnen(node);
  malen();
  $('[data-prev]', node).onclick = () => { i = (i - 1 + bilder.length) % bilder.length; malen(); };
  $('[data-next]', node).onclick = () => { i = (i + 1) % bilder.length; malen(); };
  $('[data-zu]', node).onclick = () => layerSchliessen();
  /* Erst schliessen, dann öffnen – aber nicht im selben Zug: das popstate des
     Schliessens käme sonst hinterher und räumte die eben geöffnete Notiz weg. */
  $('[data-notiz]', node).onclick = () => {
    const n = bilder[i].notiz;
    layerSchliessen();
    setTimeout(() => notizBearbeiten(buch, n, {}, neuMalen), 80);
  };
}

/* ---------- Notizliste einer Gruppe ---------- */
function notizListe(b, filter, neuMalen) {
  const node = document.createElement('div');
  node.className = 'overlay';
  const titel = filter.alle ? 'Alle Notizen'
    : ('themaId' in filter) ? (filter.themaId ? themaName(filter.themaId) : 'Ohne Themenfeld')
      : (filter.artId ? artName(filter.artId) : 'Ohne Art');
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">${esc(titel)}</div><div class="ovl-sub">${esc(b.titel)}</div></div>
      <button class="icon-btn" data-neu>${ICON.plus}</button>
    </div>
    <div class="ovl-body" style="padding:12px 14px 40px" data-liste></div>`;

  const passt = n => filter.alle ? true
    : ('themaId' in filter) ? ((n.themaId || null) === filter.themaId)
      : ((n.artId || null) === filter.artId);

  const malen = () => {
    const liste = $('[data-liste]', node);
    const notizen = b.notizen.filter(passt).sort((a, c) => seiteZahl(a.seite) - seiteZahl(c.seite));
    liste.innerHTML = notizen.length ? '' : `<div class="empty"><strong>Leer</strong>Hier ist noch keine Notiz.</div>`;
    notizen.forEach(n => liste.appendChild(notizKarte(b, n, () => { malen(); if (neuMalen) neuMalen(); })));
    if (neuMalen) neuMalen();
  };

  $('[data-back]', node).onclick = () => layerSchliessen();
  $('[data-neu]', node).onclick = () => notizBearbeiten(b, null, {
    themaId: 'themaId' in filter ? filter.themaId : undefined,
    artId: 'artId' in filter ? filter.artId : undefined
  }, malen);

  layerOeffnen(node);
  malen();
}

function notizKarte(b, n, neuMalen) {
  const node = document.createElement('div');
  node.className = 'note';
  const istZitat = artName(n.artId).toLowerCase() === 'zitat';
  node.innerHTML = `
    <div class="note-top">
      ${n.seite ? `<span class="note-page">S. ${esc(seiteText(n.seite))}</span>` : ''}
      ${n.artId ? `<span class="arttag" style="background:color-mix(in srgb,${artFarbe(n.artId)} 20%,transparent);color:${artFarbe(n.artId)}">${esc(artName(n.artId))}</span>` : ''}
      ${n.themaId ? `<span class="themetag">${esc(themaName(n.themaId))}</span>` : ''}
      <span style="flex:1"></span>
      <button class="icon-btn" data-edit style="width:28px;height:28px">${ICON.edit}</button>
    </div>
    <div class="note-text ${istZitat ? 'quote' : ''}">${esc(n.text) || '<span style="color:var(--text-3)">(kein Text)</span>'}</div>
    ${n.bilder.length ? `<div class="note-thumbs">${n.bilder.map((x, i) => `<img src="${x.src}" data-bild="${i}" alt="Foto ${i + 1}">`).join('')}</div>` : ''}`;
  $('[data-edit]', node).onclick = () => notizBearbeiten(b, n, {}, neuMalen);
  $$('[data-bild]', node).forEach(im => im.onclick = () => bildGross(n.bilder, +im.dataset.bild, null));
  return node;
}

/* ---------- Notiz anlegen und bearbeiten ---------- */
function notizBearbeiten(b, notiz, vorgabe, neuMalen) {
  const neu = !notiz;
  const n = notiz || {
    id: uid(), seite: null,
    themaId: vorgabe.themaId !== undefined ? vorgabe.themaId : null,
    artId: vorgabe.artId !== undefined ? vorgabe.artId : (DB.arten[0] ? DB.arten[0].id : null),
    text: '', bilder: [], erstellt: Date.now(), geaendert: Date.now()
  };
  const bilder = n.bilder.slice();
  let artId = n.artId;

  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">${neu ? 'Neue Notiz' : 'Notiz'}</div><div class="ovl-sub">${esc(b.titel)}</div></div>
      ${neu ? '' : `<button class="icon-btn" data-del>${ICON.trash}</button>`}
      <button class="btn btn-primary btn-sm" data-ok>Sichern</button>
    </div>
    <div class="ovl-body" style="padding:14px 14px 40px">
      <div class="grid2">
        <div class="field"><label>Seite</label>
          <input type="text" inputmode="text" data-seite value="${esc(seiteText(n.seite))}" placeholder="42 oder 35-36">
        </div>
        <div class="field"><label>Themenfeld</label>
          <input type="text" data-thema list="themenListe" value="${esc(n.themaId ? themaName(n.themaId) : '')}" placeholder="z.B. Entfremdung">
        </div>
      </div>
      <datalist id="themenListe">${DB.themen.map(t => `<option value="${esc(t.name)}">`).join('')}</datalist>
      <div class="field">
        <label>Art</label>
        <div style="display:flex;gap:7px;flex-wrap:wrap" data-arten></div>
      </div>
      <div class="field">
        <label>Text</label>
        <textarea data-text style="min-height:150px;font-family:'Literata',Georgia,serif;line-height:1.65" placeholder="Zitat, Gedanke, Frage …">${esc(n.text)}</textarea>
      </div>
      <div class="field">
        <label>Fotos</label>
        <div class="shots" data-shots></div>
      </div>
    </div>`;

  const artenMalen = () => {
    const wrap = $('[data-arten]', node);
    wrap.innerHTML = DB.arten.map(a =>
      `<button class="chip" data-art="${a.id}" aria-pressed="${a.id === artId}" style="${a.id === artId ? `border-color:var(--${a.farbe});color:var(--${a.farbe});background:color-mix(in srgb,var(--${a.farbe}) 15%,transparent)` : ''}">
        <span class="swatch" style="background:var(--${a.farbe})"></span>${esc(a.name)}</button>`).join('')
      + `<button class="chip" data-neue-art>${ICON.plus} Art</button>`;
    $$('[data-art]', wrap).forEach(x => x.onclick = () => { artId = (artId === x.dataset.art) ? null : x.dataset.art; artenMalen(); });
    $('[data-neue-art]', wrap).onclick = () => {
      const s = blatt('Neue Art', `
        <div class="field"><label>Name</label><input type="text" data-n placeholder="z.B. Sonstiges"></div>
        <button class="btn btn-primary btn-block" data-ok>Anlegen</button>`);
      $('[data-ok]', s).onclick = () => {
        const name = $('[data-n]', s).value.trim();
        if (!name) return;
        const a = { id: uid(), name, farbe: ART_FARBEN[DB.arten.length % 8] };
        aendern(() => DB.arten.push(a));
        artId = a.id;
        layerSchliessen(); artenMalen();
      };
    };
  };

  const shotsMalen = () => {
    const wrap = $('[data-shots]', node);
    wrap.innerHTML = bilder.map((x, i) => `
      <div class="shot"><img src="${x.src}" data-gross="${i}" alt="Foto ${i + 1}"><button class="x" data-weg="${i}" aria-label="Foto entfernen">${ICON.x}</button></div>`).join('')
      + `<button class="addshot" data-kamera>${ICON.cam}Kamera</button>
         <button class="addshot" data-galerie>${ICON.img}Galerie</button>`;
    $$('[data-weg]', wrap).forEach(x => x.onclick = e => { e.stopPropagation(); bilder.splice(+x.dataset.weg, 1); shotsMalen(); });
    $$('[data-gross]', wrap).forEach(x => x.onclick = () => bildGross(bilder, +x.dataset.gross, w => {
      const i = bilder.indexOf(w); if (i >= 0) bilder.splice(i, 1); shotsMalen();
    }));
    $('[data-kamera]', wrap).onclick = () => kameraOeffnen(neue => { neue.forEach(src => bilder.push({ id: uid(), src, ts: Date.now() })); shotsMalen(); });
    $('[data-galerie]', wrap).onclick = () => bilderWaehlen(neue => { neue.forEach(src => bilder.push({ id: uid(), src, ts: Date.now() })); shotsMalen(); });
  };

  $('[data-back]', node).onclick = () => layerSchliessen();
  $('[data-ok]', node).onclick = () => {
    const text = $('[data-text]', node).value.trim();
    if (!text && !bilder.length) { toast('Ohne Text und ohne Foto gibt es nichts zu sichern.'); return; }
    aendern(() => {
      const roheSeite = $('[data-seite]', node).value.trim();
      n.seite = roheSeite || null;
      n.themaId = themaFindenOderAnlegen($('[data-thema]', node).value);
      n.artId = artId;
      n.text = text;
      n.bilder = bilder;
      n.geaendert = Date.now();
      if (neu) b.notizen.push(n);
    });
    layerSchliessen();
    if (neuMalen) neuMalen();
    toast(neu ? 'Notiz angelegt.' : 'Notiz gesichert.');
  };
  if (!neu) $('[data-del]', node).onclick = async () => {
    const ok = await bestaetigen('Notiz löschen?', 'Text und ' + n.bilder.length + ' Foto(s) sind dann weg.', 'Löschen', true);
    if (!ok) return;
    aendern(() => { b.notizen = b.notizen.filter(x => x.id !== n.id); });
    layerSchliessen();
    if (neuMalen) neuMalen();
  };

  layerOeffnen(node);
  artenMalen();
  shotsMalen();
}
/* ============================================================
   Seite 4: Lesen – Stoppuhr und Sitzungen
   ============================================================ */
let uhrTick = null;

function laufenderTimer() { return DB.einstellungen.timer || null; }
/* Pausiert wird, indem der Startzeitpunkt beim Weitermachen um die Pause
   nach vorn rückt. Dann bleibt „verstrichen = jetzt − start“ überall gültig:
   Uhr, Wecker und die Minuten der fertigen Sitzung rechnen unverändert. */
const timerPausiert = t => !!(t && t.pauseTs);
function timerVerstrichen(t) { return (t.pauseTs || Date.now()) - t.startTs; }
function timerMinuten(t) { return timerVerstrichen(t) / 60000; }

function seiteLesen(b, root, neuMalen) {
  const t = laufenderTimer();
  const laeuftHier = t && t.buchId === b.id;
  const min = buchMinuten(b);
  const gelesen = buchSeitenGelesen(b);
  const tempo = buchTempo(b);
  const letzte = b.sessions.slice().sort((x, y) => (x.datum < y.datum ? 1 : -1))[0];
  const stand = b.sessions.reduce((m, s) => Math.max(m, s.bis || 0), 0);
  const rest = (b.seiten && stand) ? Math.max(0, b.seiten - stand) : null;
  const restZeit = (rest != null && tempo) ? rest / tempo * 60 : null;

  root.innerHTML = `
    <div class="card" style="padding:14px;margin-bottom:14px">
      <div class="eyebrow" style="text-align:center">${laeuftHier
      ? (timerPausiert(t) ? 'pausiert' : 'läuft') : (min ? 'bisher gelesen' : 'Stoppuhr')}</div>
      <div class="timer-big${laeuftHier && timerPausiert(t) ? ' ruht' : ''}" data-uhr>00:00:00</div>
      <div class="btn-row" style="justify-content:center;margin-top:10px">
        ${laeuftHier ? `<button class="btn" data-uhr-pause style="min-width:112px">
          ${timerPausiert(t) ? ICON.play + ' Weiter' : ICON.pause + ' Pause'}</button>` : ''}
        <button class="btn ${laeuftHier ? 'btn-danger' : 'btn-primary'}" data-uhr-btn style="min-width:${laeuftHier ? 128 : 170}px">
          ${laeuftHier ? ICON.check + ' Beenden' : ICON.play + ' Sitzung starten'}
        </button>
      </div>
      ${t && !laeuftHier ? `<p class="hinweis" style="text-align:center;padding-bottom:0">Eine Stoppuhr läuft gerade bei „${esc((buchById(t.buchId) || {}).titel || 'einem anderen Buch')}“.</p>` : ''}
    </div>

    <div class="factgrid" style="margin-top:0">
      <div class="fact"><div class="k">Lesezeit</div><div class="v">${min ? fmtDauer(min) : '–'}</div></div>
      <div class="fact"><div class="k">Seiten gelesen</div><div class="v">${gelesen || '–'}</div></div>
      <div class="fact"><div class="k">Tempo</div><div class="v">${tempo ? fmtZahl(tempo) + ' <small>S./h</small>' : '–'}</div></div>
      <div class="fact"><div class="k">Stand</div><div class="v">${stand ? 'S. ' + stand : '–'}</div></div>
      <div class="fact"><div class="k">Rest</div><div class="v">${rest != null ? rest + ' <small>S.</small>' : '–'}</div></div>
      <div class="fact"><div class="k">Noch etwa</div><div class="v" style="font-size:12.5px">${restZeit ? fmtDauer(restZeit) : '–'}</div></div>
    </div>

    <div class="section-head" style="padding:0;margin:18px 0 9px">
      <h2>Sitzungen (${b.sessions.length})</h2>
      <button class="btn btn-sm" data-neu-session>${ICON.plus} Eintragen</button>
    </div>
    <div class="list-card" data-sessions></div>`;

  const uhrMalen = () => {
    const tt = laufenderTimer();
    const el = $('[data-uhr]', root);
    if (!el) return;
    if (!tt || tt.buchId !== b.id) { el.textContent = min ? fmtDauer(min) : '00:00:00'; return; }
    const s = Math.floor(timerVerstrichen(tt) / 1000);
    el.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, '0')).join(':');
  };
  uhrMalen();
  clearInterval(uhrTick);
  /* Während der Pause steht die Uhr – da braucht nichts zu ticken. */
  if (laeuftHier && !timerPausiert(t)) uhrTick = setInterval(uhrMalen, 1000);

  const pauseKnopf = $('[data-uhr-pause]', root);
  if (pauseKnopf) pauseKnopf.onclick = () => { sitzungPause(); neuMalen(); };

  $('[data-uhr-btn]', root).onclick = () => {
    if (laeuftHier) {
      const minuten = Math.max(1, Math.round(timerMinuten(t)));
      aendern(() => { DB.einstellungen.timer = null; });
      clearInterval(uhrTick);
      sessionBearbeiten(b, null, { minuten, von: stand || null }, neuMalen);
    } else {
      aendern(() => {
        DB.einstellungen.timer = { buchId: b.id, startTs: Date.now() };
        if (b.status === 'offen') b.status = 'lese';
      });
      neuMalen();
    }
  };
  $('[data-neu-session]', root).onclick = () => sessionBearbeiten(b, null, { von: stand || null }, neuMalen);

  const wrap = $('[data-sessions]', root);
  const sess = b.sessions.slice().sort((x, y) => (x.datum < y.datum ? 1 : x.datum > y.datum ? -1 : 0));
  if (!sess.length) {
    wrap.innerHTML = `<div class="hinweis" style="padding:16px 14px">Noch keine Sitzung. Starte die Stoppuhr oder trage eine vergangene Sitzung von Hand ein – beides lässt sich später korrigieren.</div>`;
  }
  sess.forEach(s => {
    const row = document.createElement('button');
    row.className = 'rowline';
    row.style.width = '100%';
    row.style.textAlign = 'left';
    row.innerHTML = `
      <span class="grow">
        <span class="rn num">${fmtDatum(s.datum)}</span>
        <span class="rm">${fmtDauer(s.minuten)}${(s.von != null && s.bis != null) ? ' · S. ' + s.von + '–' + s.bis : ''}${s.notiz ? ' · ' + esc(s.notiz) : ''}</span>
      </span>
      <span class="chev">${ICON.chev}</span>`;
    row.onclick = () => sessionBearbeiten(b, s, {}, neuMalen);
    wrap.appendChild(row);
  });
}

/* „nachSitzung“ heisst: die Stoppuhr wurde gerade beendet. Dann darf das
   Blatt nicht stillschweigend verschwinden – die gelesene Zeit wäre weg. */
function sessionBearbeiten(b, session, vorgabe, neuMalen, nachSitzung) {
  const neu = !session;
  const s0 = session || {
    id: uid(), datum: heute(), minuten: vorgabe.minuten || 0,
    von: vorgabe.von != null ? vorgabe.von : null,
    bis: vorgabe.bis != null ? vorgabe.bis : null,
    notiz: vorgabe.notiz || ''
  };
  if (vorgabe && vorgabe.datum) s0.datum = vorgabe.datum;
  let gespeichert = false;
  const s = blatt(neu ? 'Sitzung eintragen' : 'Sitzung ändern', `
    <div class="grid2">
      <div class="field"><label>Datum</label><input type="date" data-datum value="${s0.datum}"></div>
      <div class="field"><label>Dauer in Minuten</label><input type="number" data-min value="${s0.minuten || ''}" placeholder="45"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Seite von</label><input type="number" data-von value="${s0.von == null ? '' : s0.von}"></div>
      <div class="field"><label>Seite bis</label><input type="number" data-bis value="${s0.bis == null ? '' : s0.bis}"></div>
    </div>
    <div class="field"><label>Notiz</label><input type="text" data-notiz value="${esc(s0.notiz || '')}" placeholder="z.B. im Zug, laut gelesen"></div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Eintragen' : 'Sichern'}</button>
      ${neu ? '' : `<button class="btn btn-danger" data-del>${ICON.trash}</button>`}
    </div>`, {
    fokus: false,
    onClose: () => {
      if (gespeichert || !nachSitzung) return;
      /* Die Felder liegen noch im abgehängten Blatt – der Stand geht also
         nicht verloren, falls nachgetragen wird. */
      const stand = {
        datum: $('[data-datum]', s).value || heute(),
        minuten: num($('[data-min]', s).value) || 0,
        von: num($('[data-von]', s).value),
        bis: num($('[data-bis]', s).value),
        notiz: $('[data-notiz]', s).value.trim()
      };
      setTimeout(() => sitzungVerwerfenFragen(b, stand, neuMalen), 60);
    }
  });

  $('[data-ok]', s).onclick = () => {
    const minuten = num($('[data-min]', s).value) || 0;
    if (minuten <= 0) { toast('Wie lange war die Sitzung?'); return; }
    aendern(() => {
      s0.datum = $('[data-datum]', s).value || heute();
      s0.minuten = minuten;
      s0.von = num($('[data-von]', s).value);
      s0.bis = num($('[data-bis]', s).value);
      s0.notiz = $('[data-notiz]', s).value.trim();
      if (neu) b.sessions.push(s0);
      if (b.status === 'offen') b.status = 'lese';
      if (b.seiten && s0.bis && s0.bis >= b.seiten) b.status = 'gelesen';
    });
    gespeichert = true;
    layerSchliessen();
    /* Eine eingetragene Sitzung wird sofort weggeschrieben, nicht erst beim
       nächsten Takt der Selbstsicherung. */
    Store.sichern(true);
    if (neuMalen) neuMalen();
  };
  if (!neu) $('[data-del]', s).onclick = async () => {
    const ok = await bestaetigen('Sitzung löschen?', fmtDatum(s0.datum) + ', ' + fmtDauer(s0.minuten), 'Löschen', true);
    if (!ok) return;
    aendern(() => { b.sessions = b.sessions.filter(x => x.id !== s0.id); });
    gespeichert = true;
    layerSchliessen();
    Store.sichern(true);
    if (neuMalen) neuMalen();
  };
}

/* Weggezogen, ohne einzutragen: nachfragen statt die Zeit verfallen lassen. */
function sitzungVerwerfenFragen(b, stand, neuMalen) {
  const dauer = stand.minuten > 0 ? fmtDauer(stand.minuten) : 'Die Sitzung';
  const s = blatt('Nicht eingetragen', `
    <p class="muted" style="font-size:13.5px;line-height:1.6;margin-bottom:16px">
      ${esc(dauer)}${stand.minuten > 0 ? ' Lesezeit' : ''} an „${esc(b.titel)}“ ist noch nicht eingetragen.
      Verworfen taucht sie nirgends mehr auf – weder im Protokoll noch im Tagesziel.
    </p>
    <div class="btn-row">
      <button class="btn btn-primary" data-nach style="flex:1">Nachtragen</button>
      <button class="btn btn-danger" data-weg style="flex:1">Verwerfen</button>
    </div>`, { fokus: false });
  $('[data-nach]', s).onclick = () => {
    layerSchliessen();
    setTimeout(() => sessionBearbeiten(b, null, stand, neuMalen, true), 60);
  };
  $('[data-weg]', s).onclick = () => { layerSchliessen(); toast('Sitzung verworfen.'); };
}

