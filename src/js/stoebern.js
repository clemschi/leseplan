/* ============================================================
   Stöbern, Teil 1: der Prompt für eine Werke-Sammlung
   ============================================================ */
/* Der Stern des Superlikes – blau, damit er sich vom Herzen abhebt. */
const STOSTERN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"'
  + ' stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9'
  + '-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8z"/></svg>';

function stoebernPromptOeffnen() {
  const s = blatt('Sammlung zum Stöbern', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Hier entsteht keine fertige leseliste, sondern ein Vorrat an Werken zu mehreren Themen.
      Den lädst du unter <strong>Stöbern</strong> und wischst dich durch: nach rechts, was dich
      interessiert. Aus dem Gemerkten baust du danach die Blöcke.
    </p>
    <div class="field">
      <label>Woher kommen die Themen?</label>
      <label class="optzeile"><input type="radio" name="stoquelle" value="selbst" checked>
        <span><strong>Ich gebe sie vor</strong></span></label>
      <label class="optzeile"><input type="radio" name="stoquelle" value="ueberrasch">
        <span><strong>Überrasch mich</strong> – die KI wählt sie selbst</span></label>
    </div>
    <div class="field" data-feldSelbst>
      <label>Themen – eines je Zeile</label>
      <textarea data-themen style="min-height:110px" placeholder="Wachstumskritik&#10;Erkenntnistheorie&#10;Kolonialismus und seine Folgen&#10;Verhaltensökonomik"></textarea>
      <span class="hint">Zwei bis acht Themen sind eine gute Spanne. Je Thema kommt etwa der gleiche Anteil.</span>
    </div>
    <div class="field" data-feldUeberrasch hidden>
      <label>Wie viele Themen?</label>
      <input type="number" data-themenzahl value="6" min="2" max="20">
      <span class="hint">Die KI sucht sie frei aus – lohnende Felder, die weit auseinanderliegen.</span>
    </div>
    <div class="field" data-feldRichtung hidden>
      <label>In welche Richtung? (optional)</label>
      <input type="text" data-richtung placeholder="z. B. Gesellschaft und Ökonomie, Naturwissenschaft, quer durch alles">
    </div>
    <div class="field">
      <label>Wie viele Werke insgesamt?</label>
      <input type="number" data-anzahl value="100" min="20" max="250">
      <span class="hint" data-mengenhinweis></span>
    </div>
    <div class="field">
      <label>Sprache der Bücher</label>
      <div class="chiprow" style="padding-left:0;flex-wrap:wrap;overflow:visible" data-sprache></div>
      <span class="hint">Beschreibungen und Biographien kommen immer auf Deutsch zurück. Bei Fachartikeln
      zählt ohnehin nur die Qualität, nicht die Sprache.</span>
    </div>
    <div class="field">
      <label>Anteil Fachartikel</label>
      <div class="chiprow" style="padding-left:0;flex-wrap:wrap;overflow:visible" data-anteil></div>
      <span class="hint">Der Rest sind Bücher. Artikel sind peer-reviewed und viel zitiert, wie über
      Google Scholar auffindbar; bei ihnen zählt allein die Qualität, nicht die Sprache.</span>
    </div>
    <div class="field" data-feldJahr>
      <label>Fachartikel nur aus diesen Jahren (optional)</label>
      <div class="grid2">
        <div class="field" style="margin:0"><input type="number" data-jahrVon placeholder="ab z. B. 2010" min="1800" max="2100"></div>
        <div class="field" style="margin:0"><input type="number" data-jahrBis placeholder="bis z. B. 2025" min="1800" max="2100"></div>
      </div>
      <span class="hint">Gilt nur für Artikel – Bücher bleiben ohne Schranke.</span>
    </div>
    <div class="field">
      <label>Worauf soll besonders geachtet werden? (optional)</label>
      <textarea data-zusatz style="min-height:60px" placeholder="z. B. auch ältere Grundlagentexte, gern Gegenpositionen …"></textarea>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Prompt erzeugen</button>`, { fokus: false });

  /* Die Sprache der Ausgaben. */
  let sprache = 'deutsch';
  const spracheMalen = () => {
    $('[data-sprache]', s).innerHTML = Object.keys(KI_SPRACHEN).map(k =>
      `<button class="chip" data-sp="${k}" aria-pressed="${k === sprache}">${KI_SPRACHEN[k].label}</button>`).join('');
    $$('[data-sp]', s).forEach(b => b.onclick = () => { sprache = b.dataset.sp; spracheMalen(); });
  };
  spracheMalen();

  /* Was ein Durchgang der KI zumutbar ist, hängt am Zugang. */
  const mengenHinweis = () => {
    const n = Math.round(num($('[data-anzahl]', s).value) || 0);
    const el = $('[data-mengenhinweis]', s);
    el.innerHTML = n > 50
      ? 'In der Claude-Basisversion kommen erfahrungsgemäß <b>höchstens etwa 50 Bücher</b> in einem Durchgang zurück. '
      + 'Willst du mehr, lass dir den Vorrat in zwei Durchgängen erzeugen – jede Datei lädst du einzeln ins Stöbern.'
      : 'Bis etwa 50 Werke schafft auch die Claude-Basisversion in einem Durchgang.';
  };
  $('[data-anzahl]', s).addEventListener('input', mengenHinweis);
  mengenHinweis();

  /* Anteil in Zehnerschritten bis siebzig Prozent. */
  const STUFEN_ANTEIL = [0, 10, 20, 30, 40, 50, 60, 70];
  let anteil = 30;
  const anteilMalen = () => {
    $('[data-anteil]', s).innerHTML = STUFEN_ANTEIL.map(v =>
      `<button class="chip" data-a="${v}" aria-pressed="${v === anteil}">${v ? v + ' %' : 'keine'}</button>`).join('');
    $$('[data-a]', s).forEach(b => b.onclick = () => { anteil = +b.dataset.a; anteilMalen(); });
    $('[data-feldJahr]', s).hidden = anteil === 0;
  };
  anteilMalen();

  const quelleMalen = () => {
    const wahl = $('input[name=stoquelle]:checked', s).value;
    $('[data-feldSelbst]', s).hidden = wahl !== 'selbst';
    $('[data-feldUeberrasch]', s).hidden = wahl === 'selbst';
    $('[data-feldRichtung]', s).hidden = wahl === 'selbst';
  };
  $$('input[name=stoquelle]', s).forEach(r => r.onchange = quelleMalen);
  quelleMalen();

  $('[data-ok]', s).onclick = () => {
    const wahl = $('input[name=stoquelle]:checked', s).value;
    const anzahl = clamp(Math.round(num($('[data-anzahl]', s).value) || 100), 20, 250);
    const zusatz = $('[data-zusatz]', s).value.trim();
    const artikel = anteil > 0;
    const vonJ = artikel ? Math.round(num($('[data-jahrVon]', s).value) || 0) : 0;
    const bisJ = artikel ? Math.round(num($('[data-jahrBis]', s).value) || 0) : 0;

    let themenTeil, themenRegel;
    if (wahl === 'selbst') {
      const themen = $('[data-themen]', s).value.split('\n').map(x => x.trim()).filter(Boolean);
      if (!themen.length) { toast('Bitte mindestens ein Thema eintragen.'); return; }
      const jeThema = Math.max(3, Math.round(anzahl / themen.length));
      themenTeil = `Diese Themen sollen darin vorkommen:\n\n`
        + themen.map((t, i) => (i + 1) + '. ' + t).join('\n')
        + `\n\nUngefähr gleich auf die Themen verteilt, rund ${jeThema} Werke je Thema.`;
      themenRegel = 'gib genau die Schreibweise aus meiner Liste zurück';
    } else {
      const zahl = clamp(Math.round(num($('[data-themenzahl]', s).value) || 6), 2, 20);
      const richtung = $('[data-richtung]', s).value.trim();
      themenTeil = `Überrasch mich: Wähle **${zahl} Themen** selbst aus`
        + (richtung ? ` – in dieser Richtung: ${richtung}.` : '.')
        + ` Nimm Felder, die für sich lohnen und weit genug auseinanderliegen, dass die Sammlung`
        + ` abwechslungsreich wird; keine zwei Themen, die sich stark überschneiden.`
        + ` Ungefähr gleich auf die Themen verteilt, rund ${Math.max(3, Math.round(anzahl / zahl))} Werke je Thema.`;
      themenRegel = 'trag die von dir gewählten Themen oben unter "themen" ein und verwende genau diese Schreibweise';
    }

    let anteilTeil;
    if (!artikel) anteilTeil = 'Nur Bücher, keine Fachartikel.';
    else if (anteil >= 70) anteilTeil = `Rund ${anteil} % der Werke sollen wissenschaftliche Fachartikel sein, der Rest Bücher.`;
    else anteilTeil = `Rund ${anteil} % der Werke sollen wissenschaftliche Fachartikel sein, die übrigen ${100 - anteil} % Bücher.`;

    const jahrRegel = artikel && (vonJ || bisJ)
      ? '\n- Fachartikel nur aus ' + (vonJ && bisJ ? `den Jahren ${vonJ} bis ${bisJ}`
        : vonJ ? `${vonJ} oder später` : `${bisJ} oder früher`)
      + '; für Bücher gilt diese Schranke nicht.'
      : '';

    const prompt = `Ich nutze eine App für einen mehrjährigen Leseplan. Stell mir keinen fertigen Plan zusammen, sondern einen **Vorrat an Werken**, durch den ich mich anschließend durchblättere und auswähle.

${themenTeil}

Etwa ${anzahl} Werke insgesamt. ${anteilTeil} Innerhalb eines Themas soll die Spannweite groß sein: Grundlagentexte neben aktuellen Arbeiten, unterschiedliche Positionen, wo möglich Primärquellen statt Sekundärliteratur darüber. Keine Dopplungen.

Jedes Werk trägt das Thema, zu dem es gehört – ${themenRegel}.

${kiSchemaText(jahrRegel.replace(/^\n/, ''), artikel, true, sprache)}${zusatz ? '\n\n## Außerdem\n' + zusatz : ''}`;
    kiPromptZeigen(prompt, 'stoebern-prompt.txt', true);
  };
}
/* ============================================================
   Stöbern, Teil 2: die App in der App
   Laden → Themen wählen → wischen → Sammlung → Blöcke → anlegen
   ============================================================ */

/* Ein Werk aus der Datei auf die Felder bringen, die die App kennt.
   Fremde Dateien dürfen unvollständig sein; fehlt etwas, bleibt es leer. */
function stoWerkNorm(roh, i) {
  const b = roh || {};
  const autoren = normAutoren(b);
  return {
    id: 'w' + i,
    titel: String(b.titel || b.title || 'Ohne Titel').trim(),
    thema: String(b.thema || b.themenfeld || b.kategorie || 'Ohne Thema').trim() || 'Ohne Thema',
    autor: String(b.autor || (autoren.length ? autoren.map(a => a.name).join(', ') : '')).trim(),
    autoren,
    jahr: b.jahr == null ? null : b.jahr,
    seiten: b.seiten == null ? null : b.seiten,
    seitenUnsicher: !!b.seitenUnsicher,
    ausgabe: b.ausgabe || '',
    link: String(b.link || b.doi || b.url || '').trim(),
    beschreibung: b.beschreibung || '',
    kurz: b.kurz || '',
    schwierigkeit: (b.schwierigkeit >= 1 && b.schwierigkeit <= 5) ? +b.schwierigkeit : null,
    besitz: BESITZ[b.besitz] ? b.besitz : 'fehlt'
  };
}

/* Aus einer Datei die Werke ziehen – die Sammlung selbst, aber notfalls
   auch eine gewöhnliche leseliste, deren Bücher dann den Vorrat bilden. */
function stoWerkeAus(roh) {
  if (!roh) return [];
  const liste = Array.isArray(roh) ? roh
    : Array.isArray(roh.werke) ? roh.werke
      : Array.isArray(roh.buecher) ? roh.buecher : [];
  /* Kommt eine leseliste, liefern ihre Blöcke die Themen. */
  const blockNamen = {};
  if (Array.isArray(roh.bloecke)) roh.bloecke.forEach(bl => { blockNamen[bl.id] = bl.name; });
  return liste.map((w, i) => {
    const n = stoWerkNorm(w, i);
    if (n.thema === 'Ohne Thema' && w && blockNamen[w.blockId]) n.thema = blockNamen[w.blockId];
    return n;
  }).filter(w => w.titel && w.titel !== 'Ohne Titel');
}

/* Aus einem gemerkten Werk ein Buch der leseliste machen. */
function stoBuchAus(w, blockId, ord) {
  return {
    id: uid(), blockId, ord,
    titel: w.titel, autor: w.autor,
    autorGeb: null, autorGest: null, autorBio: '', autorEinfluss: [],
    autoren: w.autoren,
    schwierigkeit: w.schwierigkeit,
    jahr: w.jahr, seiten: w.seiten, seitenUnsicher: w.seitenUnsicher,
    ausgabe: w.ausgabe, link: w.link, beschreibung: w.beschreibung, kurz: w.kurz,
    preis: null, status: 'offen', besitz: w.besitz, einkauf: false,
    sessions: [], notizen: []
  };
}

function stoWerkZeile(w, ohneJahr) {
  const a = w.autoren[0];
  const lebt = a ? lebensdaten(a.geb, a.gest) : '';
  return [w.autor || 'ohne Autor', lebt,
    (ohneJahr || w.jahr == null) ? '' : jahrText(w.jahr),
    w.seiten ? (w.seitenUnsicher ? 'ca. ' : '') + w.seiten + ' S.' : '']
    .filter(Boolean).join(' · ');
}

function stoebernOeffnen() {
  let werke = [], themen = [], gewaehlteThemen = new Set();
  let stapel = [], zeiger = 0, gemerkt = [], verlauf = [];
  /* Ein Superlike ist ein Merken mit Nachdruck: das Werk steht ganz normal
     in `gemerkt`, seine Nummer zusätzlich hier. */
  let superIds = new Set();
  let bloecke = [], frei = [], listenName = '';
  let schritt = 'laden';

  /* Der Durchgang wird laufend im Speicher abgelegt: Werke einmal, alles
     andere als Verweis darauf. So steht beim nächsten Mal derselbe Stand. */
  const nachId = id => werke.find(w => w.id === id) || null;
  const merken = () => {
    if (!werke.length) return;
    aendern(() => {
      DB.stoebern = {
        werke,
        themen,
        gewaehlt: Array.from(gewaehlteThemen),
        stapel: stapel.map(w => w.id),
        zeiger,
        gemerkt: gemerkt.map(w => w.id),
        super: Array.from(superIds),
        verlauf: verlauf.map(v => ({ id: v.werk.id, mochte: v.mochte, hoch: !!v.hoch })),
        bloecke: bloecke.map(b => ({ id: b.id, name: b.name, werke: b.werke.map(w => w.id) })),
        frei: frei.map(w => w.id),
        name: listenName,
        schritt
      };
    });
  };
  const wiederherstellen = () => {
    const g = DB.stoebern;
    if (!g || !Array.isArray(g.werke) || !g.werke.length) return false;
    werke = g.werke;
    themen = Array.isArray(g.themen) ? g.themen : [];
    gewaehlteThemen = new Set(Array.isArray(g.gewaehlt) ? g.gewaehlt : themen);
    stapel = (g.stapel || []).map(nachId).filter(Boolean);
    zeiger = clamp(+g.zeiger || 0, 0, stapel.length);
    gemerkt = (g.gemerkt || []).map(nachId).filter(Boolean);
    superIds = new Set((g.super || []).filter(id => gemerkt.some(w => w.id === id)));
    verlauf = (g.verlauf || []).map(v => ({ werk: nachId(v.id), mochte: !!v.mochte, hoch: !!v.hoch }))
      .filter(v => v.werk);
    bloecke = (g.bloecke || []).map(b => ({
      id: b.id || uid(), name: b.name || '', werke: (b.werke || []).map(nachId).filter(Boolean)
    }));
    frei = (g.frei || []).map(nachId).filter(Boolean);
    listenName = g.name || '';
    schritt = ['themen', 'wischen', 'sammlung', 'bloecke'].includes(g.schritt) ? g.schritt : 'themen';
    if (schritt === 'wischen' && !stapel.length) schritt = 'themen';
    /* Wer zurückkommt, will an die Karte, nicht noch einmal durch Laden und
       Themen – auch wenn er beim Weggehen über diese Schritte gegangen ist. */
    if (stapel.length && (schritt === 'laden' || schritt === 'themen')) {
      schritt = zeiger < stapel.length ? 'wischen' : (gemerkt.length ? 'sammlung' : 'wischen');
    }
    return true;
  };

  const node = document.createElement('div');
  node.className = 'sto';
  node.innerHTML = `
    <div class="ovl-head sto-kopf">
      <button class="icon-btn" data-back>${ICON.back}</button>
      <div class="grow"><div class="t" data-t>Stöbern</div><div class="u" data-u></div></div>
      <span class="sto-zaehler" data-zaehler hidden>${ICON.herz}<span data-zahl>0</span></span>
    </div>
    <div class="sto-fort"><i data-fort style="width:0%"></i></div>
    <div class="sto-inhalt" style="flex:1;min-height:0;display:flex;flex-direction:column" data-inhalt></div>`;

  const inhalt = $('[data-inhalt]', node);
  const kopfT = $('[data-t]', node), kopfU = $('[data-u]', node);
  const zaehler = $('[data-zaehler]', node), zahl = $('[data-zahl]', node);
  const fort = $('[data-fort]', node);

  const zaehlerAuffrischen = (puls) => {
    zaehler.hidden = !(schritt === 'wischen' || schritt === 'sammlung');
    zahl.textContent = String(gemerkt.length);
    if (puls) {
      zaehler.classList.remove('puls');
      void zaehler.offsetWidth;
      zaehler.classList.add('puls');
    }
  };

  /* ---------- Schritt 1: laden ---------- */
  const schrittLaden = () => {
    kopfT.textContent = 'Stöbern';
    kopfU.textContent = 'Eine Sammlung laden';
    fort.style.width = '0%';
    inhalt.innerHTML = `
      <div class="sto-body">
        <div class="empty" style="margin:0 0 14px">
          <strong>Werke sichten statt Listen bauen</strong>
          Lade einen Vorrat an Werken. Du bekommst sie einzeln gezeigt und wischst nach rechts,
          was dich interessiert – nach links, was nicht. Aus dem Gemerkten baust du danach die Blöcke.
        </div>
        <button class="btn btn-primary btn-block" data-waehlen>${ICON.books} Sammlung wählen</button>
        <input type="file" accept="application/json,.json,text/plain,.txt" data-file hidden>
        <p class="hinweis" style="padding:14px 0 8px">
          Noch keine Sammlung? Die App baut dir den Prompt dafür – mehrere Themen hinein,
          rund hundert Werke heraus.
        </p>
        <button class="btn btn-block" data-prompt>${ICON.tags} Prompt für eine Sammlung</button>
      </div>`;
    if (werke.length) {
      /* Ein angefangener Durchgang liegt noch da – nur der Vollständigkeit
         halber, denn beim Öffnen wird er ohnehin gleich fortgesetzt. */
      $('.sto-body', inhalt).insertAdjacentHTML('afterbegin',
        `<button class="btn btn-block" style="margin-bottom:14px" data-weiter>${ICON.rueck} Angefangenes fortsetzen</button>`);
      $('[data-weiter]', inhalt).onclick = () => { schritt = 'themen'; malen(); };
    }
    const datei = $('[data-file]', inhalt);
    $('[data-waehlen]', inhalt).onclick = () => datei.click();
    $('[data-prompt]', inhalt).onclick = () => stoebernPromptOeffnen();
    datei.onchange = async () => {
      const f = datei.files[0];
      /* Immer zurücksetzen: sonst meldet das Feld nichts, wenn dieselbe Datei
         ein zweites Mal gewählt wird – etwa nach einem missglückten Versuch. */
      const zuruecksetzen = () => { datei.value = ''; };
      if (!f) { zuruecksetzen(); return; }
      const gelesen = jsonLesen(await f.text());
      if (!gelesen.ok) { zuruecksetzen(); toast(jsonFehlerText(gelesen.fehler), 4500); return; }
      const gefunden = stoWerkeAus(gelesen.wert);
      if (!gefunden.length) {
        zuruecksetzen();
        toast(Array.isArray(gelesen.wert) || gelesen.wert.werke || gelesen.wert.buecher
          ? 'Die Liste in der Datei ist leer.'
          : 'Darin stecken keine Werke – erwartet wird „werke“ oder „buecher“.', 4500);
        return;
      }
      /* Ein angefangener Durchgang mit Gemerktem geht sonst wortlos verloren. */
      if (gemerkt.length && !await bestaetigen('Angefangenes verwerfen?',
        pl(gemerkt.length, 'gemerktes Werk', 'gemerkte Werke') + ' aus dem laufenden Durchgang '
        + (gemerkt.length === 1 ? 'geht' : 'gehen')
        + ' verloren, wenn du eine neue Sammlung lädst.', 'Neue Sammlung', true)) {
        zuruecksetzen();
        return;
      }
      zuruecksetzen();
      werke = gefunden;
      themen = [];
      werke.forEach(w => { if (!themen.includes(w.thema)) themen.push(w.thema); });
      gewaehlteThemen = new Set(themen);
      stapel = []; zeiger = 0; gemerkt = []; verlauf = []; superIds = new Set();
      bloecke = []; frei = []; listenName = '';
      schritt = 'themen';
      merken();
      malen();
    };
  };

  /* ---------- Schritt 2: Themen ---------- */
  const schrittThemen = () => {
    kopfT.textContent = 'Woraus stöbern?';
    kopfU.textContent = pl(werke.length, 'Werk', 'Werke') + ' in ' + pl(themen.length, 'Thema', 'Themen');
    fort.style.width = '8%';
    const zaehle = t => werke.filter(w => w.thema === t).length;
    inhalt.innerHTML = `
      <div class="sto-body">
        <p class="hinweis" style="padding:0 0 12px">Tippe ein Thema an, um es aus dem Stapel zu nehmen.</p>
        <div class="list-card">${themen.map(t => `
          <button class="rowline" data-thema="${esc(t)}" style="width:100%;text-align:left">
            <span class="status-btn" data-hk style="width:24px;height:24px"></span>
            <span class="grow"><span class="rn">${esc(t)}</span>
              <span class="rm">${pl(zaehle(t), 'Werk', 'Werke')}</span></span>
          </button>`).join('')}</div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-sm" data-alle style="flex:1">Alle</button>
          <button class="btn btn-sm" data-keine style="flex:1">Keines</button>
        </div>
        <label class="optzeile" style="display:flex;gap:9px;align-items:flex-start;font-size:13px;color:var(--text-2);margin-top:16px">
          <input type="checkbox" data-mischen checked style="width:auto;margin-top:3px">
          <span><strong style="color:var(--text)">Durchmischen</strong><br>Die Themen wechseln sich ab, statt blockweise zu kommen.</span>
        </label>
      </div>
      <div class="sto-fuss">
        <button class="btn btn-primary btn-block" data-los></button>
      </div>`;

    const auffrischen = () => {
      $$('[data-thema]', inhalt).forEach(b => {
        const an = gewaehlteThemen.has(b.dataset.thema);
        const hk = $('[data-hk]', b);
        hk.innerHTML = an ? ICON.check : '';
        hk.style.cssText = 'width:24px;height:24px;' + (an
          ? 'border-color:var(--accent);color:var(--accent);background:var(--accent-soft)' : '');
      });
      const n = werke.filter(w => gewaehlteThemen.has(w.thema)).length;
      const los = $('[data-los]', inhalt);
      los.textContent = n ? 'Losstöbern · ' + pl(n, 'Werk', 'Werke') : 'Kein Thema gewählt';
      los.disabled = !n;
    };
    $$('[data-thema]', inhalt).forEach(b => b.onclick = () => {
      const t = b.dataset.thema;
      gewaehlteThemen.has(t) ? gewaehlteThemen.delete(t) : gewaehlteThemen.add(t);
      auffrischen();
    });
    $('[data-alle]', inhalt).onclick = () => { gewaehlteThemen = new Set(themen); auffrischen(); };
    $('[data-keine]', inhalt).onclick = () => { gewaehlteThemen.clear(); auffrischen(); };
    $('[data-los]', inhalt).onclick = () => {
      stapel = werke.filter(w => gewaehlteThemen.has(w.thema));
      if ($('[data-mischen]', inhalt).checked) stapel = stoMischen(stapel);
      zeiger = 0; gemerkt = []; verlauf = []; superIds = new Set();
      schritt = 'wischen';
      malen();
    };
    auffrischen();
  };

  /* Die Themen abwechselnd ziehen, damit nicht alles am Stück kommt. */
  const stoMischen = (liste) => {
    const faecher = new Map();
    liste.forEach(w => {
      if (!faecher.has(w.thema)) faecher.set(w.thema, []);
      faecher.get(w.thema).push(w);
    });
    const reihen = Array.from(faecher.values());
    const out = [];
    let i = 0;
    while (out.length < liste.length) {
      const r = reihen[i % reihen.length];
      if (r.length) out.push(r.shift());
      i++;
      if (reihen.every(x => !x.length)) break;
    }
    return out;
  };

  /* ---------- Schritt 3: wischen ---------- */
  const schrittWischen = () => {
    kopfT.textContent = 'Stöbern';
    inhalt.innerHTML = `
      <div class="stoBuehne">
        <div class="stoDeck" data-deck>
          <div class="stoHerz" data-herz>${ICON.herz}</div>
        </div>
      </div>
      <div class="sto-fuss">
        <div class="stoKnoepfe">
          <button class="nein" data-nein aria-label="Weg">${ICON.x}</button>
          <button class="rueck" data-rueck aria-label="Zurück">${ICON.rueck}</button>
          <button class="super" data-super aria-label="Unbedingt">${STOSTERN}</button>
          <button class="ja" data-ja aria-label="Merken">${ICON.herz}</button>
        </div>
        <button class="btn btn-block btn-ghost btn-sm" style="margin-top:10px" data-fertig></button>
      </div>`;
    const deck = $('[data-deck]', inhalt);
    const herz = $('[data-herz]', inhalt);
    let karten = [];
    let sperre = false;

    const tiefeSetzen = (el, t, f) => {
      const s = 1 - t * 0.04 + f * 0.04, y = t * 26 - f * 26;
      el.style.transform = `translateY(${y}px) scale(${s})`;
    };

    const kopfAuffrischen = () => {
      kopfU.textContent = Math.min(zeiger + 1, stapel.length) + ' von ' + stapel.length;
      fort.style.width = (zeiger / Math.max(1, stapel.length) * 100) + '%';
      $('[data-rueck]', inhalt).disabled = !verlauf.length;
      const f = $('[data-fertig]', inhalt);
      f.textContent = gemerkt.length
        ? 'Fertig – ' + pl(gemerkt.length, 'Werk gemerkt', 'Werke gemerkt')
        : 'Noch nichts gemerkt';
      f.disabled = !gemerkt.length;
      zaehlerAuffrischen(false);
    };

    const karteBauen = (w) => {
      const el = document.createElement('div');
      el.className = 'stoKarte';
      el.innerHTML = `
        <span class="kStempel kJa">MERKEN</span>
        <span class="kStempel kNein">WEG</span>
        <span class="kStempel kSuper">UNBEDINGT</span>
        <div class="kKopf">
          <span class="kThema">${esc(w.thema)}</span>
          <span class="kJahr num">${w.jahr != null ? esc(jahrText(w.jahr)) : ''}</span>
        </div>
        <div class="kTitel">${esc(w.titel)}</div>
        <div class="kAutor">${esc(stoWerkZeile(w, true))}</div>
        ${w.kurz ? `<div class="kKurz">${esc(w.kurz)}</div>` : ''}
        ${w.beschreibung ? `<div class="kText">${esc(w.beschreibung)}</div>` : '<div class="kText"></div>'}
        ${w.beschreibung && w.beschreibung.length > 260 ? '<button class="kMehr" data-mehr>Ganzen Text lesen</button>' : ''}
        <div class="kFuss">
          ${w.schwierigkeit ? stufeHtml(w.schwierigkeit) : ''}
          ${w.ausgabe ? `<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(w.ausgabe)}</span>` : ''}
        </div>`;
      const mehr = $('[data-mehr]', el);
      if (mehr) mehr.onclick = e => { e.stopPropagation(); stoWerkBlatt(w); };
      return el;
    };

    const deckMalen = () => {
      deck.querySelectorAll('.stoKarte').forEach(n => n.remove());
      karten = [];
      const rest = stapel.length - zeiger;
      if (rest <= 0) { schritt = 'sammlung'; malen(); return; }
      for (let t = Math.min(2, rest - 1); t >= 0; t--) {
        const el = karteBauen(stapel[zeiger + t]);
        el.style.zIndex = String(10 - t);
        if (t > 0) el.classList.add('hinten');
        tiefeSetzen(el, t, 0);
        deck.appendChild(el);
        karten.unshift({ el, werk: stapel[zeiger + t] });
      }
      if (karten[0]) ziehenBinden(karten[0].el);
      kopfAuffrischen();
    };

    /* Die Entscheidung festhalten und zur nächsten Karte gehen. */
    const entscheiden = (mochte, hoch) => {
      const w = stapel[zeiger];
      if (!w) return;
      verlauf.push({ werk: w, mochte, hoch: !!hoch });
      if (mochte) { gemerkt.push(w); zaehlerAuffrischen(true); }
      if (hoch) superIds.add(w.id);
      zeiger++;
      deckMalen();
      merken();
    };

    /* richtung: -1 weg, 1 merken, 0 nach oben – das Superlike. */
    const wegfliegen = (richtung) => {
      if (sperre || !karten[0]) return;
      sperre = true;
      const el = karten[0].el;
      const b = deck.clientWidth || 320, h = deck.clientHeight || 460;
      const hoch = richtung === 0;
      el.style.transition = 'transform .38s cubic-bezier(.3,.6,.4,1),opacity .38s ease';
      el.style.transform = hoch
        ? `translate(0,${-h * 1.25}px) rotate(-4deg) scale(.94)`
        : `translate(${richtung * b * 1.5}px,${richtung * 40}px) rotate(${richtung * 26}deg)`;
      el.style.opacity = '0';
      const st = $('.' + (hoch ? 'kSuper' : richtung > 0 ? 'kJa' : 'kNein'), el);
      if (st) st.style.opacity = '1';
      if (richtung >= 0) {
        herz.classList.toggle('blau', hoch);
        herz.innerHTML = hoch ? STOSTERN : ICON.herz;
        herz.classList.remove('los');
        void herz.offsetWidth;
        herz.classList.add('los');
      }
      if (karten[1]) tiefeSetzen(karten[1].el, 1, 1);
      setTimeout(() => { sperre = false; entscheiden(richtung >= 0, hoch); }, 300);
    };

    const zurueck = () => {
      if (sperre || !verlauf.length) return;
      const letzt = verlauf.pop();
      if (letzt.mochte) {
        const i = gemerkt.lastIndexOf(letzt.werk);
        if (i >= 0) gemerkt.splice(i, 1);
        zaehlerAuffrischen(false);
      }
      if (letzt.hoch) superIds.delete(letzt.werk.id);
      zeiger = Math.max(0, zeiger - 1);
      deckMalen();
      merken();
      /* Von der Seite wieder hereinschieben, aus der sie verschwunden ist. */
      const el = karten[0] && karten[0].el;
      if (el) {
        const b = deck.clientWidth || 320;
        el.style.transition = 'none';
        el.style.transform = letzt.hoch
          ? `translate(0,${-(deck.clientHeight || 460) * 1.1}px) scale(.94)`
          : `translate(${(letzt.mochte ? 1 : -1) * b * 1.2}px,0) rotate(${(letzt.mochte ? 1 : -1) * 18}deg)`;
        void el.offsetWidth;
        el.style.transition = 'transform .34s cubic-bezier(.2,.7,.3,1)';
        tiefeSetzen(el, 0, 0);
      }
    };

    /* Ziehen mit dem Finger: die Karte folgt, kippt und stempelt sich. */
    const ziehenBinden = (el) => {
      let x0 = 0, y0 = 0, dx = 0, dy = 0, zieht = false, zeigerId = null;
      const stJa = $('.kJa', el), stNein = $('.kNein', el), stSuper = $('.kSuper', el);
      const schwelle = () => Math.max(70, (deck.clientWidth || 320) * 0.26);
      const schwelleHoch = () => Math.max(80, (deck.clientHeight || 460) * 0.18);
      /* Nach oben zählt nur, was auch wirklich nach oben geht. */
      const hochZug = () => -dy > Math.abs(dx) * 1.2 && dy < 0;

      const setzen = () => {
        const hoch = hochZug();
        el.style.transform = hoch
          ? `translate(${dx * 0.4}px,${dy}px) rotate(${dx * 0.02}deg)`
          : `translate(${dx}px,${dy * 0.35}px) rotate(${dx * 0.05}deg)`;
        const f = hoch ? clamp(-dy / schwelleHoch(), 0, 1) : clamp(Math.abs(dx) / schwelle(), 0, 1);
        if (stJa) stJa.style.opacity = !hoch && dx > 0 ? String(f) : '0';
        if (stNein) stNein.style.opacity = !hoch && dx < 0 ? String(f) : '0';
        if (stSuper) stSuper.style.opacity = hoch ? String(f) : '0';
        if (karten[1]) tiefeSetzen(karten[1].el, 1, f);
      };

      el.addEventListener('pointerdown', e => {
        if (sperre || (e.target.closest && e.target.closest('[data-mehr]'))) return;
        zieht = true; zeigerId = e.pointerId;
        x0 = e.clientX; y0 = e.clientY; dx = dy = 0;
        el.style.transition = 'none';
        window.__zieht = true;
        try { el.setPointerCapture(zeigerId); } catch (err) { }
      });
      el.addEventListener('pointermove', e => {
        if (!zieht || e.pointerId !== zeigerId) return;
        dx = e.clientX - x0; dy = e.clientY - y0;
        setzen();
      });
      const loslassen = () => {
        if (!zieht) return;
        zieht = false;
        window.__zieht = false;
        try { el.releasePointerCapture(zeigerId); } catch (err) { }
        el.style.transition = '';
        if (hochZug() && -dy > schwelleHoch()) { wegfliegen(0); return; }
        if (Math.abs(dx) > schwelle()) { wegfliegen(dx > 0 ? 1 : -1); return; }
        el.style.transition = 'transform .3s cubic-bezier(.2,.8,.3,1)';
        tiefeSetzen(el, 0, 0);
        if (stJa) stJa.style.opacity = '0';
        if (stNein) stNein.style.opacity = '0';
        if (stSuper) stSuper.style.opacity = '0';
        if (karten[1]) tiefeSetzen(karten[1].el, 1, 0);
      };
      el.addEventListener('pointerup', loslassen);
      el.addEventListener('pointercancel', loslassen);
      /* Ein Tipp öffnet die ganze Beschreibung. */
      el.addEventListener('click', e => {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6 || (e.target.closest && e.target.closest('[data-mehr]'))) return;
        const w = karten[0] && karten[0].werk;
        if (w) stoWerkBlatt(w);
      });
    };

    $('[data-nein]', inhalt).onclick = () => wegfliegen(-1);
    $('[data-super]', inhalt).onclick = () => wegfliegen(0);
    $('[data-ja]', inhalt).onclick = () => wegfliegen(1);
    $('[data-rueck]', inhalt).onclick = zurueck;
    $('[data-fertig]', inhalt).onclick = () => { schritt = 'sammlung'; malen(); };
    deckMalen();
  };

  /* ---------- Schritt 4: Sammlung ---------- */
  const schrittSammlung = () => {
    kopfT.textContent = 'Gemerkt';
    kopfU.textContent = pl(gemerkt.length, 'Werk', 'Werke')
      + (zeiger < stapel.length ? ' · ' + (stapel.length - zeiger) + ' ungesichtet' : '');
    fort.style.width = '66%';
    if (!gemerkt.length) {
      inhalt.innerHTML = `
        <div class="sto-body">
          <div class="empty" style="margin:0">
            <strong>Noch nichts gemerkt</strong>
            Wische nach rechts, was dich interessiert – daraus entsteht die leseliste.
          </div>
        </div>
        <div class="sto-fuss"><button class="btn btn-block" data-weiter>Weiter stöbern</button></div>`;
      $('[data-weiter]', inhalt).onclick = () => { schritt = 'wischen'; malen(); };
      return;
    }
    const nachThema = [];
    /* Was nach oben gewischt wurde, steht in seinem Thema ganz oben. */
    const sortiert = gemerkt.slice().sort((a, b) =>
      (superIds.has(b.id) ? 1 : 0) - (superIds.has(a.id) ? 1 : 0));
    sortiert.forEach(w => {
      let g = nachThema.find(x => x.thema === w.thema);
      if (!g) { g = { thema: w.thema, werke: [] }; nachThema.push(g); }
      g.werke.push(w);
    });
    inhalt.innerHTML = `
      <div class="sto-body">
        ${nachThema.map(g => `
          <div class="section-head" style="padding:0"><h2>${esc(g.thema)}</h2>
            <span class="eyebrow">${g.werke.length}</span></div>
          <div class="list-card" style="margin-bottom:16px">${g.werke.map(w => `
            <div class="stoWerk${superIds.has(w.id) ? ' super' : ''}">
              <span class="grow"><span class="wn">${superIds.has(w.id) ? STOSTERN : ''}${esc(w.titel)}</span>
                <span class="wm">${esc(stoWerkZeile(w))}</span></span>
              <button class="icon-btn" data-raus="${w.id}" aria-label="Verwerfen">${ICON.x}</button>
            </div>`).join('')}</div>`).join('')}
      </div>
      <div class="sto-fuss">
        ${zeiger < stapel.length ? '<button class="btn btn-block btn-sm" style="margin-bottom:8px" data-weiter>Weiter stöbern · ' + (stapel.length - zeiger) + ' offen</button>' : ''}
        <button class="btn btn-primary btn-block" data-bloecke>Zu Blöcken ordnen</button>
      </div>`;
    $$('[data-raus]', inhalt).forEach(b => b.onclick = () => {
      const i = gemerkt.findIndex(w => w.id === b.dataset.raus);
      if (i >= 0) gemerkt.splice(i, 1);
      zaehlerAuffrischen(false);
      malen();
    });
    const w8 = $('[data-weiter]', inhalt);
    if (w8) w8.onclick = () => { schritt = 'wischen'; malen(); };
    $('[data-bloecke]', inhalt).onclick = () => {
      /* Vorschlag: jedes Thema wird ein Block, in der Reihenfolge des Vorrats. */
      bloecke = [];
      frei = [];
      gemerkt.forEach(w => {
        let bl = bloecke.find(x => x.name === w.thema);
        if (!bl) { bl = { id: uid(), name: w.thema, werke: [] }; bloecke.push(bl); }
        bl.werke.push(w);
      });
      if (!listenName) listenName = bloecke.length === 1 ? bloecke[0].name : 'Meine Auswahl';
      schritt = 'bloecke';
      malen();
    };
  };

  /* ---------- Schritt 5: Blöcke ---------- */
  const schrittBloecke = () => {
    kopfT.textContent = 'Blöcke ordnen';
    const n = bloecke.reduce((s, b) => s + b.werke.length, 0) + frei.length;
    kopfU.textContent = pl(bloecke.length, 'Block', 'Blöcke') + ' · ' + pl(n, 'Werk', 'Werke');
    fort.style.width = '100%';

    const werkZeile = (w, blockId) => `
      <div class="stoWerk">
        <span class="grow"><span class="wn">${esc(w.titel)}</span>
          <span class="wm">${esc(stoWerkZeile(w))}</span></span>
        <button class="icon-btn" data-schieb="${w.id}" data-von="${blockId}" aria-label="In anderen Block">${ICON.schieben}</button>
        <button class="icon-btn" data-raus="${w.id}" data-von="${blockId}" aria-label="Verwerfen">${ICON.x}</button>
      </div>`;

    inhalt.innerHTML = `
      <div class="sto-body">
        <div class="field">
          <label>Name der neuen leseliste</label>
          <input type="text" data-name value="${esc(listenName)}" placeholder="z. B. Meine Auswahl">
        </div>
        ${bloecke.map((bl, i) => `
          <div class="stoBlock${bl.werke.length ? '' : ' leer'}">
            <div class="bk">
              <input type="text" data-bname="${bl.id}" value="${esc(bl.name)}" placeholder="Blockname">
              <span class="bz">${bl.werke.length}</span>
              <button class="icon-btn" data-hoch="${bl.id}" aria-label="Nach oben"${i ? '' : ' disabled'}>${ICON.up}</button>
              <button class="icon-btn" data-runter="${bl.id}" aria-label="Nach unten"${i < bloecke.length - 1 ? '' : ' disabled'}>${ICON.down}</button>
              <button class="icon-btn" data-blweg="${bl.id}" aria-label="Block auflösen">${ICON.trash}</button>
            </div>
            <div class="bw">${bl.werke.length
        ? bl.werke.map(w => werkZeile(w, bl.id)).join('')
        : '<div class="stoLeer">Leer – verschiebe Werke hierher oder löse den Block auf.</div>'}</div>
          </div>`).join('')}
        <button class="btn btn-block btn-sm" data-neublock>${ICON.plus} Block anlegen</button>
        ${frei.length ? `
          <div class="section-head" style="margin-top:20px;padding:0"><h2>Ohne Block</h2>
            <span class="eyebrow">${frei.length}</span></div>
          <div class="list-card">${frei.map(w => werkZeile(w, '')).join('')}</div>
          <p class="hinweis" style="padding:8px 0 0">Was hier stehen bleibt, kommt als Block „Weitere“ mit.</p>` : ''}
      </div>
      <div class="sto-fuss">
        <button class="btn btn-primary btn-block" data-anlegen></button>
      </div>`;

    const anlegen = $('[data-anlegen]', inhalt);
    anlegen.textContent = n ? 'leseliste anlegen · ' + pl(n, 'Werk', 'Werke') : 'Nichts zu übernehmen';
    anlegen.disabled = !n;

    $('[data-name]', inhalt).oninput = e => { listenName = e.target.value; merken(); };
    $$('[data-bname]', inhalt).forEach(i => i.oninput = () => {
      const bl = bloecke.find(x => x.id === i.dataset.bname);
      if (bl) { bl.name = i.value; merken(); }
    });
    $$('[data-hoch]', inhalt).forEach(b => b.onclick = () => {
      const i = bloecke.findIndex(x => x.id === b.dataset.hoch);
      if (i > 0) { bloecke.splice(i - 1, 0, bloecke.splice(i, 1)[0]); malen(); }
    });
    $$('[data-runter]', inhalt).forEach(b => b.onclick = () => {
      const i = bloecke.findIndex(x => x.id === b.dataset.runter);
      if (i >= 0 && i < bloecke.length - 1) { bloecke.splice(i + 1, 0, bloecke.splice(i, 1)[0]); malen(); }
    });
    $$('[data-blweg]', inhalt).forEach(b => b.onclick = () => {
      const i = bloecke.findIndex(x => x.id === b.dataset.blweg);
      if (i < 0) return;
      frei = frei.concat(bloecke[i].werke);
      bloecke.splice(i, 1);
      malen();
    });
    $('[data-neublock]', inhalt).onclick = () => {
      bloecke.push({ id: uid(), name: 'Neuer Block', werke: [] });
      malen();
    };
    $$('[data-raus]', inhalt).forEach(b => b.onclick = () => {
      const von = b.dataset.von;
      const topf = von ? (bloecke.find(x => x.id === von) || {}).werke : frei;
      if (!topf) return;
      const i = topf.findIndex(w => w.id === b.dataset.raus);
      if (i >= 0) {
        const w = topf.splice(i, 1)[0];
        const g = gemerkt.indexOf(w);
        if (g >= 0) gemerkt.splice(g, 1);
      }
      zaehlerAuffrischen(false);
      malen();
    });
    $$('[data-schieb]', inhalt).forEach(b => b.onclick = () => {
      const von = b.dataset.von;
      const topf = von ? (bloecke.find(x => x.id === von) || {}).werke : frei;
      if (!topf) return;
      const w = topf.find(x => x.id === b.dataset.schieb);
      if (!w) return;
      stoVerschieben(w, () => {
        const i = topf.indexOf(w);
        if (i >= 0) topf.splice(i, 1);
      });
    });
    $('[data-anlegen]', inhalt).onclick = () => fertigstellen();
  };

  /* Wohin mit diesem Werk? */
  const stoVerschieben = (w, entfernen) => {
    const s = blatt('„' + w.titel + '“ verschieben', `
      <div class="list-card" data-l></div>
      <button class="btn btn-block btn-sm" style="margin-top:12px" data-neu>${ICON.plus} In neuen Block</button>`,
      { fokus: false });
    const l = $('[data-l]', s);
    l.innerHTML = bloecke.map(bl => `
      <button class="rowline" data-zu="${bl.id}" style="width:100%;text-align:left">
        <span class="grow"><span class="rn">${esc(bl.name || 'Ohne Namen')}</span>
          <span class="rm">${pl(bl.werke.length, 'Werk', 'Werke')}</span></span>
        <span class="chev">${ICON.chev}</span>
      </button>`).join('')
      + `<button class="rowline" data-zu="" style="width:100%;text-align:left">
           <span class="grow"><span class="rn">Ohne Block</span>
             <span class="rm">später zuordnen</span></span>
           <span class="chev">${ICON.chev}</span></button>`;
    $$('[data-zu]', s).forEach(b => b.onclick = () => {
      entfernen();
      const ziel = b.dataset.zu ? bloecke.find(x => x.id === b.dataset.zu) : null;
      if (ziel) ziel.werke.push(w); else frei.push(w);
      layerSchliessen();
      malen();
    });
    $('[data-neu]', s).onclick = () => {
      const bl = { id: uid(), name: w.thema || 'Neuer Block', werke: [] };
      entfernen();
      bl.werke.push(w);
      bloecke.push(bl);
      layerSchliessen();
      malen();
    };
  };

  const fertigstellen = () => {
    const name = (listenName || '').trim() || 'Meine Auswahl';
    const fertig = bloecke.filter(b => b.werke.length).map(b => ({
      name: (b.name || '').trim() || 'Ohne Namen', werke: b.werke
    }));
    if (frei.length) fertig.push({ name: 'Weitere', werke: frei.slice() });
    if (!fertig.length) { toast('Kein Werk zugeordnet.'); return; }
    let planId = null;
    aendern(() => {
      const plan = { id: uid(), name, ord: DB.lesepleane.length };
      DB.lesepleane.push(plan);
      planId = plan.id;
      DB.einstellungen.aktiverPlanId = plan.id;
      fertig.forEach((bl, i) => {
        const block = { id: uid(), planId: plan.id, name: bl.name, notiz: '', ord: i };
        DB.bloecke.push(block);
        bl.werke.forEach((w, j) => DB.buecher.push(stoBuchAus(w, block.id, j)));
      });
    });
    const anzahl = fertig.reduce((s, b) => s + b.werke.length, 0);
    /* Das Gemerkte ist verbraucht; der Vorrat und der Stand im Stapel
       bleiben, damit man später weiterstöbern kann. */
    gemerkt = []; verlauf = []; bloecke = []; frei = []; listenName = '';
    superIds = new Set();
    schritt = zeiger < stapel.length ? 'wischen' : 'themen';
    merken();
    layerSchliessen();
    offeneBloecke.clear();
    if (aktiverTab !== 'plan') tabWechseln('plan'); else viewMalen();
    toast('„' + name + '“ angelegt: ' + pl(fertig.length, 'Block', 'Blöcke') + ', ' + pl(anzahl, 'Werk', 'Werke') + '.', 4000);
  };

  /* Ein Schritt zurück gehört in den Fuss – die Kopfzeile bleibt die der App. */
  const SCHRITT_ZURUECK = { themen: 'laden', wischen: 'themen', sammlung: 'wischen', bloecke: 'sammlung' };
  const SCHRITT_NAME = { laden: 'Laden', themen: 'Themen', wischen: 'Karten', sammlung: 'Sammlung' };
  const fussZurueck = () => {
    const zu = SCHRITT_ZURUECK[schritt];
    const fuss = $('.sto-fuss', inhalt);
    if (!zu || !fuss) return;
    const b = document.createElement('button');
    b.className = 'sto-zurueck';
    b.innerHTML = ICON.back + '<span>' + SCHRITT_NAME[zu] + '</span>';
    b.onclick = () => { schritt = zu; malen(); };
    fuss.appendChild(b);
  };

  const malen = () => {
    if (schritt === 'laden') schrittLaden();
    else if (schritt === 'themen') schrittThemen();
    else if (schritt === 'wischen') schrittWischen();
    else if (schritt === 'sammlung') schrittSammlung();
    else schrittBloecke();
    fussZurueck();
    zaehlerAuffrischen(false);
    merken();
  };

  /* Der Pfeil oben tut, was er in jeder anderen Ebene tut: er schliesst sie.
     Zwischen den Schritten geht es unten im Fuss zurück. */
  $('[data-back]', node).onclick = () => layerSchliessen();

  layerOeffnen(node, () => {
    window.__zieht = false;
    /* Beim Verlassen wird der Stand sofort weggeschrieben – die
       Selbstsicherung käme erst Sekunden später. */
    merken();
    Store.sichern(true);
  });
  /* Wiedereinstieg ohne Ansage: der Stapel liegt einfach wieder da, wo er lag. */
  wiederherstellen();
  malen();
}

/* Ein Werk in ganzer Länge – aus der Karte heraus. */
function stoWerkBlatt(w) {
  blatt(w.titel, `
    <p class="muted" style="font-size:12.5px;margin-bottom:12px">${esc(stoWerkZeile(w))}</p>
    ${w.kurz ? `<p style="font-size:14px;font-style:italic;color:var(--text-2);line-height:1.55;margin-bottom:12px">${esc(w.kurz)}</p>` : ''}
    ${w.beschreibung ? `<p class="desc">${esc(w.beschreibung).replace(/\n/g, '<br>')}</p>` : ''}
    ${w.autoren.filter(a => a.bio).map(a => `
      <div class="section-head" style="margin:18px 0 6px;padding:0"><h2>${esc(a.name)}</h2>
        ${lebensdaten(a.geb, a.gest) ? `<span class="eyebrow num">${esc(lebensdaten(a.geb, a.gest))}</span>` : ''}</div>
      <p class="desc" style="font-size:13px">${esc(a.bio)}</p>`).join('')}
    ${w.ausgabe ? `<p class="hinweis" style="padding:14px 0 0">${esc(w.ausgabe)}</p>` : ''}
    ${w.link ? `<p style="font-size:12px;margin-top:8px"><a href="${esc(w.link)}" target="_blank" rel="noopener noreferrer"
      style="color:var(--accent);word-break:break-all">${esc(w.link)}</a></p>` : ''}`,
    { fokus: false });
}

