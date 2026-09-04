/* ============================================================
   Plan
   ============================================================ */
const offeneBloecke = new Set();
let planFilter = 'alle';
let planSort = 'plan';

function buecherGefiltert(blockId) {
  let l = buecherIn(blockId);
  if (planFilter === 'fehlt') l = l.filter(b => b.besitz === 'fehlt' || b.besitz === 'bestellt');
  else if (planFilter !== 'alle') l = l.filter(b => b.status === planFilter);
  if (planSort === 'titel') l = l.slice().sort((a, b) => a.titel.localeCompare(b.titel, 'de'));
  else if (planSort === 'autor') l = l.slice().sort((a, b) => (a.autor || '').localeCompare(b.autor || '', 'de'));
  else if (planSort === 'seiten') l = l.slice().sort((a, b) => (b.seiten || 0) - (a.seiten || 0));
  else if (planSort === 'jahr') l = l.slice().sort((a, b) => (a.jahr || 9999) - (b.jahr || 9999));
  return l;
}

function planMalen(root) {
  const plan = aktiverPlan();
  if (!plan) {
    root.innerHTML = `
      <div class="empty">
        <strong>Noch keine leseliste</strong>
        Eine leseliste fasst mehrere Blöcke zusammen. Lege eine an, stöbere dich durch eine
        Sammlung von Werken, lade eine fertige Liste als Datei – oder lass dir zu einer Frage,
        einer These oder einem Thema eine zusammenstellen.
        <div class="btn-row" style="justify-content:center;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-primary" data-neu-plan>${ICON.plus} leseliste anlegen</button>
          <button class="btn" data-stoebern>${ICON.herz} Stöbern</button>
          <button class="btn" data-import>Liste laden</button>
          <button class="btn" data-ki>${ICON.tags} Von KI zusammenstellen</button>
        </div>
      </div>`;
    $('[data-neu-plan]', root).onclick = () => planBearbeiten(null);
    $('[data-stoebern]', root).onclick = () => stoebernOeffnen();
    $('[data-import]', root).onclick = () => importDialog(false);
    $('[data-ki]', root).onclick = () => kiErstellenOeffnen();
    return;
  }

  const bloecke = bloeckeSortiert();
  const filter = [['alle', 'Alle'], ['offen', 'Offen'], ['lese', 'Lese ich'], ['gelesen', 'Gelesen'], ['fehlt', 'Fehlt mir']];
  root.innerHTML = `
    <div class="planbar">
      <button class="planbtn" data-plaene>
        <span class="grow">
          <span class="pl-k">leseliste${DB.lesepleane.length > 1 ? ' ' + (plaeneSortiert().findIndex(p => p.id === plan.id) + 1) + ' von ' + DB.lesepleane.length : ''}</span>
          <span class="pl-n">${esc(plan.name)}</span>
        </span>
        <span class="chev">${ICON.chev}</span>
      </button>
    </div>
    ${bloecke.length ? `
      <div class="chiprow">
        ${filter.map(([k, l]) => `<button class="chip" data-filter="${k}" aria-pressed="${planFilter === k}">${l}</button>`).join('')}
      </div>
      <div class="sortrow">
        <span>Sortiert nach</span>
        <select data-sort>
          <option value="plan"${planSort === 'plan' ? ' selected' : ''}>Listen-Reihenfolge</option>
          <option value="titel"${planSort === 'titel' ? ' selected' : ''}>Titel A–Z</option>
          <option value="autor"${planSort === 'autor' ? ' selected' : ''}>Autor A–Z</option>
          <option value="seiten"${planSort === 'seiten' ? ' selected' : ''}>Seiten absteigend</option>
          <option value="jahr"${planSort === 'jahr' ? ' selected' : ''}>Erscheinungsjahr</option>
        </select>
      </div>
      <div id="blocklist" style="margin-top:12px"></div>
      <div style="padding:4px 14px 0">
        <button class="btn btn-block" data-neu-block>${ICON.plus} Block anlegen</button>
      </div>`
      : `<div class="empty">
          <strong>„${esc(plan.name)}" ist noch leer</strong>
          Blöcke gruppieren die Bücher innerhalb dieser leseliste.
          <div class="btn-row" style="justify-content:center;margin-top:16px">
            <button class="btn btn-primary" data-neu-block>${ICON.plus} Block anlegen</button>
            <button class="btn" data-import>Liste laden</button>
          </div>
        </div>`}`;

  $('[data-plaene]', root).onclick = planWechsler;
  $$('[data-filter]', root).forEach(b => b.onclick = () => { planFilter = b.dataset.filter; viewMalen(); });
  const sortSel = $('[data-sort]', root);
  if (sortSel) sortSel.onchange = e => { planSort = e.target.value; viewMalen(); };
  $$('[data-neu-block]', root).forEach(b => b.onclick = () => blockBearbeiten(null));
  const imp = $('[data-import]', root);
  if (imp) imp.onclick = () => importDialog(false);

  const list = $('#blocklist', root);
  if (!list) return;
  bloecke.forEach((blk, i) => {
    const alle = buecherIn(blk.id);
    const gelesen = alle.filter(b => b.status === 'gelesen').length;
    const imLesen = alle.filter(b => b.status === 'lese').length;
    const seiten = alle.reduce((s, b) => s + (b.seiten || 0), 0);
    /* Derselbe Dreiklang wie in der Übersicht: gelesen, in Arbeit, offen. */
    const anteil = n => alle.length ? n / alle.length * 100 : 0;
    const zeigen = buecherGefiltert(blk.id);
    const offen = offeneBloecke.has(blk.id);

    const node = document.createElement('div');
    node.className = 'block' + (offen ? ' open' : '');
    node.innerHTML = `
      <button class="block-head" data-toggle>
        <span class="idx num">${String(i + 1).padStart(2, '0')}</span>
        <span class="grow">
          <span class="name">${esc(blk.name)}</span>
          <span class="meta">
            <span>${pl(alle.length, 'Werk', 'Werke')}</span>
            <span>${pl(new Set(alle.flatMap(x => buchAutoren(x).map(a => a.name))).size, 'Autor', 'Autoren')}</span>
            <span>${gelesen} gelesen${imLesen ? ' · ' + imLesen + ' in Arbeit' : ''}</span>
            ${seiten ? `<span class="num">${fmtZahl(seiten)} S.</span>` : ''}
          </span>
        </span>
        <span class="chev">${ICON.chev}</span>
      </button>
      <div class="block-bar"><i style="width:${anteil(gelesen)}%"></i><i class="lese" style="width:${anteil(imLesen)}%"></i></div>
      <div class="books"></div>`;

    const kopf = $('[data-toggle]', node);
    kopf.onclick = () => {
      if (node._langGedrueckt) { node._langGedrueckt = false; return; }
      if (offeneBloecke.has(blk.id)) offeneBloecke.delete(blk.id); else offeneBloecke.add(blk.id);
      viewMalen();
    };
    node._sortId = blk.id;
    ziehenZumSortieren(node, kopf, {
      auswahl: '.block',
      fertig: ids => aendern(() => ids.forEach((id, i) => { const bb = blockById(id); if (bb) bb.ord = i; }))
    });

    const wrap = $('.books', node);
    if (!zeigen.length) {
      wrap.innerHTML = `<div style="padding:10px 8px;font-size:12.5px;color:var(--text-3)">${alle.length ? 'Kein Buch mit diesem Filter.' : 'Noch kein Buch in diesem Block.'}</div>`;
    }
    zeigen.forEach(b => wrap.appendChild(buchZeile(b)));

    const leiste = document.createElement('div');
    leiste.style.cssText = 'display:flex;gap:8px;padding:6px 2px 0';
    leiste.innerHTML = `<button class="btn btn-sm" data-neu-buch style="flex:1">${ICON.plus} Buch</button>
      <button class="btn btn-sm btn-ghost" data-block-edit>${ICON.edit} Block</button>`;
    $('[data-neu-buch]', leiste).onclick = () => buchBearbeiten(null, blk.id);
    $('[data-block-edit]', leiste).onclick = () => blockBearbeiten(blk);
    wrap.appendChild(leiste);

    list.appendChild(node);
  });
}

