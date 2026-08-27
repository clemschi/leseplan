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
