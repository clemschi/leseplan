/* ============================================================
   Speicher: Datei (wo der Browser es erlaubt) oder Gerät
   ============================================================ */
const IDB = (() => {
  let p;
  function open() {
    if (p) return p;
    p = new Promise((res, rej) => {
      const r = indexedDB.open('leseplan', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return p;
  }
  const tx = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const t = db.transaction('kv', mode), st = t.objectStore('kv');
    const q = fn(st);
    t.oncomplete = () => res(q && q.result);
    t.onerror = () => rej(t.error);
  }));
  return {
    get: k => tx('readonly', st => st.get(k)),
    set: (k, v) => tx('readwrite', st => st.put(v, k)),
    del: k => tx('readwrite', st => st.delete(k))
  };
})();

/* ===== Speicher =====
   Jede App in dieser Datei hält ihre Einträge für sich: eigener Ort, eigene
   JSON-Datei, eigener Stand. Die Schicht ist darum eine Fabrik – „Store“ ist
   die Ausfertigung der leseliste, „KStore“ die des Kalenders. */
function macheSpeicher(cfg) {
  return {
    id: cfg.id,
    metaKey: cfg.metaKey,
    datenKey: cfg.datenKey,
    modus: null,          // 'datei' | 'geraet'
    handle: null,         // FileSystemFileHandle bei 'datei'
    dateiname: cfg.dateiname,
    dirty: false,
    letzteSicherung: 0,
    fehler: null,
    timer: null,

    daten() { return cfg.daten(); },
    setzen(d) { cfg.setzen(d); },

    dateiGesperrt: false,
    dateiApiDa() { return typeof window.showSaveFilePicker === 'function' && !this.dateiGesperrt; },

    async metaLesen() { return (await IDB.get(this.metaKey)) || null; },
    async metaSchreiben() {
      await IDB.set(this.metaKey, { modus: this.modus, handle: this.handle, dateiname: this.dateiname });
    },

    async rechtePruefen(handle, fragen) {
      if (!handle || !handle.queryPermission) return true;
      const opt = { mode: 'readwrite' };
      if ((await handle.queryPermission(opt)) === 'granted') return true;
      if (!fragen) return false;
      return (await handle.requestPermission(opt)) === 'granted';
    },

    async ladeDaten() {
      if (this.modus === 'datei' && this.handle) {
        const f = await this.handle.getFile();
        const txt = await f.text();
        return txt.trim() ? JSON.parse(txt) : null;
      }
      return (await IDB.get(this.datenKey)) || null;
    },

    async schreiben() {
      const json = JSON.stringify(this.daten());
      if (this.modus === 'datei' && this.handle) {
        const w = await this.handle.createWritable();
        await w.write(json);
        await w.close();
      } else {
        await IDB.set(this.datenKey, this.daten());
      }
    },

    async sichern(still) {
      if (!this.modus) return false;
      if (this._laeuft) { this._nochmal = true; return false; }
      this._laeuft = true;
      try {
        this.daten().geaendert = Date.now();
        await this.schreiben();
        this.dirty = false;
        this.fehler = null;
        this.letzteSicherung = Date.now();
        saveChipMalen();
        return true;
      } catch (e) {
        console.error(e);
        this.fehler = e && e.message ? e.message : 'Unbekannter Fehler';
        saveChipMalen();
        if (!still) toast('Sichern fehlgeschlagen: ' + this.fehler, 4200);
        return false;
      } finally {
        this._laeuft = false;
        if (this._nochmal) { this._nochmal = false; setTimeout(() => this.sichern(true), 0); }
      }
    },

    /* Der feste Takt ist die Zusage; kurz nach der letzten Eingabe wird zusätzlich
       gesichert, damit ein Schließen zwischen zwei Takten nichts kostet. */
    aendern() {
      this.dirty = true;
      saveChipMalen();
      clearTimeout(this._kurz);
      this._kurz = setTimeout(() => { if (this.dirty) this.sichern(true); }, 4000);
    },

    autosaveStarten() {
      clearInterval(this.timer);
      const e = this.daten().einstellungen || {};
      const sek = clamp(+(e.autosaveSek || 60), 15, 600);
      this.timer = setInterval(() => { if (this.dirty) this.sichern(true); }, sek * 1000);
      if (this._haengt) return;
      this._haengt = true;
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.dirty) this.sichern(true); });
      window.addEventListener('pagehide', () => { if (this.dirty) this.sichern(true); });
    },

    /* Bewusstes Sichern als Datei – im Gerätemodus über den Datei-Dialog der Umgebung. */
    async alsDateiSichern(ohneBilder) {
      if (this.modus === 'datei' && this.handle) {
        const ok = await this.sichern();
        if (ok) toast('In ' + this.dateiname + ' gesichert.');
        return;
      }
      let daten = this.daten();
      if (ohneBilder && cfg.ohneBilder) daten = cfg.ohneBilder(daten);
      const json = JSON.stringify(daten);
      const name = cfg.id + '-' + heute() + (ohneBilder ? '-ohne-fotos' : '') + '.json';
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
      if (dl) {
        try {
          await dl.save({ filename: name, data: json });
          toast('Datei gesichert: ' + name);
          this.letzteSicherung = Date.now(); saveChipMalen();
          return;
        } catch (e) {
          const code = e && e.code;
          if (code === 'declined') { toast('Sichern abgebrochen.'); return; }
          if (code === 'too_large' && !ohneBilder && cfg.ohneBilder) { return this.alsDateiSichern(true); }
          toast('Datei konnte nicht gesichert werden (' + (code || 'Fehler') + ').', 4200);
          return;
        }
      }
      /* Läuft die Seite außerhalb der Umgebung, geht der klassische Weg. */
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('Datei gesichert: ' + name);
      } catch (e) { toast('Kein Weg zum Dateispeichern verfügbar.', 4000); }
    }
  };
}

