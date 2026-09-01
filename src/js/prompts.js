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

/* ---------- Einzelne Werke über die ISBN ---------- */
/* Aus freiem Text alle ISBN herausklauben: Bindestriche und Leerzeichen
   fallen weg, und die Prüfziffer sagt, ob sich jemand vertippt hat. */
function isbnPruefen(roh) {
  const z = String(roh).replace(/[^0-9Xx]/g, '').toUpperCase();
  if (z.length === 13) {
    if (!/^\d{13}$/.test(z)) return null;
    let n = 0;
    for (let i = 0; i < 12; i++) n += (+z[i]) * (i % 2 ? 3 : 1);
    return ((10 - n % 10) % 10) === +z[12] ? z : null;
  }
  if (z.length === 10) {
    if (!/^\d{9}[\dX]$/.test(z)) return null;
    let n = 0;
    for (let i = 0; i < 9; i++) n += (+z[i]) * (10 - i);
    n += z[9] === 'X' ? 10 : +z[9];
    return n % 11 === 0 ? z : null;
  }
  return null;
}
/* Je Zeile eine Nummer. Was nicht aufgeht, kommt als Fehlzeile zurück –
   lieber vorher stutzig werden als hinterher ein erfundenes Buch. */
function isbnLesen(text) {
  const gut = [], schlecht = [];
  String(text).split(/[\n,;]+/).forEach(z => {
    const t = z.trim();
    if (!t) return;
    const ok = isbnPruefen(t);
    if (ok) { if (!gut.includes(ok)) gut.push(ok); } else schlecht.push(t.slice(0, 40));
  });
  return { gut, schlecht };
}
/* Weitergereicht wird die blanke Ziffernfolge. Bindestriche zu setzen hiesse
   raten: wo die Gruppen liegen, hängt an den Nummernbereichen der Verlage,
   und eine falsch gesetzte Trennung sieht richtig aus, ist es aber nicht. */