function buchZeile(b) {
  const node = document.createElement('div');
  node.className = 'book';
  const min = buchMinuten(b);
  const bes = BESITZ[b.besitz] || BESITZ.fehlt;
  const marken = [];
  if (b.notizen.length) marken.push(`<span class="minitag">${pl(b.notizen.length, 'Notiz', 'Notizen')}</span>`);
  if (min) marken.push(`<span class="minitag">${fmtDauer(min)}</span>`);
  if (b.status === 'lese') marken.push('<span class="minitag acc">lese ich</span>');
  if (b.einkauf) marken.push('<span class="minitag acc">Einkauf</span>');

  node.innerHTML = `
    <div class="bookpane">
      <button class="status-btn" data-status="${b.status}" title="${STATUS[b.status]}">
        ${b.status === 'gelesen' ? ICON.check : b.status === 'lese' ? ICON.read : ''}
      </button>
      <button class="grow" data-oeffnen style="text-align:left">
        <span class="title serif ${b.status === 'gelesen' ? 'done' : ''}">${esc(b.titel)}</span>
        <span class="byline">
          <span>${esc(b.autor || 'ohne Autor')}</span>
          ${b.jahr != null ? `<span class="num">${esc(jahrText(b.jahr))}</span>` : ''}
          ${b.seiten ? `<span class="num">${b.seitenUnsicher ? '~' : ''}${b.seiten} S.</span>` : ''}
          ${bes.kurz ? `<span style="color:${bes.farbe}">${esc(bes.kurz)}</span>` : ''}
          ${b.schwierigkeit ? stufeHtml(b.schwierigkeit) : ''}
        </span>
        ${marken.length ? `<span class="tags">${marken.join('')}</span>` : ''}
      </button>
      <span class="chev">${ICON.chev}</span>
    </div>
    <div class="bookpane kurzpane">
      <span class="kt">In Kürze</span>
      <span class="kx">${b.kurz ? esc(b.kurz) : '<em>Noch keine Kurzfassung – lang tippen, dann „Bearbeiten“.</em>'}</span>
    </div>`;

  $('.status-btn', node).onclick = e => {
    e.stopPropagation();
    const folge = { offen: 'lese', lese: 'gelesen', gelesen: 'offen' };
    aendern(() => { b.status = folge[b.status] || 'offen'; });
    viewMalen();
  };
  const oeffner = $('[data-oeffnen]', node);
  oeffner.onclick = () => { if (!node._langGedrueckt) buchOeffnen(b.id); node._langGedrueckt = false; };

  node._sortId = b.id;
  ziehenZumSortieren(node, oeffner, {
    auswahl: '.book',
    fertig: ids => aendern(() => ids.forEach((id, i) => { const bb = buchById(id); if (bb) bb.ord = i; }))
  });
  return node;
}