/* Die leseliste behält ihre bisherigen Schlüssel, damit vorhandene Stände
   unangetastet weiterlaufen. */
const Store = macheSpeicher({
  id: 'leseplan', metaKey: 'meta', datenKey: 'daten', dateiname: 'leseplan.json',
  daten: () => DB, setzen: d => { DB = d; },
  ohneBilder: d => {
    const k = JSON.parse(JSON.stringify(d));
    k.buecher.forEach(b => b.notizen.forEach(n => { n.bilder = []; }));
    k.ohneBilder = true;
    return k;
  }
});

/* Welcher Speicher gerade zählt – danach richtet sich der Chip in der Kopfzeile. */
let aktiverSpeicher = Store;


/* Denselben Chip gibt es in der Kopfzeile der App und in jeder Ebene
   darüber – ein Zustand, ein Aussehen, ein Griff. */
function saveChipMalen() {
  const S = aktiverSpeicher || Store;
  const zustand = S.fehler ? 'error' : S.dirty ? 'dirty' : 'clean';
  const text = S.fehler ? 'Fehler' : S.dirty ? 'offen'
    : (S.letzteSicherung ? relZeit(S.letzteSicherung).replace('vor ', '') : 'gesichert');
  $$('.savechip').forEach(chip => {
    chip.dataset.state = zustand;
    const t = $('.st', chip);
    if (t) t.textContent = text;
  });
}
setInterval(saveChipMalen, 30000);

/* Jede Änderung läuft hierdurch: Daten anfassen, dann merken lassen. */
function aendern(fn) {
  if (fn) fn();
  Store.aendern();
}


/* ===== Speicherort einer Nebenapp =====
   Kalender, fastreader und g'sund gehen denselben Weg: beim Öffnen nachsehen,
   wo die Daten liegen – und beim ersten Mal einmal fragen. Der Weg steht hier
   ein Mal. Jede App gibt nur ihre Angaben mit:
     store, name, datei, lead, normalisiere, leer, starten.
   (Die leseliste hat ihre eigene, längere Ersteinrichtung: setupZeigen.) */
async function appSpeicherOeffnen(cfg) {
  const store = cfg.store;
  aktiverSpeicher = store;
  let meta = null;
  try { meta = await store.metaLesen(); } catch (e) { console.warn(e); }

  if (meta && meta.modus === 'datei' && meta.handle) {
    store.modus = 'datei'; store.handle = meta.handle; store.dateiname = meta.dateiname || cfg.datei;
    if (await store.rechtePruefen(meta.handle, false)) {
      try { store.setzen(cfg.normalisiere(await store.ladeDaten())); cfg.starten(); return; }
      catch (e) { console.error(e); }
    }
    appSpeicherort(cfg, true);
    return;
  }
  if (meta && meta.modus === 'geraet') {
    store.modus = 'geraet';
    store.setzen(cfg.normalisiere(await IDB.get(store.datenKey)));
    cfg.starten();
    return;
  }
  appSpeicherort(cfg, false);
}