function kiIsbnOeffnen() {
  const plan = aktiverPlan();
  const bloecke = plan ? bloeckeSortiert() : [];
  const s = blatt('Werke über die ISBN holen', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Eine ISBN je Zeile. Der Prompt lässt genau diese Ausgaben nachschlagen und
      gibt eine <span class="num">.json</span> zurück, die du unter „Daten aus Datei laden“
      → <strong>Ergänzen</strong> einspielst.
    </p>
    <div class="field">
      <label>ISBN – eine je Zeile</label>
      <textarea data-isbn style="min-height:120px;font-family:'IBM Plex Mono',monospace;font-size:13px"
        placeholder="978-3-518-58691-4&#10;9783446270374"></textarea>
      <span class="hint" data-zaehler>Noch nichts eingetragen.</span>
    </div>
    ${plan ? '' : `<div class="field"><label>Name der leseliste</label>
      <input type="text" data-planname placeholder="z. B. Gelesen"></div>`}
    <div class="field">
      <label>Wohin damit?</label>
      <select data-block>
        ${bloecke.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`).join('')}
        <option value="" ${bloecke.length ? '' : 'selected'}>… neuer Block</option>
      </select>
    </div>
    <div class="field" data-neuerblock ${bloecke.length ? 'hidden' : ''}>
      <label>Name des neuen Blocks</label>
      <input type="text" data-blockname placeholder="z. B. Zugelaufen">
    </div>
    <div class="field">
      <label>Sprache der Ausgaben</label>
      <select data-sprache>
        ${Object.entries(KI_SPRACHEN).map(([id, x]) =>
    `<option value="${id}"${id === 'deutsch' ? ' selected' : ''}>${x.label} – ${x.kurz}</option>`).join('')}
      </select>
      <span class="hint">Gilt für Beschreibung und Kurzfassung. Die Ausgabe selbst
        steht ohnehin fest – sie hängt an der ISBN.</span>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Prompt erzeugen</button>`, { fokus: false });

  const zaehlen = () => {
    const { gut, schlecht } = isbnLesen($('[data-isbn]', s).value);
    const z = $('[data-zaehler]', s);
    z.textContent = !gut.length && !schlecht.length ? 'Noch nichts eingetragen.'
      : pl(gut.length, 'gültige ISBN', 'gültige ISBN')
      + (schlecht.length ? ' · ' + schlecht.length + ' passt nicht: ' + schlecht.join(', ') : '');
    z.style.color = schlecht.length ? 'var(--bad)' : '';
  };
  $('[data-isbn]', s).addEventListener('input', zaehlen);

  $('[data-block]', s).onchange = e => {
    $('[data-neuerblock]', s).hidden = !!e.target.value;
  };

  $('[data-ok]', s).onclick = () => {
    const { gut, schlecht } = isbnLesen($('[data-isbn]', s).value);
    if (!gut.length) { toast('Keine gültige ISBN dabei.'); return; }
    if (schlecht.length) { toast(schlecht.length + ' Zeile(n) passen nicht – die bleiben aussen vor.', 4000); }
    const planName = plan ? plan.name : ($('[data-planname]', s).value.trim() || 'Gelesen');
    const gewaehlt = $('[data-block]', s).value;
    const blockName = gewaehlt || ($('[data-blockname]', s).value.trim() || 'Neu dazu');
    const sprache = $('[data-sprache]', s).value;

    const prompt = `Ich nutze eine App für einen mehrjährigen Leseplan (leselisten aus Blöcken aus Werken, mit Autor:innen-Biographien und deren Einflüssen). Ich gebe dir ${gut.length === 1 ? 'eine ISBN' : gut.length + ' ISBN'}. Schlag ${gut.length === 1 ? 'das Werk' : 'jedes Werk'} nach und gib es mir im Format der App zurück.

${gut.map(z => '- ' + z).join('\n')}

## Was du je ISBN tust
1. Bestimme, **welche Ausgabe** genau diese Nummer bezeichnet: Verlag, Erscheinungsjahr dieser Ausgabe, Übersetzer:in, Reihe, Auflage.
2. Trag diese Ausgabe in "ausgabe" ein und **hänge die ISBN hinten an**, in der Form \`… , ISBN ${gut[0]}\`.
3. "titel" ist der Titel dieser Ausgabe, "jahr" dagegen das Jahr der **Erstveröffentlichung des Werks im Original** – nicht das dieser Ausgabe.
4. "seiten" ist der Umfang **dieser** Ausgabe.
5. Beschreibung, Kurzfassung, Schwierigkeit und die Angaben zu den Autor:innen wie im Schema unten.

## Wenn du eine ISBN nicht sicher zuordnen kannst
Lass sie weg und schreib im Chat, welche es war. **Rate nicht** – eine erfundene Ausgabe ist schlimmer als eine fehlende. Dasselbe gilt für einzelne Felder: lieber \`null\` oder leer als geraten.

${kiSchemaText('- "lesepleane" enthält genau einen Eintrag mit dem Namen exakt „' + planName + '“.\n'
      + '- "bloecke" enthält genau einen Eintrag mit dem Namen exakt „' + blockName + '“; alle Bücher verweisen mit "blockId" darauf.\n'
      + '- Ein Buch je zugeordneter ISBN, in der Reihenfolge, in der sie oben stehen ("ord" von 0 an).',
      false, false, sprache)}`;
    kiPromptZeigen(prompt, 'leseliste-isbn-prompt.txt');
  };
}

/* ---------- Vorrat aus Webseiten ---------- */
/* Bestenlisten, Verlagsprogramme, Feuilleton-Seiten: alles, was Bücher
   aufzählt. Der Prompt lässt die Seiten lesen und macht daraus einen Vorrat
   fürs Stöbern. Der Knackpunkt ist das Entdoppeln – dieselbe Bestenliste
   steht oft auf mehreren Seiten. */
function webAdressen(text) {
  const gut = [], schlecht = [];
  String(text).split(/[\s,;]+/).forEach(t => {
    const roh = t.trim().replace(/[),.]+$/, '');
    if (!roh) return;
    let u = roh;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try {
      const geprueft = new URL(u);
      if (!/^https?:$/.test(geprueft.protocol) || !geprueft.hostname.includes('.')) throw 0;
      if (!gut.includes(geprueft.href)) gut.push(geprueft.href);
    } catch (e) { schlecht.push(roh.slice(0, 40)); }
  });
  return { gut, schlecht };
}
/* Nur der Wirtsname – der reicht, um im Blatt zu zeigen, was erkannt wurde. */
const webWirt = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

