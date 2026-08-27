/* ============================================================
   KI-Prompts: Leseliste erstellen oder bewerten lassen
   ============================================================ */
/* Die Sprachregel hängt von der Wahl im Formular ab. */
const KI_SPRACHEN = {
  deutsch: {
    label: 'Deutsch',
    kurz: 'vorzugsweise deutsche Ausgaben',
    text: `- Bei Büchern **vorzugsweise deutsche Ausgaben**: Titel und "ausgabe" dann auf Deutsch, "jahr" bleibt aber das Original-Erscheinungsjahr.
- Englischsprachige Werke nur, wenn sie einschlägig sind und es keine brauchbare Übersetzung gibt – dann Originaltitel verwenden.
- Beschreibung, Kurzfassung und Biographien immer auf Deutsch.`
  },
  englisch: {
    label: 'Englisch',
    kurz: 'englische Originalausgaben',
    text: `- Bei Büchern **die englische Ausgabe**: Originaltitel und englischer Verlag in "ausgabe", "jahr" ist das Jahr der Erstveröffentlichung.
- Werke, die es nur auf Deutsch gibt, dürfen mit deutschem Titel dabei sein, wenn sie einschlägig sind.
- Beschreibung, Kurzfassung und Biographien trotzdem immer auf Deutsch – gelesen wird die App auf Deutsch.`
  },
  gemischt: {
    label: 'Gemischt',
    kurz: 'deutsch und englisch nebeneinander',
    text: `- Sprache der Ausgabe frei: nimm jeweils die Fassung, die für dieses Werk die bessere ist – deutsche Übersetzung, wo sie gut und verbreitet ist, sonst das englische Original.
- Titel und "ausgabe" in der Sprache der gewählten Ausgabe, "jahr" bleibt das Original-Erscheinungsjahr.
- Beschreibung, Kurzfassung und Biographien immer auf Deutsch.`
  }
};

