/* ============================================================
   Einkaufsliste: was fehlt und was als Nächstes drankommt
   ============================================================ */
const fehltMir = b => b.besitz === 'fehlt' || b.besitz === 'bestellt';
function einkaufDaten() {
  const alle = buecherNachPlan().filter(fehltMir);
  const naechste = alle.filter(b => b.einkauf);
  const rest = alle.filter(b => !b.einkauf);
  const summe = l => l.reduce((s, b) => s + (b.preis || 0), 0);
  return { alle, naechste, rest, summeNaechste: summe(naechste), summeAlle: summe(alle) };
}

/* Kopieren, das auch dort geht, wo navigator.clipboard fehlt oder abweist:
   über file://, in eingebetteten Ansichten und in älteren Safari-Fassungen.
   Dann übernimmt das alte execCommand mit einem Hilfsfeld. */
async function inZwischenablage(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* weiter zum Notweg */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    /* Sichtbar, aber winzig und durchsichtig – aus einem versteckten Feld
       lässt sich nichts markieren, und ohne Markierung kopiert execCommand nicht. */
    ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;'
      + 'border:none;outline:none;box-shadow:none;background:transparent;color:transparent;';
    ta.dataset.ruhig = '1';   /* kein Formularrahmen um das Kopierfeld */
    document.body.appendChild(ta);
    const sel = window.getSelection();
    const vorher = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length); /* iOS braucht das ausdrücklich */
    const ok = document.execCommand('copy');
    ta.remove();
    if (vorher && sel) { sel.removeAllRanges(); sel.addRange(vorher); }
    return !!ok;
  } catch (e) { return false; }
}

/* Letzter Ausweg: den Text markieren, dann genügt langes Drücken → Kopieren. */
function textMarkieren(el) {
  if (!el) return false;
  try {
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  } catch (e) { return false; }
}

/* Kopierknopf mit allen Rückfällen – gibt es nichts zu kopieren, wird markiert. */
async function kopierenMitRueckfall(text, preEl) {
  if (await inZwischenablage(text)) { toast('Kopiert.'); return; }
  if (textMarkieren(preEl)) {
    toast('Der Browser lässt kein Kopieren zu. Der Text ist jetzt markiert – halte ihn gedrückt und wähle „Kopieren“.', 6000);
  } else {
    toast('Kopieren ging nicht – nimm die Textdatei.', 4000);
  }
}

async function dateiAnbieten(name, text, typ) {
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename: name, data: text }); toast('Gesichert: ' + name); return; }
    catch (e) {
      if (e && e.code === 'declined') { toast('Abgebrochen.'); return; }
      console.error(e);
    }
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: typ || 'text/plain' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Gesichert: ' + name);
  } catch (e) { toast('Kein Weg zum Speichern verfügbar.', 3500); }
}

function einkaufText() {
  const { naechste, rest, summeNaechste, summeAlle } = einkaufDaten();
  const zeile = b => {
    const teile = ['– ' + b.titel + ' — ' + (b.autor || 'ohne Autor')];
    const zusatz = [];
    if (b.ausgabe) zusatz.push(b.ausgabe);
    if (b.seiten) zusatz.push((b.seitenUnsicher ? 'ca. ' : '') + b.seiten + ' S.');
    if (b.besitz === 'bestellt') zusatz.push('bestellt');
    if (zusatz.length) teile.push('  (' + zusatz.join(', ') + ')');
    if (b.preis != null) teile.push('  ' + fmtGeld(b.preis));
    return teile.join('');
  };
  const heuteText = new Date().toLocaleDateString('de-DE');
  let out = 'Einkaufsliste – leseliste\nStand: ' + heuteText + '\n';
  if (naechste.length) {
    out += '\nALS NÄCHSTES (' + naechste.length + ')\n' + naechste.map(zeile).join('\n') + '\n';
    if (summeNaechste) out += 'Zwischensumme: ' + fmtGeld(summeNaechste) + '\n';
  }
  if (rest.length) out += '\nFEHLT AUSSERDEM (' + rest.length + ')\n' + rest.map(zeile).join('\n') + '\n';
  out += '\nSumme der eingetragenen Preise: ' + fmtGeld(summeAlle) + '\n';
  out += '(Bücher ohne Preis sind darin nicht enthalten.)\n';
  return out;
}

