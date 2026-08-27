/* ============================================================
   Daten laden: ganze Liste ersetzen oder ergänzen
   ============================================================ */
function importDialog(erstStart) {
  const s = blatt('Daten aus Datei laden', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Erwartet wird eine <span class="num">.json</span> im leseliste-Format – eine frühere Sicherung oder eine fertige Liste.
    </p>
    <input type="file" accept=".json,application/json" data-file style="padding:9px">
    <div class="field" style="margin-top:14px">
      <label>Wie einspielen?</label>
      <label style="display:flex;gap:9px;align-items:flex-start;margin-bottom:8px;font-size:13px;color:var(--text-2)">
        <input type="radio" name="impmode" value="ersetzen" checked style="width:auto;margin-top:3px">
        <span><strong style="color:var(--text)">Alles ersetzen</strong><br>Der bisherige Inhalt wird verworfen.</span>
      </label>
      <label style="display:flex;gap:9px;align-items:flex-start;margin-bottom:8px;font-size:13px;color:var(--text-2)">
        <input type="radio" name="impmode" value="ergaenzen" style="width:auto;margin-top:3px">
        <span><strong style="color:var(--text)">Ergänzen</strong><br>Neue Blöcke und Bücher kommen dazu, vorhandene bleiben unangetastet.</span>
      </label>
      <label style="display:flex;gap:9px;align-items:flex-start;font-size:13px;color:var(--text-2)">
        <input type="radio" name="impmode" value="abgleichen" style="width:auto;margin-top:3px">
        <span><strong style="color:var(--text)">Abgleichen</strong><br>Wie „Ergänzen“, aber vorhandene Bücher übernehmen zusätzlich die
        Angaben aus der Datei: Seitenzahl, Jahr, Ausgabe, Beschreibung, Kurzfassung, Schwierigkeit, Autoren.
        <span style="color:var(--text-3)">Dein Fortschritt bleibt: Status, Sitzungen, Notizen, Fotos, Preis, Besitz.</span></span>
      </label>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Laden</button>`, { fokus: false });

  $('[data-ok]', s).onclick = async () => {
    const f = $('[data-file]', s).files[0];
    if (!f) { toast('Bitte erst eine Datei wählen.'); return; }
    let roh;
    try { roh = JSON.parse(await f.text()); }
    catch (e) { toast('Die Datei ist kein gültiges JSON.', 4000); return; }
    if (!roh || (!Array.isArray(roh.buecher) && !Array.isArray(roh.bloecke))) {
      toast('Darin steckt keine leseliste.', 4000); return;
    }
    const modus = $('input[name=impmode]:checked', s).value;
    const neu = normalisiere(roh);
    let neuBuch = 0, aktualisiert = 0;
    /* Wer gleich beim Start eine Datei lädt, bekommt die Arbeitskopie als Speicherort. */
    if (!Store.modus) { Store.modus = 'geraet'; Store.handle = null; await Store.metaSchreiben(); }

    if (modus === 'ersetzen') {
      const ok = erstStart || (!DB.buecher.length && !DB.bloecke.length) || await bestaetigen('Alles ersetzen?',
        `Dein jetziger Stand mit ${DB.buecher.length} Büchern wird verworfen und durch ${neu.buecher.length} Bücher aus der Datei ersetzt.`,
        'Ersetzen', true);
      if (!ok) return;
      /* Eine reine Listendatei bringt keine Einstellungen mit – dann bleiben
         Darstellung, Ziel und Einführung so, wie du sie hattest. */
      const eigene = Object.assign({}, DB.einstellungen);
      const planId = neu.einstellungen.aktiverPlanId;
      DB = neu;
      if (!roh.einstellungen) {
        DB.einstellungen = Object.assign(eigene, { aktiverPlanId: planId });
      }
    } else {
      aendern(() => {
        const artNach = {}, themaNach = {}, blockNach = {};
        neu.arten.forEach(a => {
          const da = DB.arten.find(x => x.name.toLowerCase() === a.name.toLowerCase());
          artNach[a.id] = da ? da.id : (DB.arten.push({ id: uid(), name: a.name, farbe: ART_FARBEN[DB.arten.length % 8] }), DB.arten[DB.arten.length - 1].id);
        });
        neu.themen.forEach(t => { themaNach[t.id] = themaFindenOderAnlegen(t.name); });
        const planNach = {};
        neu.lesepleane.slice().sort((a, b) => a.ord - b.ord).forEach(p => {
          const da = DB.lesepleane.find(x => x.name.toLowerCase() === p.name.toLowerCase());
          if (da) { planNach[p.id] = da.id; return; }
          const n = { id: uid(), name: p.name, ord: DB.lesepleane.length };
          DB.lesepleane.push(n); planNach[p.id] = n.id;
        });
        if (!DB.einstellungen.aktiverPlanId && DB.lesepleane[0]) DB.einstellungen.aktiverPlanId = DB.lesepleane[0].id;
        neu.bloecke.slice().sort((a, b) => a.ord - b.ord).forEach(bl => {
          const zielPlan = planNach[bl.planId] || DB.einstellungen.aktiverPlanId;
          const da = DB.bloecke.find(x => x.planId === zielPlan && x.name.toLowerCase() === bl.name.toLowerCase());
          if (da) { blockNach[bl.id] = da.id; return; }
          const n = { id: uid(), planId: zielPlan, name: bl.name, notiz: bl.notiz, ord: bloeckeVonPlan(zielPlan).length };
          DB.bloecke.push(n); blockNach[bl.id] = n.id;
        });
        /* Felder, die aus der Datei kommen dürfen – alles andere ist dein Fortschritt. */
        const katalogFelder = ['titel', 'autor', 'autoren', 'autorGeb', 'autorGest', 'autorBio', 'autorEinfluss',
          'jahr', 'seiten', 'seitenUnsicher', 'ausgabe', 'link', 'beschreibung', 'kurz', 'schwierigkeit'];
        neu.buecher.forEach(bu => {
          const zielBlock = blockNach[bu.blockId] || (DB.bloecke[0] && DB.bloecke[0].id);
          const da = DB.buecher.find(x => x.blockId === zielBlock && x.titel.toLowerCase() === bu.titel.toLowerCase());
          if (da) {
            if (modus === 'abgleichen') {
              katalogFelder.forEach(f => { if (bu[f] !== undefined && bu[f] !== null && bu[f] !== '') da[f] = bu[f]; });
              aktualisiert++;
            }
            return;
          }
          bu.id = uid(); bu.blockId = zielBlock; bu.ord = buecherIn(zielBlock).length;
          bu.notizen.forEach(n => { n.artId = artNach[n.artId] || null; n.themaId = themaNach[n.themaId] || null; });
          DB.buecher.push(bu);
          neuBuch++;
        });
      });
    }
    Store.aendern();
    await Store.sichern(true);
    if (erstStart) { appStarten(); }
    layerSchliessen();
    themeAnwenden();
    viewMalen();
    if (modus === 'ersetzen') toast('Liste geladen.');
    else toast([neuBuch ? pl(neuBuch, 'Buch neu', 'Bücher neu') : '',
      aktualisiert ? aktualisiert + ' aktualisiert' : '',
      (!neuBuch && !aktualisiert) ? 'Nichts zu tun – alles war schon da' : ''].filter(Boolean).join(', ') + '.', 3600);
  };
}