function kiSchemaText(regeln, mitArtikeln, stoebern, sprache) {
  /* Beim Stöbern kommt kein fertiger Plan zurück, sondern nur der Vorrat an
     Werken – Blöcke baut man danach selbst aus dem Gemerkten. */
  const aufbau = stoebern ? `{
  "format": "leseliste-stoebern",
  "version": 1,
  "themen": ["Erstes Thema", "Zweites Thema"],
  "werke": [{
    "titel": "...",
    "thema": "Erstes Thema",
    "autor": "Anzeigename, bei mehreren Autoren durch Komma getrennt",
    "autoren": [{ "name": "...", "geb": 1946, "gest": null,
      "bio": "Zwei bis vier Sätze Biographie.",
      "einfluss": ["Name einer Person, von der er/sie beeinflusst wurde", "..."] }],
    "jahr": 1975,
    "seiten": 300,
    "seitenUnsicher": false,
    "ausgabe": "Verlag, ggf. Übersetzer:in einer gängigen deutschen Ausgabe",
    "link": "",
    "beschreibung": "Ein Absatz: worum es geht und für wen es sich lohnt.",
    "kurz": "Das Werk in höchstens 15 Wörtern.",
    "schwierigkeit": 3,
    "besitz": "fehlt"
  }]
}` : `{
  "lesepleane": [{ "id": "p1", "name": "..." }],
  "bloecke": [{ "id": "b1", "planId": "p1", "name": "...", "ord": 0 }],
  "buecher": [{
    "id": "bu1", "blockId": "b1", "ord": 0,
    "titel": "...",
    "autor": "Anzeigename, bei mehreren Autoren durch Komma getrennt",
    "autoren": [{ "name": "...", "geb": 1946, "gest": null,
      "bio": "Zwei bis vier Sätze Biographie.",
      "einfluss": ["Name einer Person, von der er/sie beeinflusst wurde", "..."] }],
    "jahr": 1975,
    "seiten": 300,
    "seitenUnsicher": false,
    "ausgabe": "Verlag, ggf. Übersetzer:in einer gängigen deutschen Ausgabe",
    "link": "",
    "beschreibung": "Ein Absatz: worum es geht und warum es in diese Liste gehört.",
    "kurz": "Das Werk in höchstens 15 Wörtern.",
    "schwierigkeit": 3,
    "besitz": "fehlt"
  }]
}`;
  const eigen = stoebern
    ? '- "thema" trägt jedes Werk; die Schreibweise muss genau einem Eintrag aus "themen" entsprechen.\n'
      + '- Keine Blöcke, keine leseliste, keine "id"-Felder – nur der flache Vorrat unter "werke".\n'
      + '- Keine Dopplungen: kein Titel zweimal, auch nicht unter verschiedenen Themen.'
    : '- "id"-Werte müssen nur innerhalb dieser Antwort zueinander passen ("planId" verweist auf eine "id" aus "lesepleane", "blockId" auf eine "id" aus "bloecke").';
  return `## Wie du antwortest

Lege das Ergebnis als **Datei zum Herunterladen** an, Dateiname \`${stoebern ? 'stoebern' : 'leseliste'}.json\`, und gib mir diese Datei.
Schreib den Inhalt nicht als Nachricht in den Chat und nicht in einen Code-Block – ich brauche eine Datei,
die ich unverändert speichern kann. Nutze dafür dein Werkzeug zum Erstellen von Dateien. Im Chat genügt
ein Satz, was drin ist. Die Datei selbst enthält reines JSON: kein Text davor oder danach, keine Kommentare,
kein Markdown. Prüfe vor der Ausgabe, dass sie sich fehlerfrei mit \`JSON.parse\` lesen lässt.

## Aufbau der Datei
${aufbau}

## Regeln
- Nur real existierende, überprüfbare Werke – nichts erfinden, keine erfundenen DOI oder Seitenzahlen.
- "jahr" ist das Jahr der Erstveröffentlichung im Original; vor Christus als negative Zahl (z. B. -380 für 380 v. Chr.).
- "seiten" ist der Umfang; bei Unsicherheit "seitenUnsicher": true setzen und trotzdem schätzen.
- "schwierigkeit" von 1 (leicht) bis 5 (sehr anspruchsvoll).
- Bei mehreren Autoren jede:n einzeln in "autoren" auflisten, mit je eigenen Lebensdaten, Biographie und Einfluss.
- "link" bleibt leer, wo es keine verlässliche feste Adresse gibt – lieber leer als geraten.
${eigen}

## Sprache
${(KI_SPRACHEN[sprache] || KI_SPRACHEN.deutsch).text}${mitArtikeln ? `

## Fachartikel
- Neben Büchern auch **wissenschaftliche Fachartikel** aufnehmen – etwa was über Google Scholar auffindbar ist.
- Nur hohe Qualität: peer-reviewed, in angesehenen Fachzeitschriften, möglichst viel zitiert oder als Standardreferenz des Feldes anerkannt. Lieber wenige einschlägige als viele beliebige.
- Bei Artikeln ist die Sprache gleichgültig – englische sind ausdrücklich erwünscht, entscheidend ist allein die Qualität.
- "ausgabe" beginnt bei Artikeln mit \`Fachartikel · \` und nennt dann Zeitschrift, Jahrgang, Heft, Seiten und DOI, z. B.:
  \`Fachartikel · Econometrica 47(2), S. 263–291, DOI: 10.2307/1914185\`
- "seiten" ist bei Artikeln der Umfang in Seiten, "besitz" setzt du bei Artikeln auf \`"bibliothek"\` – dann landen sie nicht auf der Einkaufsliste.
- **"link" ist bei jedem Fachartikel Pflicht**: die auflösbare DOI-Adresse in der Form \`https://doi.org/10.xxxx/yyyy\`. Nur wenn es nachweislich keine DOI gibt, die feste Seite der Zeitschrift oder des Repositoriums. Keine Suchlinks, keine erfundenen Adressen – im Zweifel nimm ein anderes Werk, zu dem du die Fundstelle sicher kennst.
- Bei Büchern bleibt "link" leer, es sei denn, das Werk ist frei und dauerhaft online zu lesen; dann darf die Adresse hinein.` : ''}${regeln ? '\n' + regeln : ''}`;
}

function kiPromptZeigen(prompt, dateiname, stoebern) {
  const s = blatt('Prompt', `
    <p class="hinweis" style="padding:0 0 10px">
      Kopieren, in Claude einfügen. Die Antwort als <span class="num">.json</span> speichern und hier ${stoebern
      ? 'unter <strong>Stöbern</strong> laden.'
      : 'unter „Daten aus Datei laden“ → „Ergänzen“ einspielen.'}
    </p>
    <div class="btn-row">
      <button class="btn btn-primary" data-kopieren style="flex:1">In die Zwischenablage</button>
      <button class="btn" data-txt style="flex:1">Als Textdatei</button>
    </div>
    <pre style="margin-top:14px;max-height:44vh;overflow:auto;font-size:11px;color:var(--text-2);white-space:pre-wrap;font-family:'IBM Plex Mono',monospace;user-select:text;-webkit-user-select:text;-webkit-touch-callout:default">${esc(prompt)}</pre>`,
    { fokus: false });
  $('[data-kopieren]', s).onclick = () => kopierenMitRueckfall(prompt, $('pre', s));
  $('[data-txt]', s).onclick = () => dateiAnbieten(dateiname, prompt);
}

function kiErstellenOeffnen() {
  const artLabel = { forschungsfrage: 'Forschungsfrage', these: 'These', thema: 'Thema' };
  const s = blatt('Leseliste per KI erstellen', `
    <div class="field">
      <label>Was soll die Liste erschließen?</label>
      <label class="optzeile"><input type="radio" name="kiart" value="forschungsfrage" checked>
        <span><strong>Forschungsfrage</strong> – eine offene Frage, die die Liste beantworten helfen soll</span></label>
      <label class="optzeile"><input type="radio" name="kiart" value="these">
        <span><strong>These</strong> – eine Behauptung, die von mehreren Seiten geprüft wird</span></label>
      <label class="optzeile"><input type="radio" name="kiart" value="thema">
        <span><strong>Thema</strong> – ein Feld, das im Überblick erschlossen wird</span></label>
    </div>
    <div class="field">
      <label data-artlabel>Forschungsfrage</label>
      <textarea data-text style="min-height:90px"></textarea>
    </div>
    <div class="field">
      <label>Name der neuen leseliste</label>
      <input type="text" data-name placeholder="z. B. Wachstumskritik">
    </div>
    <div class="field">
      <label>Wie viele Werke ungefähr?</label>
      <input type="number" data-anzahl value="16" min="4" max="60">
    </div>
    <div class="field">
      <label class="optzeile"><input type="checkbox" data-artikel checked>
        <span><strong>Auch Fachartikel</strong><br>Peer-reviewed und viel zitiert, wie über Google Scholar
        auffindbar – bei Artikeln zählt allein die Qualität, nicht die Sprache.</span></label>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Prompt erzeugen</button>`, { fokus: false });

  $$('input[name=kiart]', s).forEach(r => r.onchange = () => {
    $('[data-artlabel]', s).textContent = artLabel[r.value];
  });

  $('[data-ok]', s).onclick = () => {
    const art = $('input[name=kiart]:checked', s).value;
    const text = $('[data-text]', s).value.trim();
    if (!text) { toast('Bitte erst ' + artLabel[art].toLowerCase() + ' eintragen.'); return; }
    const anzahl = clamp(Math.round(num($('[data-anzahl]', s).value) || 16), 4, 60);
    const artikel = $('[data-artikel]', s).checked;
    const name = $('[data-name]', s).value.trim() || (art === 'thema' ? text : artLabel[art]);
    const einleitung = {
      forschungsfrage: 'die folgender Forschungsfrage nachgeht',
      these: 'die folgende These von mehreren Seiten beleuchtet – auch mit Gegenpositionen, nicht nur zustimmender Literatur',
      thema: 'die folgendes Thema erschließt'
    }[art];
    const prompt = `Ich nutze eine App für einen mehrjährigen Leseplan (leselisten aus Blöcken aus Werken, mit Autor:innen-Biographien und deren Einflüssen). Stell mir eine neue leseliste zusammen, ${einleitung}:

