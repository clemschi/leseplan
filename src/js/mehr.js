/* ============================================================
   Mehr: Speicher, Arten, Sicherung
   ============================================================ */
function mehrMalen(root) {
  const dateiModus = Store.modus === 'datei';
  root.innerHTML = `
    <div class="section">
      <div class="section-head"><h2>leselisten</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow">
            <span class="rn">${esc((aktiverPlan() || {}).name || 'Noch keiner')}</span>
            <span class="rm">${pl(DB.lesepleane.length, 'leseliste', 'leselisten')} insgesamt · ${pl(DB.buecher.length, 'Buch', 'Bücher')}</span>
          </span>
          <button class="btn btn-sm" data-plaene>Verwalten</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Einkauf</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow">
            <span class="rn">Einkaufsliste</span>
            <span class="rm">${einkaufDaten().alle.length
      ? pl(einkaufDaten().alle.length, 'Buch fehlt', 'Bücher fehlen') + (einkaufDaten().summeAlle ? ' · ' + fmtGeld(einkaufDaten().summeAlle) + ' eingetragen' : '')
      : 'Nichts offen'}</span>
          </span>
          <button class="btn btn-sm" data-einkauf>Öffnen</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Speicherort</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow">
            <span class="rn">${dateiModus ? esc(Store.dateiname) : 'Arbeitskopie auf diesem Gerät'}</span>
            <span class="rm">${dateiModus
      ? 'Die App schreibt still in diese Datei, automatisch alle ' + (DB.einstellungen.autosaveSek || 60) + ' Sekunden.'
      : 'Automatisch alle ' + (DB.einstellungen.autosaveSek || 60) + ' Sekunden im Browser dieses Geräts. Sichere dir regelmäßig eine Datei.'}</span>
          </span>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Zuletzt gesichert</span><span class="rm">${Store.letzteSicherung ? relZeit(Store.letzteSicherung) : 'noch nicht'}${Store.dirty ? ' · offene Änderungen' : ''}</span></span>
          <button class="btn btn-sm" data-save>Jetzt sichern</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Automatisch sichern</span><span class="rm">Abstand in Sekunden</span></span>
          <input type="number" data-auto value="${DB.einstellungen.autosaveSek || 60}" style="width:82px;text-align:right">
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Speicherort wechseln</span><span class="rm">Datei oder Arbeitskopie</span></span>
          <button class="btn btn-sm" data-wechseln>Ändern</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Listen und Sicherungen</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow"><span class="rn">Daten aus Datei laden</span><span class="rm">Ganze Liste ersetzen oder ergänzen</span></span>
          <button class="btn btn-sm" data-import>Laden</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Sicherung als Datei</span><span class="rm">${fmtZahl(Math.round(JSON.stringify(DB).length / 1024))} KB inklusive Fotos</span></span>
          <button class="btn btn-sm" data-export>Sichern</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn" style="color:var(--bad)">Alles löschen</span><span class="rm">Setzt diesen Speicherort auf leer zurück</span></span>
          <button class="btn btn-sm btn-danger" data-reset>Zurücksetzen</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Mit KI</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow">
            <span class="rn">Leseliste erstellen lassen</span>
            <span class="rm">Prompt zu Forschungsfrage, These oder Thema – als JSON importierbar</span>
          </span>
          <button class="btn btn-sm" data-ki-erstellen>Prompt</button>
        </div>
        <div class="rowline">
          <span class="grow">
            <span class="rn">Aktuelle Liste bewerten lassen</span>
            <span class="rm">Prompt mit deiner leseliste – Antwort schlägt fehlende Werke vor</span>
          </span>
          <button class="btn btn-sm" data-ki-bewerten>Prompt</button>
        </div>
        <div class="rowline">
          <span class="grow">
            <span class="rn">Sammlung zum Stöbern</span>
            <span class="rm">Prompt über mehrere Themen – rund hundert Werke zum Durchwischen</span>
          </span>
          <button class="btn btn-sm" data-ki-stoebern>Prompt</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Stöbern</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow">
            <span class="rn">Sammlung durchsehen</span>
            <span class="rm">Werk für Werk wischen, Gemerktes zu Blöcken ordnen</span>
          </span>
          <button class="btn btn-sm" data-stoebern>Öffnen</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Notiz-Arten</h2><button class="btn btn-sm btn-ghost" data-arten>Verwalten</button></div>
      <div class="chiprow" style="padding-left:0">
        ${DB.arten.map(a => `<span class="chip"><span class="swatch" style="background:var(--${a.farbe})"></span>${esc(a.name)}</span>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Darstellung</h2></div>
      <div class="list-card">
        <div class="rowline">
          <span class="grow"><span class="rn">Tagesziel</span><span class="rm">${DB.einstellungen.zielSeiten ? DB.einstellungen.zielSeiten + ' Seiten pro Tag' : 'Keins gesetzt'}</span></span>
          <button class="btn btn-sm" data-zielx>${DB.einstellungen.zielSeiten ? 'Ändern' : 'Setzen'}</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Lese-Wecker</span><span class="rm">${DB.einstellungen.weckerMin
      ? 'Meldet sich nach ' + DB.einstellungen.weckerMin + ' Minuten Sitzung'
      : 'Aus'}</span></span>
          <button class="btn btn-sm" data-weckerx>${DB.einstellungen.weckerMin ? 'Ändern' : 'Setzen'}</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Nach dem Start nach Timer fragen</span>
            <span class="rm">${DB.einstellungen.timerFragen
      ? 'Fragt jedes Mal, ob und wie lange'
      : 'Startet ohne Rückfrage'}</span></span>
          <button class="btn btn-sm" data-fragenx>${DB.einstellungen.timerFragen ? 'An' : 'Aus'}</button>
        </div>
        <div class="rowline">
          <span class="grow"><span class="rn">Einführung</span><span class="rm">Die vier Schritte vom Anfang noch einmal</span></span>
          <button class="btn btn-sm" data-einf>Zeigen</button>
        </div>
      </div>
      ${huelleEinstellungenHtml()}
    </div>

    <div class="section">
      <p class="hinweis">
        Diese Seite enthält selbst keine Daten – alles liegt in deinem Speicherort. Wenn du das Gerät wechselst,
        sichere eine Datei und lade sie drüben über „Daten aus Datei laden“.
      </p>
    </div>`;

  huelleEinstellungenBinden(root, viewMalen);
  $('[data-plaene]', root).onclick = planWechsler;
  $('[data-ki-erstellen]', root).onclick = kiErstellenOeffnen;
  $('[data-ki-bewerten]', root).onclick = kiBewertenOeffnen;
  $('[data-ki-stoebern]', root).onclick = stoebernPromptOeffnen;
  $('[data-stoebern]', root).onclick = () => stoebernOeffnen();
  $('[data-einkauf]', root).onclick = einkaufslisteOeffnen;
  $('[data-einf]', root).onclick = einfuehrungZeigen;
  $('[data-zielx]', root).onclick = () => zielBearbeiten();
  $('[data-weckerx]', root).onclick = () => weckerBearbeiten();
  $('[data-fragenx]', root).onclick = () => {
    aendern(() => { DB.einstellungen.timerFragen = !DB.einstellungen.timerFragen; });
    viewMalen();
  };
  $('[data-save]', root).onclick = () => Store.alsDateiSichern(false);
  $('[data-export]', root).onclick = () => Store.alsDateiSichern(false);
  $('[data-import]', root).onclick = () => importDialog(false);
  $('[data-wechseln]', root).onclick = () => setupZeigen(true);
  $('[data-arten]', root).onclick = artenVerwalten;
  $('[data-auto]', root).onchange = e => {
    const v = clamp(Math.round(num(e.target.value) || 60), 15, 600);
    aendern(() => { DB.einstellungen.autosaveSek = v; });
    Store.autosaveStarten();
    viewMalen();
    toast('Sichert jetzt alle ' + v + ' Sekunden.');
  };
  $('[data-reset]', root).onclick = async () => {
    const ok = await bestaetigen('Wirklich alles löschen?',
      `${DB.buecher.length} Bücher, ${alleNotizen().length} Notizen und alle Fotos an diesem Speicherort werden gelöscht. Danach beginnst du wieder bei der Wahl des Speicherorts.`,
      'Alles löschen', true);
    if (!ok) return;
    DB = leereDb();
    try {
      /* Erst den bisherigen Speicher wirklich leeren, dann die Verknüpfung lösen. */
      if (Store.modus === 'datei' && Store.handle) await Store.schreiben();
      await IDB.del('daten');
      await IDB.del('meta');
    } catch (e) { console.error(e); }
    clearInterval(Store.timer);
    clearTimeout(Store._kurz);
    Store.modus = null; Store.handle = null; Store.dirty = false;
    Store.letzteSicherung = 0; Store.fehler = null;
    themeAnwenden();
    splashZeigen();
    toast('Zurückgesetzt.');
  };
}

function artenVerwalten() {
  const s = blatt('Notiz-Arten', '<div data-l></div>', { fokus: false });
  const malen = () => {
    const l = $('[data-l]', s);
    const benutzt = id => alleNotizen().filter(x => x.notiz.artId === id).length;
    l.innerHTML = `<div class="list-card">${DB.arten.map(a => `
      <div class="rowline">
        <span class="swatch" style="width:12px;height:12px;border-radius:4px;background:var(--${a.farbe})"></span>
        <span class="grow"><span class="rn">${esc(a.name)}</span><span class="rm">${benutzt(a.id)} Notizen</span></span>
        <button class="icon-btn" data-farbe="${a.id}" aria-label="Farbe">◐</button>
        <button class="icon-btn" data-um="${a.id}" aria-label="Umbenennen">${ICON.edit}</button>
        <button class="icon-btn" data-del="${a.id}" aria-label="Löschen">${ICON.trash}</button>
      </div>`).join('')}</div>
      <button class="btn btn-block" style="margin-top:12px" data-neu>${ICON.plus} Art anlegen</button>`;

    $$('[data-farbe]', l).forEach(b => b.onclick = () => {
      const a = artById(b.dataset.farbe);
      aendern(() => { a.farbe = ART_FARBEN[(ART_FARBEN.indexOf(a.farbe) + 1) % ART_FARBEN.length]; });
      malen(); viewMalen();
    });
    $$('[data-um]', l).forEach(b => b.onclick = () => {
      const a = artById(b.dataset.um);
      const s2 = blatt('Umbenennen', `<div class="field"><input type="text" data-n value="${esc(a.name)}"></div>
        <button class="btn btn-primary btn-block" data-ok>Sichern</button>`);
      $('[data-ok]', s2).onclick = () => {
        const n = $('[data-n]', s2).value.trim();
        if (!n) return;
        aendern(() => { a.name = n; });
        layerSchliessen(); malen(); viewMalen();
      };
    });
    $$('[data-del]', l).forEach(b => b.onclick = async () => {
      const a = artById(b.dataset.del);
      const ok = await bestaetigen('Art löschen?', `„${esc(a.name)}“ verschwindet. Die ${benutzt(a.id)} Notizen bleiben und stehen dann unter „Ohne Art“.`, 'Löschen', true);
      if (!ok) return;
      aendern(() => {
        DB.buecher.forEach(x => x.notizen.forEach(n => { if (n.artId === a.id) n.artId = null; }));
        DB.arten = DB.arten.filter(x => x.id !== a.id);
      });
      malen(); viewMalen();
    });
    $('[data-neu]', l).onclick = () => {
      const s2 = blatt('Neue Art', `<div class="field"><input type="text" data-n placeholder="z.B. Sonstiges"></div>
        <button class="btn btn-primary btn-block" data-ok>Anlegen</button>`);
      $('[data-ok]', s2).onclick = () => {
        const n = $('[data-n]', s2).value.trim();
        if (!n) return;
        aendern(() => DB.arten.push({ id: uid(), name: n, farbe: ART_FARBEN[DB.arten.length % 8] }));
        layerSchliessen(); malen(); viewMalen();
      };
    };
  };
  malen();
}