function appSpeicherort(cfg, erneut) {
  const store = cfg.store;
  const s = $('#setup');
  const dateiDa = store.dateiApiDa();
  s.innerHTML = `
    <div class="setup-inner">
      <div class="mark serif">${cfg.name}</div>
      ${erneut ? `<p class="lead">Der Browser hat den Zugriff auf <strong>${esc(store.dateiname)}</strong> zurückgesetzt. Einmal bestätigen, dann geht es weiter.</p>`
      : `<p class="lead">${cfg.lead}</p>`}
      ${dateiDa ? `
        <button class="opt" data-sact="datei-neu">
          <span class="on">${ICON.save} Neue Datei anlegen <span class="badge">empfohlen</span></span>
          <span class="od">Einmal den Ort wählen – danach speichert die App still in ${cfg.datei}.</span>
        </button>
        <button class="opt" data-sact="datei-oeffnen">
          <span class="on">${ICON.books} Bestehende Datei öffnen</span>
          <span class="od">Eine ${cfg.datei} weiterführen.</span>
        </button>` : ''}
      <button class="opt" data-sact="geraet">
        <span class="on">${ICON.check} Auf diesem Gerät speichern</span>
        <span class="od">Ohne Datei-Dialog. Jederzeit als Datei sicherbar.</span>
      </button>
      <div style="margin-top:10px"><button class="btn btn-block btn-ghost" data-sact="zurueck">Zurück zur Startseite</button></div>
    </div>`;
  s.hidden = false;
  $$('.appflaeche').forEach(x => { x.hidden = true; });

  s.onclick = async (e) => {
    const b = e.target.closest('[data-sact]');
    if (!b || b.disabled) return;
    const act = b.dataset.sact;
    if (act === 'zurueck') { splashZeigen(); return; }
    b.disabled = true;
    try {
      if (act === 'datei-neu' || act === 'datei-oeffnen') {
        let handle = null;
        if (act === 'datei-neu') {
          handle = await window.showSaveFilePicker({
            suggestedName: cfg.datei,
            types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
          });
        } else {
          const [h] = await window.showOpenFilePicker({
            types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
          });
          handle = h;
        }
        if (!handle) { b.disabled = false; return; }
        store.modus = 'datei'; store.handle = handle; store.dateiname = handle.name || cfg.datei;
        if (act === 'datei-oeffnen') {
          try { store.setzen(cfg.normalisiere(await store.ladeDaten())); } catch (err) { store.setzen(cfg.leer()); }
        } else { store.setzen(cfg.leer()); }
        await store.metaSchreiben();
        await store.sichern(true);
        cfg.starten();
        return;
      }
      if (act === 'geraet') {
        store.modus = 'geraet'; store.handle = null;
        await store.metaSchreiben();
        store.setzen(cfg.normalisiere(await IDB.get(store.datenKey)));
        await store.sichern(true);
        cfg.starten();
        return;
      }
    } catch (err) {
      console.warn(err);
      if (err && err.name === 'AbortError') { b.disabled = false; return; }
      if (err && err.name === 'SecurityError') { store.dateiGesperrt = true; appSpeicherort(cfg, false); return; }
      toast('Das hat nicht geklappt.', 3500);
      b.disabled = false;
    }
  };
}

/* ===== Ein Speicherblock für alle Apps =====
   Vier Apps, vier Datenbasen – aber ein Verhalten: von selbst sichern, von
   Hand sichern, von Hand laden, den Ort wechseln. Der Block steht darum genau
   einmal hier und wird im „Mehr“ jeder App eingesetzt. Wer eine App dazubaut,
   meldet ihren Ort mit `appOrtAnmelden` an und bekommt alles davon geschenkt. */
const APPORTE = [];
function appOrtAnmelden(cfg) { APPORTE.push(cfg); return cfg; }
const ortText = store => store.modus === 'datei' ? store.dateiname
  : (store.modus === 'geraet' ? 'Auf diesem Gerät' : 'Nicht gewählt');
const ortSekunden = cfg => {
  const e = (cfg.store.daten() || {}).einstellungen || {};
  return clamp(+(e.autosaveSek || 60), 15, 600);
};