"${text}"

Etwa ${anzahl} Werke${artikel ? ' – Bücher und wissenschaftliche Fachartikel gemischt' : ' (nur Bücher)'}, sinnvoll in thematische Blöcke gegliedert (mehrere Werke je Block). Wo das Thema kontrovers ist, nimm bewusst unterschiedliche Positionen und wo möglich Primärquellen auf, nicht nur Sekundärliteratur darüber. Die leseliste soll „${name}“ heißen.

${kiSchemaText('', artikel)}`;
    kiPromptZeigen(prompt, 'leseliste-prompt.txt');
  };
}

function kiBewertenOeffnen() {
  const plan = aktiverPlan();
  if (!plan) { toast('Erst eine leseliste anlegen.'); return; }
  const bloecke = bloeckeSortiert().filter(bl => buecherIn(bl.id).length);
  const buecher = buecherAktiv();
  if (!buecher.length) { toast('Diese leseliste hat noch keine Bücher.'); return; }

  const s = blatt('Leseliste per KI bewerten', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Erzeugt einen Prompt mit deiner aktuellen leseliste „${esc(plan.name)}“ (${pl(buecher.length, 'Buch', 'Bücher')}).
      Die Antwort schlägt fehlende Werke vor, passend zum Einspielen über „Ergänzen“.
    </p>
    <div class="field">
      <label>Worauf soll besonders geachtet werden? (optional)</label>
      <textarea data-zusatz style="min-height:70px" placeholder="z. B. mehr internationale Stimmen, mehr Gegenpositionen zu Block 3 …"></textarea>
    </div>
    <div class="field">
      <label class="optzeile"><input type="checkbox" data-artikel checked>
        <span><strong>Auch Fachartikel</strong><br>Peer-reviewed und viel zitiert, wie über Google Scholar
        auffindbar – bei Artikeln zählt allein die Qualität, nicht die Sprache.</span></label>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Prompt erzeugen</button>`, { fokus: false });

  $('[data-ok]', s).onclick = () => {
    const zusatz = $('[data-zusatz]', s).value.trim();
    const artikel = $('[data-artikel]', s).checked;
    const listing = bloecke.map(bl =>
      `### ${bl.name}\n` + buecherIn(bl.id).map(b =>
        `- ${b.titel} — ${b.autor || 'ohne Autor'} (${jahrText(b.jahr)})${b.kurz ? ' — ' + b.kurz : ''}`
      ).join('\n')
    ).join('\n\n');

    const prompt = `Ich nutze eine App für einen mehrjährigen Leseplan. Das ist meine aktuelle leseliste „${plan.name}“, ${pl(bloecke.length, 'Block', 'Blöcke')}, ${pl(buecher.length, 'Werk', 'Werke')}:

${listing}

Bitte:
1. Beurteile diese Liste: Wo gibt es Lücken, Einseitigkeiten oder fehlende Gegenpositionen? Was fehlt, um das Thema bzw. die Themen ausgewogen abzudecken?${zusatz ? ' ' + zusatz : ''}
2. Schlag mir zusätzliche, real existierende Werke vor, die diese Lücken schließen – keine Titel, die schon oben stehen.${artikel ? ' Bücher und wissenschaftliche Fachartikel gemischt: gerade wo die Liste bisher nur Monographien führt, ist der Forschungsstand in Aufsätzen oft aktueller.' : ''}
3. Ordne jeden Vorschlag entweder einem der bestehenden Blöcke zu (dann exakt denselben Blocknamen wie oben verwenden) oder einem neuen, treffend benannten Block.

Die Beurteilung aus Punkt 1 gehört in den Chat, die Vorschläge aus Punkt 2 und 3 in die Datei.

${kiSchemaText('- "lesepleane" enthält genau einen Eintrag mit dem Namen exakt „' + plan.name + '“, damit die Vorschläge in diese leseliste einsortiert werden statt eine neue anzulegen.\n- Nur die vorgeschlagenen, neuen Werke ausgeben – nicht die schon vorhandenen.', artikel)}`;
    kiPromptZeigen(prompt, 'leseliste-ergaenzen-prompt.txt');
  };
}