function einkaufslisteOeffnen() {
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="ovl-title serif">Einkaufsliste</div><div class="ovl-sub" data-sub></div></div>
      <button class="icon-btn" data-ausgeben aria-label="Als Datei">${ICON.save}</button>
    </div>
    <div class="ovl-body" style="padding:12px 14px 40px" data-body></div>`;

  const malen = () => {
    const { alle, naechste, rest, summeNaechste, summeAlle } = einkaufDaten();
    $('[data-sub]', node).textContent = alle.length
      ? pl(alle.length, 'Buch', 'Bücher') + (summeAlle ? ' · ' + fmtGeld(summeAlle) : '')
      : 'nichts offen';
    const body = $('[data-body]', node);
    body.innerHTML = '';
    if (!alle.length) {
      body.innerHTML = `<div class="empty"><strong>Nichts zu besorgen</strong>Alle Bücher deiner Listen sind als vorhanden oder aus der Bibliothek geführt.</div>`;
      return;
    }

    const abschnitt = (titel, liste, summe, hinweis) => {
      if (!liste.length) return;
      const h = document.createElement('div');
      h.className = 'section-head';
      h.style.margin = '6px 0 8px';
      h.innerHTML = `<h2>${esc(titel)} <span class="eyebrow" style="margin-left:6px">${liste.length}</span></h2>
        <span class="eyebrow">${summe ? fmtGeld(summe) : ''}</span>`;
      body.appendChild(h);
      if (hinweis) body.insertAdjacentHTML('beforeend', `<p class="hinweis" style="padding:0 0 8px">${hinweis}</p>`);
      const karte = document.createElement('div');
      karte.className = 'list-card';
      karte.style.marginBottom = '18px';
      liste.forEach(b => {
        const bes = BESITZ[b.besitz] || BESITZ.fehlt;
        const r = document.createElement('div');
        r.className = 'rowline';
        r.innerHTML = `
          <button data-mark="${b.id}" class="status-btn" style="width:26px;height:26px;${b.einkauf ? 'border-color:var(--accent);color:var(--accent);background:var(--accent-soft)' : ''}">${b.einkauf ? ICON.check : ''}</button>
          <button class="grow" data-oeffne="${b.id}" style="text-align:left">
            <span class="rn serif">${esc(b.titel)}</span>
            <span class="rm">${esc(b.autor)}${b.ausgabe ? ' · ' + esc(b.ausgabe) : ''}${b.besitz === 'bestellt' ? ' · bestellt' : ''}</span>
          </button>
          <span class="bval">${b.preis != null ? fmtGeld(b.preis) : '–'}</span>`;
        $('[data-mark]', r).onclick = () => { aendern(() => { b.einkauf = !b.einkauf; }); malen(); viewMalen(); };
        $('[data-oeffne]', r).onclick = () => buchOeffnen(b.id);
        karte.appendChild(r);
      });
      body.appendChild(karte);
    };

    abschnitt('Als Nächstes', naechste, summeNaechste,
      'Angetippt wandert ein Buch zwischen „Als Nächstes“ und der übrigen Liste.');
    abschnitt('Fehlt außerdem', rest, 0, naechste.length ? '' :
      'Tippe den Kreis an, um ein Buch für den nächsten Einkauf vorzumerken.');

    body.insertAdjacentHTML('beforeend',
      `<p class="hinweis">Bücher ohne Preis zählen nicht in die Summe. Den Preis trägst du im Buch unter „Bearbeiten“ ein.</p>`);
  };

  $('[data-back]', node).onclick = () => layerSchliessen();
  $('[data-ausgeben]', node).onclick = () => {
    const s = blatt('Einkaufsliste ausgeben', `
      <div class="btn-row">
        <button class="btn btn-primary" data-txt style="flex:1">Als Textdatei</button>
        <button class="btn" data-kopieren style="flex:1">In die Zwischenablage</button>
      </div>
      <pre style="margin-top:14px;max-height:36vh;overflow:auto;font-size:11px;color:var(--text-2);white-space:pre-wrap;font-family:'IBM Plex Mono',monospace;user-select:text;-webkit-user-select:text;-webkit-touch-callout:default">${esc(einkaufText())}</pre>`,
      { fokus: false });
    $('[data-txt]', s).onclick = () => { dateiAnbieten('einkaufsliste-' + heute() + '.txt', einkaufText()); layerSchliessen(); };
    $('[data-kopieren]', s).onclick = () => kopierenMitRueckfall(einkaufText(), $('pre', s));
  };
  layerOeffnen(node, () => viewMalen());
  malen();
}