function appDatenHtml(cfg) {
  const store = cfg.store;
  const sek = ortSekunden(cfg);
  return `
    <div class="section">
      <div class="section-head"><h2>Datenbasis</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow"><span class="rn">${esc(ortText(store))}</span>
            <span class="rm">${store.modus === 'datei'
      ? 'Die App schreibt still in diese Datei, von selbst alle ' + sek + ' Sekunden.'
      : 'Von selbst alle ' + sek + ' Sekunden im Browser dieses Geräts. Sichere dir regelmäßig eine Datei.'}</span></span>
          <button class="btn btn-sm" data-dort>Ändern</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Zuletzt gesichert</span>
            <span class="rm">${store.letzteSicherung ? relZeit(store.letzteSicherung) : 'noch nicht'}${store.dirty ? ' · offene Änderungen' : ''}</span></span>
          <button class="btn btn-sm" data-dsave>Jetzt sichern</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Von selbst sichern</span><span class="rm">Abstand in Sekunden</span></span>
          <input type="number" data-dauto value="${sek}" style="width:82px;text-align:right">
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Daten laden</span>
            <span class="rm">Eine ${esc(cfg.datei)} einlesen</span></span>
          <button class="btn btn-sm" data-dimport>Laden</button>
        </div>
      </div>
    </div>`;
}

function appDatenBinden(cfg, wurzel, neuMalen) {
  const store = cfg.store;
  const frisch = () => { if (neuMalen) neuMalen(); };
  const o = $('[data-dort]', wurzel);
  if (o) o.onclick = () => (cfg.ortWechseln ? cfg.ortWechseln() : appSpeicherort(cfg, false));
  const sv = $('[data-dsave]', wurzel);
  if (sv) sv.onclick = () => store.alsDateiSichern(false);
  const im = $('[data-dimport]', wurzel);
  if (im) im.onclick = () => (cfg.laden ? cfg.laden() : appImportBlatt(cfg));
  const au = $('[data-dauto]', wurzel);
  if (au) au.onchange = e => {
    const v = clamp(Math.round(+e.target.value || 60), 15, 600);
    const d = store.daten();
    d.einstellungen = d.einstellungen || {};
    d.einstellungen.autosaveSek = v;
    store.aendern();
    store.autosaveStarten();
    frisch();
    toast('Sichert jetzt alle ' + v + ' Sekunden.');
  };
}

