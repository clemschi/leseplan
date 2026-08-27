/* ============================================================
   Ersteinrichtung: Speicherort festlegen
   ============================================================ */
/* Der erste Bildschirm ist nur der Name der App. Alles Weitere steckt hinter
   „Speicherort und Daten“ – wer nichts anrührt, tippt einmal und ist drin. */
/* Zurück auf die Startseite mit allen Apps. Vorher wird gesichert – von dort
   führt kein Weg zurück in einen ungesicherten Stand. */
function zumStartbildschirm() {
  alleLayerSchliessen();
  if (aktiverSpeicher && aktiverSpeicher.modus) aktiverSpeicher.sichern(true);
  clearInterval(nowTick);
  splashZeigen();
}

/* ===== Was allen Apps gemeinsam ist =====
   Hell/Dunkel, Akzentfarbe und Vollbild gehören der Hülle, nicht einer App.
   Damit sie nirgends fehlen, kommen sie überall aus demselben Baustein. */
function huelleEinstellungenHtml(titel) {
  return `
    <div class="section-head" style="margin-top:20px"><h2>${esc(titel || 'Darstellung')}</h2>
      <span class="eyebrow">gilt für alle Apps</span></div>
    <div class="list-card">
      <div class="rowline">
        <span class="grow"><span class="rn">${SHELL.theme === 'light' ? 'Hell' : 'Dunkel'}</span>
          <span class="rm">Auch über das Symbol in der Kopfzeile</span></span>
        <button class="btn btn-sm" data-htheme>Umschalten</button>
      </div>
      <div class="rowline" style="flex-direction:column;align-items:stretch;gap:10px">
        <span><span class="rn">Akzentfarbe</span>
          <span class="rm">${esc(akzentAktiv().name)} – gilt für Knöpfe, Fortschritt und Markierungen</span></span>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          ${AKZENTE.map(a => {
            const farbe = SHELL.theme === 'light' ? a.light : a.dark;
            const ist = a.id === akzentAktiv().id;
            return `<button data-hakzent="${a.id}" title="${esc(a.name)}" aria-label="${esc(a.name)}"
              style="width:30px;height:30px;border-radius:50%;background:${farbe};flex:0 0 auto;
                     border:2px solid ${ist ? 'var(--text)' : 'transparent'};box-shadow:0 0 0 1px var(--border)"></button>`;
          }).join('')}
        </div>
      </div>
      <div class="rowline">
        <span class="grow"><span class="rn">Vollbild</span><span class="rm">${vollbildGeht()
          ? 'Blendet die Leisten des Browsers aus'
          : 'Dieser Browser kann das nicht auf Zuruf. Am iPhone: Teilen-Menü → „Zum Home-Bildschirm“.'}</span></span>
        ${vollbildGeht() ? `<button class="btn btn-sm" data-hvoll>${vollbildAn() ? 'Beenden' : 'Einschalten'}</button>` : ''}
      </div>
      <div class="rowline">
        <span class="grow"><span class="rn">Beim Start ins Vollbild</span>
          <span class="rm">Greift bei der ersten Berührung. Chrome legt dabei jedes Mal
            seinen eigenen Hinweis über den Schirm – der lässt sich von hier aus nicht
            abstellen. Wer ihn los sein will: hier ausschalten, oder die Datei über eine
            Adresse öffnen und auf den Startbildschirm legen.</span></span>
        <button class="btn btn-sm" data-hvollstart>${SHELL.vollbildStart ? 'An' : 'Aus'}</button>
      </div>
      <div class="rowline">
        <span class="grow"><span class="rn">Zur Startseite</span><span class="rm">Alle Apps dieser Datei</span></span>
        <button class="btn btn-sm" data-hheim>Öffnen</button>
      </div>
    </div>`;
}
function huelleEinstellungenBinden(wurzel, neuMalen) {
  const frisch = () => { if (neuMalen) neuMalen(); };
  const t = $('[data-htheme]', wurzel);
  if (t) t.onclick = () => { themeUmschalten(); frisch(); };
  $$('[data-hakzent]', wurzel).forEach(b => b.onclick = () => {
    SHELL.akzent = b.dataset.hakzent;
    shellSchreiben();
    themeAnwenden();
    frisch();
  });
  const v = $('[data-hvoll]', wurzel);
  if (v) v.onclick = () => { vollbildUmschalten(); setTimeout(frisch, 140); };
  const vs = $('[data-hvollstart]', wurzel);
  if (vs) vs.onclick = () => { SHELL.vollbildStart = !SHELL.vollbildStart; shellSchreiben(); frisch(); };
  const h = $('[data-hheim]', wurzel);
  if (h) h.onclick = () => zumStartbildschirm();
}

/* ===== Startbildschirm =====
   Der Homescreen dieser Datei: ein paar Namen auf dem Grund, sonst nichts.
   Jede App bringt ihre eigene Datenbasis mit und wird erst beim Antippen
   geweckt. */
const APPS = [
  { id: 'leseliste', name: 'leseliste', oeffnen: () => leselisteOeffnen() },
  { id: 'kalender', name: 'kalender', oeffnen: () => kalenderOeffnen() },
  { id: 'fastreader', name: 'fastreader', oeffnen: () => fastreaderOeffnen() },
  { id: 'gsund', name: 'g\u2019sund', oeffnen: () => gsundOeffnen() }
];

/* Genau eine App-Fläche liegt offen. */
function appFlaeche(id) {
  $('#setup').hidden = true;
  $$('.appflaeche').forEach(x => { x.hidden = x.id !== id; });
}

function splashZeigen() {
  const s = $('#setup');
  s.innerHTML = `
    <div class="splash">
      <div class="apps">
        ${APPS.map(x => `<button class="app ist" data-app="${x.id}">${esc(x.name)}</button>`).join('')}
      </div>
      <div class="leiste">
        <button class="icon-btn" data-act="theme" title="Hell oder dunkel" aria-label="Hell oder dunkel"></button>
        ${vollbildGeht() ? `<button class="icon-btn" data-act="voll" title="Vollbild" aria-label="Vollbild">${ICON.voll}</button>` : ''}
        <button class="mehr" data-act="mehr">Speicherort und Daten</button>
      </div>
    </div>`;
  s.hidden = false;
  $$('.appflaeche').forEach(x => { x.hidden = true; });
  const themeKnopf = () => {
    const b = $('[data-act="theme"]', s);
    if (b) b.innerHTML = SHELL.theme === 'light' ? ICON.moon : ICON.sun;
  };
  themeKnopf();

  s.onclick = (e) => {
    const b = e.target.closest('[data-act]');
    if (b) {
      const act = b.dataset.act;
      if (act === 'theme') { themeUmschalten(); themeKnopf(); return; }
      if (act === 'voll') { vollbildUmschalten(); return; }
      if (act === 'mehr') { setupZeigen(false, true); return; }
      return;
    }
    const k = e.target.closest('[data-app]');
    if (!k) return;
    /* Erst das Vollbild – nach einem await ist die Geste verbraucht. */
    try { if (SHELL.vollbildStart && vollbildGeht() && !vollbildAn()) vollbildUmschalten(); } catch (err) { }
    const app = APPS.find(x => x.id === k.dataset.app);
    if (app) app.oeffnen();
  };
}

/* Die kurze Erklärung, einmal ausführlich. */
function speicherErklaerung() {
  blatt('Wo liegen meine Daten?', `
    <div class="erklaer">
      <div class="e-schritt">
        <span class="e-nr num">1</span>
        <span class="e-text"><b>Beim Tippen</b> stehen Änderungen zunächst nur im Arbeitsspeicher.
          Der Punkt oben zeigt dann <i>offen</i>.</span>
      </div>
      <div class="e-schritt">
        <span class="e-nr num">2</span>
        <span class="e-text"><b>Sekunden später</b> schreibt die App alles in die Ablage des Browsers –
          auf dem Gerätespeicher, aber unsichtbar im Dateimanager. Darum ist nach dem Schließen
          alles wieder da. Jede App hat dort ihren eigenen Platz.</span>
      </div>
      <div class="e-schritt">
        <span class="e-nr num">3</span>
        <span class="e-text"><b>Eine Datei</b> entsteht nur, wenn du sie verlangst:
          <i>Mehr → Jetzt sichern</i> legt eine JSON in die Downloads. Sie ist eine Kopie vom
          Augenblick – sie läuft nicht mit.</span>
      </div>
    </div>
    <p class="hinweis" style="padding:14px 0 0">Die Ablage hängt an dieser geöffneten Seite. Lädst du die
      HTML neu herunter, ist die neue Kopie leer. Öffne sie darum immer über dasselbe Symbol auf dem
      Startbildschirm des Telefons – und sichere ab und zu als Datei.</p>
    <p class="hinweis" style="padding:10px 0 0">Auf dem Rechner (Chrome, Edge) gibt es zusätzlich
      „Neue Datei anlegen“: dann schreibt die App still in genau diese Datei mit.</p>`, { fokus: false });
}

function setupZeigen(nurWechsel, ausSplash) {
  const s = $('#setup');
  const dateiDa = Store.dateiApiDa();
  s.innerHTML = `
    <div class="setup-inner">
      <div class="mark serif">leseliste</div>
      ${dateiDa ? `
        <p class="lead">Wo sollen deine Bücher, Notizen und Fotos liegen?</p>

        <button class="opt" data-act="datei-neu">
          <span class="on">${ICON.save} Neue Datei anlegen <span class="badge">empfohlen</span></span>
          <span class="od">Einmal den Ort wählen – danach speichert die App still in diese Datei.</span>
        </button>

        <button class="opt" data-act="datei-oeffnen">
          <span class="on">${ICON.books} Bestehende Datei öffnen</span>
          <span class="od">Eine leseplan.json weiterführen.</span>
        </button>

        <button class="opt" data-act="geraet">
          <span class="on">${ICON.img} Nur in diesem Browser</span>
          <span class="od">Ohne Datei. Verschwindet mit den Website-Daten.</span>
        </button>
      ` : `
        <p class="lead">Deine Bücher und Notizen bleiben in diesem Browser – gespeichert wird automatisch.</p>

        <button class="btn btn-primary btn-block" data-act="geraet" style="padding:14px;font-size:15px">Loslegen</button>

        <div style="margin-top:10px">
          <button class="btn btn-block btn-ghost" data-act="import">Daten aus einer Datei laden</button>
        </div>

        <p class="hinweis" style="margin-top:16px">
          Dieser Browser lässt die Seite nicht direkt in eine Datei schreiben. Hol dir mit „Jetzt sichern“ regelmäßig eine Kopie.
        </p>
      `}

      <button class="infobox" data-act="info" style="position:static;margin:20px 0 0;max-width:none">
        <span class="i-kopf">Wo liegen meine Daten?</span>
        <span class="i-text">Im Browser dieses Geräts, an diese Seite gebunden – nicht in einer Datei.
          Jede App für sich. Zum Mitnehmen: <b>Mehr → Jetzt sichern</b>. Tippen für die lange Fassung.</span>
      </button>

      <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        ${dateiDa ? '<button class="btn btn-sm" data-act="import">Daten aus Datei laden</button>' : ''}
        ${nurWechsel ? '' : '<button class="btn btn-sm" data-act="stoebern">' + ICON.herz + ' Stöbern</button>'}
        ${nurWechsel ? '' : '<button class="btn btn-sm" data-act="ki">Liste von KI zusammenstellen</button>'}
        ${(nurWechsel || ausSplash) ? '<button class="btn btn-sm btn-ghost" data-act="abbrechen">Zurück</button>' : ''}
        <button class="btn btn-sm btn-ghost" data-act="theme">Hell/Dunkel</button>
        ${vollbildGeht() ? `<button class="btn btn-sm btn-ghost" data-act="voll">${ICON.voll} Vollbild</button>` : ''}
      </div>
    </div>`;
  s.hidden = false;
  $('#app').hidden = true;

  s.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'theme') { themeUmschalten(); return; }
    if (act === 'voll') { vollbildUmschalten(); return; }
    if (act === 'info') { speicherErklaerung(); return; }
    if (act === 'abbrechen') {
      if (ausSplash) { splashZeigen(); return; }
      s.hidden = true; $('#app').hidden = false; return;
    }
    if (act === 'import') { importDialog(!nurWechsel); return; }
    if (act === 'ki') { kiErstellenOeffnen(); return; }
    /* Stöbern legt am Ende selbst eine leseliste an – dafür braucht es einen
       Speicherort, also gilt hier dieselbe Arbeitskopie wie bei „Loslegen“. */
    if (act === 'stoebern') {
      if (!Store.modus) {
        Store.modus = 'geraet'; Store.handle = null;
        await Store.metaSchreiben();
        if (!nurWechsel) DB = normalisiere(await IDB.get('daten'));
        await Store.sichern(true);
        appStarten(true);
      }
      stoebernOeffnen();
      return;
    }

    if (act === 'geraet') {
      Store.modus = 'geraet'; Store.handle = null;
      await Store.metaSchreiben();
      if (!nurWechsel) DB = normalisiere(await IDB.get('daten'));
      await Store.sichern(true);
      appStarten();
      return;
    }
    if (act === 'datei-neu' || act === 'datei-oeffnen') {
      try {
        let handle;
        if (act === 'datei-neu') {
          handle = await window.showSaveFilePicker({
            suggestedName: 'leseplan.json',
            types: [{ description: 'leseliste', accept: { 'application/json': ['.json'] } }]
          });
        } else {
          const [h] = await window.showOpenFilePicker({
            types: [{ description: 'leseliste', accept: { 'application/json': ['.json'] } }]
          });
          handle = h;
        }
        if (!(await Store.rechtePruefen(handle, true))) { toast('Ohne Schreibrecht geht es nicht.'); return; }
        Store.modus = 'datei'; Store.handle = handle; Store.dateiname = handle.name || 'leseplan.json';
        const geladen = await Store.ladeDaten();
        DB = normalisiere(geladen);
        await Store.metaSchreiben();
        await Store.sichern(true);
        appStarten();
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.error(err);
        /* In einer eingebetteten Ansicht verbieten Browser den Dateidialog. */
        Store.dateiGesperrt = true;
        setupZeigen(nurWechsel);
        $('.setup-inner').insertAdjacentHTML('afterbegin',
          `<p class="lead" style="color:var(--accent)">Dieser Browser lässt die Seite hier nicht in eine Datei schreiben – das passiert, wenn die App eingebettet läuft. Nimm die Arbeitskopie; sichern als Datei geht später jederzeit über „Jetzt sichern“.</p>`);
      }
    }
  };
}