/* Langes Drücken hebt den Eintrag an; danach folgt er dem Finger und wird
   dort abgelegt, wo man loslässt. Auf dem Handy laufen dafür Touch-Ereignisse:
   nur damit lässt sich das Scrollen der Seite rechtzeitig unterbinden. */
function ziehenZumSortieren(node, griff, opts) {
  const auswahl = opts.auswahl;
  let halten = null, zieht = false, sx = 0, sy = 0, wrap = null;

  const punkt = ev => (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;

  const beginnen = () => {
    wrap = node.parentElement;
    if (!wrap || wrap.querySelectorAll(auswahl).length < 2) return;
    zieht = true;
    window.__zieht = true;
    node._langGedrueckt = true;
    $$('button', node).forEach(b => { b._langGedrueckt = true; });
    node.classList.add('zieht');
    document.body.style.userSelect = 'none';
    if (navigator.vibrate) { try { navigator.vibrate(14); } catch (e) { } }
  };

  /* Waagerecht liegende Reihen (die Tage im To-Do) messen an der Breite. */
  const quer = !!opts.waagerecht;
  const einsortieren = (x, y) => {
    const wert = quer ? x : y;
    for (const g of Array.from(wrap.querySelectorAll(auswahl))) {
      if (g === node) continue;
      const r = g.getBoundingClientRect();
      const mitte = quer ? r.left + r.width / 2 : r.top + r.height / 2;
      const nodeFolgt = !!(g.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (wert < mitte && nodeFolgt) { wrap.insertBefore(node, g); return; }
      if (wert > mitte && !nodeFolgt) { wrap.insertBefore(node, g.nextSibling); return; }
    }
  };

  const bewegen = ev => {
    const p = punkt(ev);
    if (!zieht) {
      if (Math.abs(p.clientY - sy) > 12 || Math.abs(p.clientX - sx) > 12) clearTimeout(halten);
      return;
    }
    if (ev.cancelable) ev.preventDefault();
    einsortieren(p.clientX, p.clientY);
    const rand = 100;
    if (quer) {
      const r = wrap.getBoundingClientRect();
      if (p.clientX < r.left + 60) wrap.scrollBy(-14, 0);
      else if (p.clientX > r.right - 60) wrap.scrollBy(14, 0);
    } else if (p.clientY < rand) window.scrollBy(0, -14);
    else if (p.clientY > window.innerHeight - rand) window.scrollBy(0, 14);
  };

  const ende = () => {
    clearTimeout(halten);
    if (!zieht) return;
    zieht = false;
    window.__zieht = false;
    node.classList.remove('zieht');
    document.body.style.userSelect = '';
    setTimeout(() => { $$('button', node).forEach(b => { b._langGedrueckt = false; }); }, 60);
    opts.fertig(Array.from(wrap.querySelectorAll(auswahl)).map(x => x._sortId));
    (opts.neuMalen || viewMalen)();
    /* Der Klick, der auf das Loslassen folgt, gehört noch zum Zug. */
    setTimeout(() => { node._langGedrueckt = false; }, 60);
  };

  const start = ev => {
    const p = punkt(ev);
    sx = p.clientX; sy = p.clientY;
    clearTimeout(halten);
    halten = setTimeout(beginnen, 420);
  };

  /* Touch: der Zuhörer hängt von Anfang an am Griff und ist nicht passiv,
     damit preventDefault im Ziehen wirklich greift. */
  griff.addEventListener('touchstart', start, { passive: true });
  griff.addEventListener('touchmove', bewegen, { passive: false });
  griff.addEventListener('touchend', ende);
  griff.addEventListener('touchcancel', ende);

  /* Maus */
  griff.addEventListener('mousedown', ev => {
    if (ev.button !== 0) return;
    start(ev);
    const m = e => bewegen(e);
    const u = () => { ende(); window.removeEventListener('mousemove', m); window.removeEventListener('mouseup', u); };
    window.addEventListener('mousemove', m);
    window.addEventListener('mouseup', u);
  });
  griff.addEventListener('contextmenu', ev => { if (zieht) ev.preventDefault(); });
}

/* ---------- Lesepläne ---------- */
function planWechsler() {
  const s = blatt('leselisten', '<div data-l></div>', { fokus: false });
  const malen = () => {
    const l = $('[data-l]', s);
    const aktiv = aktiverPlan();
    l.innerHTML = `
      <p class="hinweis" style="padding:0 0 10px">Eine leseliste bündelt mehrere Blöcke. Beim Start öffnet sich immer die zuletzt benutzte.</p>
      <div class="list-card">${plaeneSortiert().map(p => {
      const bs = buecherImPlan(p.id);
      const g = bs.filter(b => b.status === 'gelesen').length;
      const ist = aktiv && p.id === aktiv.id;
      return `<div class="rowline">
          <button class="grow" data-w="${p.id}" style="text-align:left">
            <span class="rn" style="${ist ? 'color:var(--accent);font-weight:600' : ''}">${ist ? '● ' : ''}${esc(p.name)}</span>
            <span class="rm">${pl(bloeckeVonPlan(p.id).length, 'Block', 'Blöcke')} · ${pl(bs.length, 'Buch', 'Bücher')} · ${g} gelesen</span>
          </button>
          <button class="icon-btn" data-um="${p.id}" aria-label="Bearbeiten">${ICON.edit}</button>
        </div>`;
    }).join('')}</div>
      <button class="btn btn-block" style="margin-top:12px" data-neu>${ICON.plus} leseliste anlegen</button>
      <button class="btn btn-block" style="margin-top:8px" data-stoebern>${ICON.herz} Stöbern – aus einer Sammlung wählen</button>`;

    $$('[data-w]', l).forEach(b => b.onclick = () => {
      aendern(() => { DB.einstellungen.aktiverPlanId = b.dataset.w; });
      layerSchliessen();
      offeneBloecke.clear();
      viewMalen();
    });
    $$('[data-um]', l).forEach(b => b.onclick = () => planBearbeiten(DB.lesepleane.find(p => p.id === b.dataset.um), malen));
    /* Nach dem Anlegen soll der neue Leseplan offen liegen, nicht die Liste. */
    $('[data-neu]', l).onclick = () => { layerSchliessen(); setTimeout(() => planBearbeiten(null, null), 70); };
    $('[data-stoebern]', l).onclick = () => { layerSchliessen(); setTimeout(stoebernOeffnen, 70); };
  };
  malen();
}

function planBearbeiten(plan, neuMalen) {
  const neu = !plan;
  const p = plan || { id: null, name: '' };
  const s = blatt(neu ? 'Neue leseliste' : 'leseliste bearbeiten', `
    <div class="field">
      <label>Name</label>
      <input type="text" data-name value="${esc(p.name)}" placeholder="z.B. Lesestart">
    </div>
    ${neu ? '' : `<div class="field">
      <label>Reihenfolge</label>
      <div class="btn-row">
        <button class="btn btn-sm" data-up>${ICON.up} nach oben</button>
        <button class="btn btn-sm" data-down>${ICON.down} nach unten</button>
      </div>
    </div>`}
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Anlegen' : 'Sichern'}</button>
      ${neu ? '' : `<button class="btn btn-danger" data-del>${ICON.trash}</button>`}
    </div>`);

  $('[data-ok]', s).onclick = () => {
    const name = $('[data-name]', s).value.trim();
    if (!name) { toast('Die leseliste braucht einen Namen.'); return; }
    aendern(() => {
      if (neu) {
        const n = { id: uid(), name, ord: DB.lesepleane.length };
        DB.lesepleane.push(n);
        DB.einstellungen.aktiverPlanId = n.id;
      } else p.name = name;
    });
    layerSchliessen();
    if (neuMalen) neuMalen();
    viewMalen();
  };
  if (!neu) {
    const verschieben = d => {
      const l = plaeneSortiert();
      const i = l.findIndex(x => x.id === p.id), j = i + d;
      if (j < 0 || j >= l.length) return;
      aendern(() => { const t = l[i].ord; l[i].ord = l[j].ord; l[j].ord = t; plaeneSortiert().forEach((x, k) => x.ord = k); });
      if (neuMalen) neuMalen();
      viewMalen();
      toast('Verschoben.');
    };
    $('[data-up]', s).onclick = () => verschieben(-1);
    $('[data-down]', s).onclick = () => verschieben(1);
    $('[data-del]', s).onclick = async () => {
      const bs = buecherImPlan(p.id);
      const ok = await bestaetigen('leseliste löschen?',
        `„${esc(p.name)}" verschwindet mit ${pl(bloeckeVonPlan(p.id).length, 'Block', 'Blöcken')} und ${pl(bs.length, 'Buch', 'Büchern')} samt Notizen und Fotos.`,
        'Endgültig löschen', true);
      if (!ok) return;
      aendern(() => {
        const blockIds = new Set(DB.bloecke.filter(b => b.planId === p.id).map(b => b.id));
        DB.buecher = DB.buecher.filter(b => !blockIds.has(b.blockId));
        DB.bloecke = DB.bloecke.filter(b => b.planId !== p.id);
        DB.lesepleane = DB.lesepleane.filter(x => x.id !== p.id);
        plaeneSortiert().forEach((x, k) => x.ord = k);
        if (DB.einstellungen.aktiverPlanId === p.id) {
          DB.einstellungen.aktiverPlanId = DB.lesepleane[0] ? plaeneSortiert()[0].id : null;
        }
      });
      layerSchliessen();
      if (neuMalen) neuMalen();
      viewMalen();
      toast('leseliste gelöscht.');
    };
  }
}

/* ---------- Block anlegen / bearbeiten ---------- */
function blockBearbeiten(blk) {
  const neu = !blk;
  const b = blk || { id: null, name: '', notiz: '' };
  const s = blatt(neu ? 'Neuer Block' : 'Block bearbeiten', `
    <div class="field">
      <label>Name</label>
      <input type="text" data-name value="${esc(b.name)}" placeholder="z.B. Existentialismus">
    </div>
    <div class="field">
      <label>Notiz zum Block</label>
      <textarea data-notiz placeholder="Warum liest du diesen Block? (freiwillig)" style="min-height:64px">${esc(b.notiz || '')}</textarea>
    </div>
    ${neu ? '' : `<div class="field">
      <label>Reihenfolge</label>
      <div class="btn-row">
        <button class="btn btn-sm" data-up>${ICON.up} nach oben</button>
        <button class="btn btn-sm" data-down>${ICON.down} nach unten</button>
      </div>
    </div>`}
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Anlegen' : 'Sichern'}</button>
      ${neu ? '' : `<button class="btn btn-danger" data-del>${ICON.trash} Löschen</button>`}
    </div>`);

  const speichern = () => {
    const name = $('[data-name]', s).value.trim();
    if (!name) { toast('Der Block braucht einen Namen.'); return; }
    aendern(() => {
      if (neu) {
        const p = aktiverPlan();
        DB.bloecke.push({
          id: uid(), planId: p ? p.id : null, name,
          notiz: $('[data-notiz]', s).value.trim(), ord: bloeckeSortiert().length
        });
      } else {
        b.name = name; b.notiz = $('[data-notiz]', s).value.trim();
      }
    });
    layerSchliessen(); viewMalen();
  };
  $('[data-ok]', s).onclick = speichern;

  if (!neu) {
    const verschieben = d => {
      const sorted = bloeckeSortiert();
      const i = sorted.findIndex(x => x.id === b.id);
      const j = i + d;
      if (j < 0 || j >= sorted.length) return;
      aendern(() => {
        const t = sorted[i].ord; sorted[i].ord = sorted[j].ord; sorted[j].ord = t;
        bloeckeSortiert().forEach((x, k) => x.ord = k);
      });
      viewMalen();
      toast('Verschoben.');
    };
    $('[data-up]', s).onclick = () => verschieben(-1);
    $('[data-down]', s).onclick = () => verschieben(1);
    $('[data-del]', s).onclick = async () => {
      const anzahl = buecherIn(b.id).length;
      const ok = await bestaetigen('Block löschen?',
        `„${esc(b.name)}“ wird gelöscht${anzahl ? ' – zusammen mit ' + anzahl + ' ' + (anzahl === 1 ? 'Buch' : 'Büchern') + ' samt deren Notizen und Fotos' : ''}. Das lässt sich nicht rückgängig machen.`,
        'Endgültig löschen', true);
      if (!ok) return;
      aendern(() => {
        DB.buecher = DB.buecher.filter(x => x.blockId !== b.id);
        DB.bloecke = DB.bloecke.filter(x => x.id !== b.id);
        bloeckeSortiert().forEach((x, k) => x.ord = k);
      });
      layerSchliessen(); viewMalen();
      toast('Block gelöscht.');
    };
  }
}

/* ---------- Buch anlegen / bearbeiten ---------- */
function buchBearbeiten(buch, blockIdVorgabe, nachSpeichern) {
  const neu = !buch;
  const b = buch || {
    id: null, blockId: blockIdVorgabe, titel: '', autor: '', autorGeb: null, autorGest: null,
    jahr: null, seiten: null, seitenUnsicher: false, ausgabe: '', link: '', beschreibung: '', preis: null, status: 'offen'
  };
  const s = blatt(neu ? 'Neues Buch' : 'Buch bearbeiten', `
    <div class="field"><label>Titel</label><input type="text" data-titel value="${esc(b.titel)}"></div>
    <div class="field"><label>Autor</label><input type="text" data-autor value="${esc(b.autor)}"></div>
    <div class="grid2">
      <div class="field"><label>Autor geboren</label><input type="number" data-geb value="${b.autorGeb == null ? '' : b.autorGeb}" placeholder="1889"></div>
      <div class="field"><label>Autor gestorben</label><input type="number" data-gest value="${b.autorGest == null ? '' : b.autorGest}" placeholder="1976"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Erstveröffentlichung</label><input type="number" data-jahr value="${b.jahr == null ? '' : b.jahr}" placeholder="1927"></div>
      <div class="field"><label>Seiten</label><input type="number" data-seiten value="${b.seiten == null ? '' : b.seiten}" placeholder="445"></div>
    </div>
    <div class="field" style="flex-direction:row;align-items:center;gap:9px">
      <input type="checkbox" data-unsicher ${b.seitenUnsicher ? 'checked' : ''} style="width:auto">
      <label style="text-transform:none;letter-spacing:0;font-size:12.5px;color:var(--text-2);font-weight:400">Seitenzahl ist geschätzt (wird mit ~ angezeigt)</label>
    </div>
    <div class="grid2">
      <div class="field"><label>Preis in €</label><input type="text" inputmode="decimal" data-preis value="${b.preis == null ? '' : String(b.preis).replace('.', ',')}" placeholder="12,00"></div>
      <div class="field"><label>Status</label><select data-status>
        ${Object.entries(STATUS).map(([k, l]) => `<option value="${k}"${b.status === k ? ' selected' : ''}>${l}</option>`).join('')}
      </select></div>
    </div>
    <div class="field"><label>Ausgabe</label><input type="text" data-ausgabe value="${esc(b.ausgabe || '')}" placeholder="z.B. Suhrkamp Taschenbuch"></div>
    <div class="field"><label>Link</label>
      <input type="url" data-link value="${esc(b.link || '')}" placeholder="https://doi.org/…" inputmode="url">
      <span class="hint">Bei Fachartikeln die Fundstelle – DOI-Adresse oder Seite der Zeitschrift.</span>
    </div>
    <div class="field">
      <label>Besitz</label>
      <div style="display:flex;gap:7px;flex-wrap:wrap" data-besitz></div>
    </div>
    <div class="field">
      <label>Schwierigkeit</label>
      <div style="display:flex;gap:7px;flex-wrap:wrap" data-stufe></div>
    </div>
    <div class="field" style="flex-direction:row;align-items:center;gap:9px">
      <input type="checkbox" data-einkauf ${b.einkauf ? 'checked' : ''} style="width:auto">
      <label style="text-transform:none;letter-spacing:0;font-size:12.5px;color:var(--text-2);font-weight:400">Als Nächstes kaufen (Einkaufsliste)</label>
    </div>
    <div class="field">
      <label>Kurzfassung</label>
      <textarea data-kurz style="min-height:56px" placeholder="Das Buch in höchstens 15 Wörtern – erscheint beim Wischen in der Liste.">${esc(b.kurz || '')}</textarea>
      <span class="hint" data-kurzzahl></span>
    </div>
    <div class="field"><label>Block</label><select data-block>
      ${plaeneSortiert().map(p => `<optgroup label="${esc(p.name)}">${bloeckeVonPlan(p.id)
      .map(x => `<option value="${x.id}"${x.id === b.blockId ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}
    </select></div>
    <div class="field"><label>Beschreibung</label>
      <textarea data-besch placeholder="Worum geht es? Diese Beschreibung steht auf der ersten Seite des Buches.">${esc(b.beschreibung || '')}</textarea>
    </div>
    ${neu ? '' : `<div class="field"><label>Reihenfolge im Block</label>
      <div class="btn-row"><button class="btn btn-sm" data-up>${ICON.up} nach oben</button><button class="btn btn-sm" data-down>${ICON.down} nach unten</button></div>
    </div>`}
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-primary" data-ok style="flex:1">${neu ? 'Anlegen' : 'Sichern'}</button>
      ${neu ? '' : `<button class="btn btn-danger" data-del>${ICON.trash}</button>`}
    </div>`);

  let stufenWahl = b.schwierigkeit || null;
  const stufenMalen = () => {
    const w = $('[data-stufe]', s);
    w.innerHTML = [1, 2, 3, 4, 5].map(n =>
      `<button class="chip" data-s="${n}" aria-pressed="${n === stufenWahl}">${stufeHtml(n)} ${esc(STUFEN[n])}</button>`).join('');
    $$('[data-s]', w).forEach(x => x.onclick = () => { stufenWahl = (stufenWahl === +x.dataset.s) ? null : +x.dataset.s; stufenMalen(); });
  };

  let besitzWahl = BESITZ[b.besitz] ? b.besitz : 'fehlt';
  const besitzMalen = () => {
    const w = $('[data-besitz]', s);
    w.innerHTML = Object.entries(BESITZ).map(([k, v]) =>
      `<button class="chip" data-b="${k}" aria-pressed="${k === besitzWahl}"
        style="${k === besitzWahl ? `border-color:${v.farbe};color:${v.farbe}` : ''}">${esc(v.name)}</button>`).join('');
    $$('[data-b]', w).forEach(x => x.onclick = () => { besitzWahl = x.dataset.b; besitzMalen(); });
  };
  besitzMalen();
  stufenMalen();

  const kurzFeld = $('[data-kurz]', s), kurzZahl = $('[data-kurzzahl]', s);
  const kurzZaehlen = () => {
    const n = kurzFeld.value.trim().split(/\s+/).filter(Boolean).length;
    kurzZahl.textContent = n + (n === 1 ? ' Wort' : ' Wörter') + (n > 15 ? ' – etwas lang' : '');
    kurzZahl.style.color = n > 15 ? 'var(--accent)' : 'var(--text-3)';
  };
  kurzFeld.addEventListener('input', kurzZaehlen);
  kurzZaehlen();

  $('[data-ok]', s).onclick = () => {
    const titel = $('[data-titel]', s).value.trim();
    if (!titel) { toast('Ohne Titel geht es nicht.'); return; }
    const werte = {
      titel,
      autor: $('[data-autor]', s).value.trim(),
      autorGeb: num($('[data-geb]', s).value),
      autorGest: num($('[data-gest]', s).value),
      jahr: num($('[data-jahr]', s).value),
      seiten: num($('[data-seiten]', s).value),
      seitenUnsicher: $('[data-unsicher]', s).checked,
      preis: num($('[data-preis]', s).value),
      status: $('[data-status]', s).value,
      ausgabe: $('[data-ausgabe]', s).value.trim(),
      link: $('[data-link]', s).value.trim(),
      blockId: $('[data-block]', s).value,
      beschreibung: $('[data-besch]', s).value.trim(),
      kurz: $('[data-kurz]', s).value.trim().replace(/\s+/g, ' '),
      schwierigkeit: stufenWahl,
      besitz: besitzWahl,
      einkauf: $('[data-einkauf]', s).checked
    };
    aendern(() => {
      if (neu) {
        const n = Object.assign({ id: uid(), ord: buecherIn(werte.blockId).length, sessions: [], notizen: [] }, werte);
        n.autoren = autorenAusText(n.autor, null).map((x, i) => i === 0
          ? Object.assign(x, { geb: n.autorGeb, gest: n.autorGest }) : x);
        DB.buecher.push(n);
      } else {
        const alteListe = buchAutoren(b);
        Object.assign(b, werte);
        b.autoren = autorenAusText(werte.autor, alteListe);
        if (b.autoren[0]) { b.autoren[0].geb = werte.autorGeb; b.autoren[0].gest = werte.autorGest; }
      }
    });
    layerSchliessen();
    viewMalen();
    if (nachSpeichern) nachSpeichern();
  };

  if (!neu) {
    const verschieben = d => {
      const l = buecherIn(b.blockId);
      const i = l.findIndex(x => x.id === b.id), j = i + d;
      if (j < 0 || j >= l.length) return;
      aendern(() => { const t = l[i].ord; l[i].ord = l[j].ord; l[j].ord = t; buecherIn(b.blockId).forEach((x, k) => x.ord = k); });
      viewMalen(); toast('Verschoben.');
    };
    $('[data-up]', s).onclick = () => verschieben(-1);
    $('[data-down]', s).onclick = () => verschieben(1);
    $('[data-del]', s).onclick = async () => {
      const ok = await bestaetigen('Buch löschen?',
        `„${esc(b.titel)}“ verschwindet mit ${b.notizen.length} Notizen und ${b.sessions.length} Lese-Sitzungen.`,
        'Endgültig löschen', true);
      if (!ok) return;
      aendern(() => { DB.buecher = DB.buecher.filter(x => x.id !== b.id); });
      alleLayerSchliessen();
      viewMalen();
      toast('Buch gelöscht.');
    };
  }
}

