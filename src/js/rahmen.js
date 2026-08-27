/* ============================================================
   Rahmen: Tabs, Kopfzeile
   ============================================================ */
/* „tat“ statt Ansicht: das Stöbern ist keine Registerkarte, sondern öffnet
   eine eigene Ebene – es steht nur der Erreichbarkeit halber in der Leiste. */
const TABS = [
  { id: 'plan', label: 'Liste', icon: ICON.books },
  { id: 'stoebern', label: 'Stöbern', icon: ICON.herz, tat: () => stoebernOeffnen() },
  { id: 'themen', label: 'Notizen', icon: ICON.tags },
  { id: 'mehr', label: 'Mehr', icon: ICON.more }
];
const ANSICHTEN = TABS.filter(t => !t.tat).map(t => t.id);
let aktiverTab = 'plan';

function tabbarMalen() {
  $('#tabbar').innerHTML = TABS.map(t =>
    `<button data-tab="${t.id}" aria-selected="${t.id === aktiverTab}">${t.icon}<span>${t.label}</span></button>`).join('');
  $('#tabbar').onclick = e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    const t = TABS.find(x => x.id === b.dataset.tab);
    if (t && t.tat) t.tat(); else tabWechseln(b.dataset.tab);
  };
}
function tabWechseln(id) {
  aktiverTab = id;
  tabbarMalen();
  viewMalen();
  window.scrollTo(0, 0);
}
function viewMalen() {
  const v = $('#view');
  if (aktiverTab === 'plan') planMalen(v);
  else if (aktiverTab === 'themen') notizenTabMalen(v);
  else mehrMalen(v);
  kopfMalen();
  nowbarMalen();
  /* Liegt die Übersicht offen, wandert die Änderung gleich mit hinein. */
  if (ueOffen) ueOffen();
}
let ueOffen = null;
function kopfMalen() {
  const buecher = buecherAktiv();
  const ges = buecher.length;
  const gelesen = buecher.filter(b => b.status === 'gelesen').length;
  const lese = buecher.filter(b => b.status === 'lese').length;
  $('#progText').textContent = gelesen + ' / ' + ges + ' gelesen';
  const seiten = buecher.filter(b => b.status === 'gelesen').reduce((s, b) => s + (b.seiten || 0), 0);
  $('#progRight').textContent = seiten ? fmtZahl(seiten) + ' Seiten' : '';
  $('#barRead').style.width = (ges ? gelesen / ges * 100 : 0) + '%';
  $('#barActive').style.width = (ges ? lese / ges * 100 : 0) + '%';

  const zr = $('#zielRow');
  const z = zielHeute();
  if (!z.ziel) { zr.hidden = true; }
  else {
    zr.hidden = false;
    zr.classList.toggle('geschafft', z.geschafft);
    zr.innerHTML = `
      <span class="zt">Heute</span>
      <span class="zbar"><i style="width:${clamp(z.gelesen / z.ziel * 100, 0, 100)}%"></i></span>
      <span class="zn">${z.gelesen} / ${z.ziel} S.${z.geschafft ? ' ✓' : ''}</span>`;
    zr.onclick = () => zielBearbeiten();
  }
}

function zielBearbeiten(nachher) {
  const s = blatt('Tagesziel', `
    <div class="field">
      <label>Seiten pro Tag</label>
      <input type="number" data-z value="${DB.einstellungen.zielSeiten || ''}" placeholder="z.B. 20">
      <span class="hint">Gezählt wird aus den Lese-Sitzungen, also aus „Seite von“ und „Seite bis“. Leer lassen schaltet das Ziel ab.</span>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`);
  $('[data-ok]', s).onclick = () => {
    const v = num($('[data-z]', s).value);
    aendern(() => { DB.einstellungen.zielSeiten = (v && v > 0) ? Math.round(v) : null; });
    layerSchliessen();
    viewMalen();
    if (nachher) nachher();
  };
}

/* ============================================================
   Einführung beim ersten Mal
   ============================================================ */