function stoebernWebOeffnen() {
  const s = blatt('Sammlung aus Bestenlisten', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Adressen von Seiten, die Bücher aufzählen – Bestenlisten, Verlagsprogramme,
      Feuilleton. Daraus wird ein Vorrat zum <strong>Stöbern</strong>. Dieselbe Liste
      steht oft auf mehreren Seiten; der Prompt fasst das zu einem Eintrag zusammen.
    </p>
    <div class="field">
      <label>Adressen – eine je Zeile</label>
      <textarea data-web style="min-height:110px;font-size:12.5px"
        placeholder="https://shop.zeit.de/…/sachbuchbestenliste-2026&#10;https://www.perlentaucher.de/…"></textarea>
      <span class="hint" data-webzaehler>Noch nichts eingetragen.</span>
    </div>
    <div class="field">
      <label>Wonach werden die Werke sortiert?</label>
      <label class="optzeile"><input type="radio" name="stowthema" value="sach" checked>
        <span><strong>Nach Sachgebiet</strong> – die KI ordnet quer über alle Seiten</span></label>
      <label class="optzeile"><input type="radio" name="stowthema" value="quelle">
        <span><strong>Nach Herkunft</strong> – je Seite ein Thema, so wie sie dort steht</span></label>
    </div>
    <div class="field" data-feldGebiete>
      <label>Wie viele Sachgebiete?</label>
      <input type="number" data-gebiete value="5" min="2" max="20">
    </div>
    <div class="field">
      <label>Höchstens wie viele Werke?</label>
      <input type="number" data-anzahl value="60" min="10" max="250">
      <span class="hint" data-webmenge></span>
    </div>
    <div class="field">
      <label>Sprache der Ausgaben</label>
      <div class="chiprow" style="padding-left:0;flex-wrap:wrap;overflow:visible" data-sprache></div>
    </div>
    <div class="field">
      <label class="optzeile"><input type="checkbox" data-ohnevorhanden checked>
        <span><strong>Weglassen, was ich schon habe</strong><br>Die Titel aus deiner leseliste
        gehen im Prompt mit, damit nichts doppelt zurückkommt.</span></label>
    </div>
    <div class="field">
      <label>Worauf soll besonders geachtet werden? (optional)</label>
      <textarea data-zusatz style="min-height:60px" placeholder="z. B. nur die ersten zehn je Liste, keine Belletristik …"></textarea>
    </div>
    <button class="btn btn-primary btn-block" data-ok>Prompt erzeugen</button>`, { fokus: false });

  let sprache = 'deutsch';
  const spracheMalen = () => {
    $('[data-sprache]', s).innerHTML = Object.keys(KI_SPRACHEN).map(k =>
      `<button class="chip" data-sp="${k}" aria-pressed="${k === sprache}">${KI_SPRACHEN[k].label}</button>`).join('');
    $$('[data-sp]', s).forEach(b => b.onclick = () => { sprache = b.dataset.sp; spracheMalen(); });
  };
  spracheMalen();

  const zaehlen = () => {
    const { gut, schlecht } = webAdressen($('[data-web]', s).value);
    const z = $('[data-webzaehler]', s);
    z.textContent = !gut.length && !schlecht.length ? 'Noch nichts eingetragen.'
      : pl(gut.length, 'Adresse', 'Adressen') + (gut.length ? ': ' + gut.map(webWirt).join(', ') : '')
      + (schlecht.length ? ' · ' + schlecht.length + ' passt nicht: ' + schlecht.join(', ') : '');
    z.style.color = schlecht.length ? 'var(--bad)' : '';
  };
  $('[data-web]', s).addEventListener('input', zaehlen);

  const mengeHinweis = () => {
    const n = Math.round(num($('[data-anzahl]', s).value) || 0);
    $('[data-webmenge]', s).innerHTML = n > 50
      ? 'Über 50 Werke schafft die Claude-Basisversion selten in einem Durchgang – dann lieber zwei Durchgänge mit je der Hälfte der Adressen.'
      : 'Bis etwa 50 Werke geht in einem Durchgang.';
  };
  $('[data-anzahl]', s).addEventListener('input', mengeHinweis);
  mengeHinweis();

  const themaMalen = () => {
    $('[data-feldGebiete]', s).hidden = $('input[name=stowthema]:checked', s).value !== 'sach';
  };
  $$('input[name=stowthema]', s).forEach(r => r.onchange = themaMalen);
  themaMalen();

  $('[data-ok]', s).onclick = () => {
    const { gut, schlecht } = webAdressen($('[data-web]', s).value);
    if (!gut.length) { toast('Keine brauchbare Adresse dabei.'); return; }
    if (schlecht.length) toast(schlecht.length + ' Zeile(n) sind keine Adresse – die bleiben aussen vor.', 4000);
    const nachSach = $('input[name=stowthema]:checked', s).value === 'sach';
    const gebiete = clamp(Math.round(num($('[data-gebiete]', s).value) || 5), 2, 20);
    const anzahl = clamp(Math.round(num($('[data-anzahl]', s).value) || 60), 10, 250);
    const zusatz = $('[data-zusatz]', s).value.trim();

    /* Was schon in der leseliste steht, geht als Sperrliste mit. */
    const vorhanden = $('[data-ohnevorhanden]', s).checked
      ? DB.buecher.map(b => b.titel + (b.autor ? ' — ' + b.autor : '')).filter(Boolean)
      : [];

    const themaTeil = nachSach
      ? `Ordne die Werke in **${gebiete} Sachgebiete**, die du selbst aus dem bestimmst, was tatsächlich`
        + ` auf den Seiten steht – quer über alle Adressen hinweg, nicht je Seite eines. Trag die`
        + ` Gebiete oben unter "themen" ein und verwende genau diese Schreibweise.`
      : `Je Adresse **ein Thema**, benannt nach der Liste, aus der die Werke stammen`
        + ` (etwa „ZEIT Sachbuch-Bestenliste 01/2026“ – so, wie die Seite sich selbst nennt,`
        + ` mit Monat oder Jahr, wenn sie eines trägt). Trag diese Namen oben unter "themen" ein.`;

    const prompt = `Ich nutze eine App für einen mehrjährigen Leseplan. Stell mir keinen fertigen Plan zusammen, sondern einen **Vorrat an Werken** zum Durchblättern – und zwar aus dem, was auf diesen Seiten steht.

## Die Seiten
${gut.map(u => '- ' + u).join('\n')}

**Ruf jede dieser Seiten wirklich auf** und nimm die Werke, die dort aufgeführt sind. Nichts aus dem Gedächtnis ergänzen, nichts dazuerfinden. Lässt sich eine Seite nicht lesen, schreib das im Chat und lass sie aus – lieber weniger Werke als erfundene.

## Keine Dopplungen
Das ist hier der springende Punkt, weil dieselbe Liste oft auf mehreren Seiten steht:
- **Ein Werk = ein Eintrag**, auch wenn es auf mehreren der Seiten auftaucht.
- Auch **verschiedene Ausgaben, Auflagen oder Übersetzungen desselben Werks** sind ein Eintrag, nicht mehrere. Entscheide nach Autor:in und Originalwerk, nicht nach dem Wortlaut des Titels.
- Steht ein Werk auf mehreren Listen, nenn das am Ende von "beschreibung" in der Form \`Gelistet bei: ZEIT, Perlentaucher.\` – das ist ein Hinweis, kein eigenes Feld.
- Prüfe die fertige Liste vor der Ausgabe noch einmal auf Dopplungen.${vorhanden.length ? `

## Was ich schon habe
Diese Werke stehen bereits in meiner leseliste. Lass sie weg – auch in anderer Ausgabe oder Übersetzung:

${vorhanden.map(t => '- ' + t).join('\n')}` : ''}

## Themen
${themaTeil}

Höchstens ${anzahl} Werke insgesamt. Sind es auf den Seiten mehr, nimm die, die dort oben stehen beziehungsweise am stärksten hervorgehoben sind. Nur Bücher, keine Fachartikel.

${kiSchemaText('- "jahr" ist auch hier das Jahr der Erstveröffentlichung im Original, nicht das der auf der Seite beworbenen Ausgabe.\n'
      + '- "ausgabe" ist die Ausgabe, die auf der Seite steht – Verlag, Jahr, wenn angegeben Übersetzer:in.\n'
      + '- "beschreibung" schreibst du selbst: worum es geht und für wen es sich lohnt. Übernimm keinen Werbetext von der Seite.\n'
      + '- "link" bleibt leer – eine Shop-Adresse ist keine Fundstelle.',
      false, true, sprache)}${zusatz ? '\n\n## Außerdem\n' + zusatz : ''}`;
    kiPromptZeigen(prompt, 'stoebern-web-prompt.txt', true);
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