/* Eine Datei einlesen – für jede App derselbe Weg und dieselbe Prüfung. */
function appImportBlatt(cfg) {
  const s = blatt('Daten laden', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">Eine
      <strong>${esc(cfg.datei)}</strong> einlesen. Der bisherige Stand dieser App wird ersetzt;
      die anderen Apps bleiben unberührt.</p>
    <input type="file" accept="application/json,.json" data-file style="width:100%">
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" data-ok style="flex:1">Laden</button>
      <button class="btn btn-ghost" data-no>Abbrechen</button>
    </div>`, { fokus: false });
  $('[data-no]', s).onclick = () => layerSchliessen();
  $('[data-ok]', s).onclick = async () => {
    const f = $('[data-file]', s).files[0];
    if (!f) { toast('Keine Datei gewählt.'); return; }
    let roh = null;
    try { roh = JSON.parse(await f.text()); }
    catch (e) { toast('Die Datei ist kein gültiges JSON.', 4000); return; }
    const passt = appOrtZuDaten(roh);
    if (passt && passt !== cfg) {
      toast('Das sind Daten für ' + passt.name + '. Dort laden.', 4200);
      return;
    }
    const ok = await appDatenUebernehmen(cfg, roh);
    if (!ok) { toast('Die Datei passt nicht zu ' + cfg.name + '.', 4000); return; }
    layerSchliessen();
    if (cfg.starten) cfg.starten();
    toast('Geladen.');
  };
}

/* Woher stammt eine Datei? Jede Datenbasis trägt ihr Format im Kopf. */
function appOrtZuDaten(roh) {
  if (!roh || typeof roh !== 'object') return null;
  return APPORTE.find(o => o.format && roh.format === o.format) || null;
}

/* Übernehmen heißt: prüfen, in die Datenbasis setzen, sofort sichern. Hat die
   App noch keinen Ort, bekommt sie die Arbeitskopie auf diesem Gerät – sonst
   läge das Geladene nirgends. */
async function appDatenUebernehmen(cfg, roh) {
  if (!roh || typeof roh !== 'object') return false;
  if (cfg.format && roh.format && roh.format !== cfg.format) return false;
  const store = cfg.store;
  try { store.setzen(cfg.normalisiere(roh)); } catch (e) { console.error(e); return false; }
  if (!store.modus) {
    store.modus = 'geraet';
    await store.metaSchreiben();
  }
  await store.sichern(true);
  return true;
}

/* Die leseliste hat ihre eigene, längere Ersteinrichtung und ihren eigenen
   Ladedialog (ersetzen oder ergänzen) – beim Sichern, beim Takt und beim
   Erkennen einer Datei geht sie denselben Weg wie alle anderen. */
const LORT = appOrtAnmelden({
  store: Store, name: 'leseliste', datei: 'leseplan.json', format: 'leseplan',
  lead: 'Wo sollen Bücher, Notizen und Fotos liegen?',
  normalisiere: r => normalisiere(r), leer: () => leereDb(),
  starten: () => appStarten(),
  ortWechseln: () => setupZeigen(true),
  laden: () => importDialog(false)
});

/* ===== Alles auf einmal =====
   Vier Apps, vier Dateien – zum Umziehen ist das umständlich. Darum gibt es
   auf der Datenseite eine Sicherung über alle: eine mylife.json, in der jede
   App ihren Teil hat. Eingelesen wird beides, die Sammeldatei wie einzelne
   App-Dateien, auch mehrere auf einmal. */
async function ortDatenLesen(cfg) {
  const store = cfg.store;
  try {
    if (store.modus) {
      const d = await store.ladeDaten();
      if (d) return d;
    }
    const d = await IDB.get(store.datenKey);
    if (d) return d;
  } catch (e) { console.warn(e); }
  try { return store.daten() || null; } catch (e) { return null; }
}

async function alleDatenSammeln() {
  const teile = {};
  for (const cfg of APPORTE) {
    const d = await ortDatenLesen(cfg);
    if (d) teile[cfg.store.id] = d;
  }
  return { format: 'mylife-alles', version: 1, erstellt: Date.now(), teile };
}

async function alleSichern() {
  const alles = await alleDatenSammeln();
  const n = Object.keys(alles.teile).length;
  if (!n) { toast('Es liegt noch nichts zum Sichern bereit.'); return; }
  await dateiAnbieten('mylife-' + heute() + '.json', JSON.stringify(alles), 'application/json');
}

/* Nimmt eine Sammeldatei oder einzelne App-Dateien und legt jeden Teil dort ab,
   wo er hingehört. Gibt zurück, was angekommen ist. */
async function alleLaden(dateien) {
  const gelandet = [], daneben = [];
  for (const f of dateien) {
    let roh = null;
    try { roh = JSON.parse(await f.text()); }
    catch (e) { daneben.push(f.name + ' (kein JSON)'); continue; }
    if (roh && roh.format === 'mylife-alles' && roh.teile && typeof roh.teile === 'object') {
      for (const cfg of APPORTE) {
        const teil = roh.teile[cfg.store.id];
        if (!teil) continue;
        if (await appDatenUebernehmen(cfg, teil)) gelandet.push(cfg.name);
        else daneben.push(cfg.name);
      }
      continue;
    }
    const cfg = appOrtZuDaten(roh);
    if (!cfg) { daneben.push(f.name + ' (unbekannt)'); continue; }
    if (await appDatenUebernehmen(cfg, roh)) gelandet.push(cfg.name);
    else daneben.push(f.name);
  }
  return { gelandet, daneben };
}

function alleLadenBlatt(fertig) {
  const s = blatt('Alle Daten laden', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Eine <strong>mylife.json</strong> mit allem darin – oder gleich mehrere einzelne
      Dateien (leseplan, kalender, fastreader, gsund). Jeder Teil geht in seine App;
      was dort liegt, wird ersetzt.</p>
    <input type="file" accept="application/json,.json" data-file multiple style="width:100%">
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" data-ok style="flex:1">Laden</button>
      <button class="btn btn-ghost" data-no>Abbrechen</button>
    </div>`, { fokus: false });
  $('[data-no]', s).onclick = () => layerSchliessen();
  $('[data-ok]', s).onclick = async () => {
    const fs = Array.from($('[data-file]', s).files || []);
    if (!fs.length) { toast('Keine Datei gewählt.'); return; }
    const { gelandet, daneben } = await alleLaden(fs);
    layerSchliessen();
    if (!gelandet.length) { toast('Nichts davon passte.', 4000); return; }
    toast(gelandet.join(', ') + ' geladen'
      + (daneben.length ? ' · nicht gepasst: ' + daneben.join(', ') : '') + '.', 4600);
    if (fertig) fertig();
  };
}