function einfuehrungZeigen() {
  let schritt = 0;
  const node = document.createElement('div');
  node.className = 'overlay';
  node.innerHTML = `
    <div class="ovl-head">
      <div class="grow"><div class="ovl-title serif">Kurze Einführung</div><div class="ovl-sub" data-zaehler></div></div>
      <button class="btn btn-sm btn-ghost" data-weg>Überspringen</button>
    </div>
    <div class="ovl-body" style="padding:18px 16px 40px" data-body></div>`;

  const fertig = () => {
    aendern(() => { DB.einstellungen.einfuehrung = true; });
    layerSchliessen();
    viewMalen();
  };

  const schritte = [
    {
      titel: 'Deine Daten liegen nicht in dieser Seite',
      text: () => `Die Datei enthält nur das Programm. Alles, was du einträgst, liegt ${Store.modus === 'datei'
        ? 'in <strong>' + esc(Store.dateiname) + '</strong> – dort schreibt die App still hinein.'
        : '<strong>im Speicher dieses Browsers</strong>.'}
        Gesichert wird automatisch: alle ${DB.einstellungen.autosaveSek || 60} Sekunden und kurz nach deiner letzten Eingabe.
        ${Store.modus === 'datei' ? '' : 'Weil es dabei keine Datei gibt, hol dir über den Punkt oben rechts regelmäßig eine Sicherung – ein Tipp genügt.'}`,
      aktion: null
    },
    {
      titel: 'Wie viel willst du am Tag lesen?',
      text: () => 'Das Ziel steht dann oben in der Kopfzeile und füllt sich mit jeder Lese-Sitzung. Du kannst es jederzeit ändern oder weglassen.',
      feld: `<div class="field"><label>Seiten pro Tag</label><input type="number" data-ziel placeholder="z.B. 20" value="${DB.einstellungen.zielSeiten || ''}"></div>`,
      vorWeiter: (body) => {
        const v = num($('[data-ziel]', body).value);
        aendern(() => { DB.einstellungen.zielSeiten = (v && v > 0) ? Math.round(v) : null; });
      }
    },
    {
      titel: 'Eine leseliste anlegen',
      text: () => `Ganz oben steht die <strong>leseliste</strong> – sie bündelt mehrere Blöcke. Du kannst mehrere führen und zwischen ihnen wechseln.
        ${DB.lesepleane.length ? 'Vorhanden: <strong>' + esc(plaeneSortiert().map(x => x.name).join(', ')) + '</strong>.' : ''}`,
      feld: `<div class="field"><label>Name</label><input type="text" data-name placeholder="z.B. Lesestart"></div>
             <p class="hinweis" style="padding:0 0 4px">Oder lade die fertige Liste als Datei – dann sind Blöcke und Bücher gleich mit dabei.</p>
             <button class="btn btn-block" data-import>Fertige Liste aus Datei laden</button>
             <p class="hinweis" style="padding:10px 0 4px">Du hast noch keine Liste, aber eine Frage, eine These oder ein Thema?
               Dann lass sie dir zusammenstellen: Die App baut den Prompt, Claude liefert eine Datei zurück, die du hier lädst.</p>
             <button class="btn btn-block" data-ki>${ICON.tags} Von KI zusammenstellen lassen</button>`,
      vorWeiter: (body) => {
        const name = ($('[data-name]', body).value || '').trim();
        if (!name) return;
        aendern(() => {
          const n = { id: uid(), name, ord: DB.lesepleane.length };
          DB.lesepleane.push(n);
          DB.einstellungen.aktiverPlanId = n.id;
        });
      }
    },
    {
      titel: 'Blöcke gliedern die Liste',
      text: () => `Ein Block ist ein Thema mit mehreren Werken – „Existentialismus“, „Faschismus“, was du willst.
        ${bloeckeSortiert().length ? 'In „' + esc((aktiverPlan() || {}).name || '') + '“ gibt es schon ' + pl(bloeckeSortiert().length, 'Block', 'Blöcke') + '.' : ''}`,
      feld: `<div class="field"><label>Name des Blocks</label><input type="text" data-name placeholder="z.B. Existentialismus"></div>`,
      vorWeiter: (body) => {
        const name = ($('[data-name]', body).value || '').trim();
        if (!name) return;
        const p = aktiverPlan();
        if (!p) return;
        aendern(() => DB.bloecke.push({ id: uid(), planId: p.id, name, notiz: '', ord: bloeckeSortiert().length }));
      }
    },
    {
      titel: 'Und dann die Bücher',
      text: () => `Jedes Buch trägt Beschreibung, Autor, Seitenzahl, Preis und deine Notizen mit Fotos.
        Der Kreis links schaltet weiter: offen → lese ich → gelesen. Langes Drücken öffnet die Schnellaktionen.
        ${DB.buecher.length ? 'Deine Liste hat schon ' + pl(DB.buecher.length, 'Buch', 'Bücher') + '.' : ''}`,
      feld: `<div class="grid2">
               <div class="field"><label>Titel</label><input type="text" data-titel placeholder="Der Fremde"></div>
               <div class="field"><label>Autor</label><input type="text" data-autor placeholder="Albert Camus"></div>
             </div>`,
      vorWeiter: (body) => {
        const titel = ($('[data-titel]', body).value || '').trim();
        if (!titel) return;
        const blk = bloeckeSortiert()[bloeckeSortiert().length - 1];
        if (!blk) return;
        aendern(() => DB.buecher.push({
          id: uid(), blockId: blk.id, ord: buecherIn(blk.id).length, titel,
          autor: ($('[data-autor]', body).value || '').trim(),
          autorGeb: null, autorGest: null, autorBio: '', jahr: null, seiten: null, seitenUnsicher: false,
          ausgabe: '', link: '', beschreibung: '', kurz: '', schwierigkeit: null, preis: null,
          status: 'offen', besitz: 'fehlt', einkauf: false, sessions: [], notizen: []
        }));
      }
    },
    {
      titel: 'Fertig',
      text: () => `Das war alles. Wischen führt zwischen den Ansichten hin und her, die Leiste über der Tableiste startet eine Lese-Sitzung,
        und unter <strong>Mehr</strong> liegen Speicherort, Einkaufsliste und Darstellung. Diese Einführung findest du dort ebenfalls wieder.`,
      aktion: null
    }
  ];

  const malen = () => {
    const sch = schritte[schritt];
    $('[data-zaehler]', node).textContent = 'Schritt ' + (schritt + 1) + ' von ' + schritte.length;
    const body = $('[data-body]', node);
    body.innerHTML = `
      <h2 class="serif" style="font-size:20px;margin-bottom:10px">${esc(sch.titel)}</h2>
      <p class="desc" style="font-size:14px;margin-bottom:16px">${sch.text()}</p>
      ${sch.feld || ''}
      <div class="btn-row" style="margin-top:18px">
        ${schritt > 0 ? '<button class="btn" data-zurueck>Zurück</button>' : ''}
        <button class="btn btn-primary" data-weiter style="flex:1">${schritt === schritte.length - 1 ? 'Loslegen' : 'Weiter'}</button>
      </div>`;
    const imp = $('[data-import]', body);
    if (imp) imp.onclick = () => importDialog(false);
    const ki = $('[data-ki]', body);
    if (ki) ki.onclick = () => kiErstellenOeffnen();
    const zur = $('[data-zurueck]', body);
    if (zur) zur.onclick = () => { schritt--; malen(); };
    $('[data-weiter]', body).onclick = () => {
      if (sch.vorWeiter) sch.vorWeiter(body);
      if (schritt === schritte.length - 1) { fertig(); return; }
      schritt++;
      malen();
      viewMalen();
    };
  };

  $('[data-weg]', node).onclick = fertig;
  layerOeffnen(node, () => { if (!DB.einstellungen.einfuehrung) { aendern(() => { DB.einstellungen.einfuehrung = true; }); } viewMalen(); });
  malen();
}

/* ============================================================
   Start
   ============================================================ */
/* „still“ heisst: ohne Einführung – etwa wenn vom Startbildschirm aus direkt
   das Stöbern aufgeht, das sich sonst die Einführung überstülpen würde. */
function appStarten(still) {
  appFlaeche('app');
  aktiverTab = 'plan';
  themeAnwenden();
  tabbarMalen();
  viewMalen();
  Store.autosaveStarten();
  saveChipMalen();
  if (!still && !DB.einstellungen.einfuehrung) setTimeout(einfuehrungZeigen, 350);
}

