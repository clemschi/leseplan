# Karte der Quelle

Wegweiser durch `mylife.src.html` (rund 10.600 Zeilen, eine Datei, vier Apps).
**Nicht nach Zeilennummern suchen – die verschieben sich.** Gesucht wird nach den
Ankern in `«»`: das sind die Abschnittsbanner im Text, wörtlich greppbar.

Aufbau der Datei: erst der `<style>`-Block, dann ein einziger `<script>`.
`build.js` setzt Dokumentrahmen und Kopfdaten darum.

---

## CSS (oben, bis `</style>`)

| Anker | Was |
|---|---|
| `«Tokens:` | Farben hell und dunkel, Akzent-Tabelle `DREI` |
| `«Kopfzeile` | `.topbar`, `.savechip`, `.kbanner` |
| `«Tableiste` | `.tabbar` |
| `«Bausteine` | `.list-card`, `.rowline`, `.field`, `.grid2`, `.zeile`, `.btn`, `.chip` |
| `«Plan` | `.book`, `.blockcard` |
| `«Overlay / Sheets` | `.overlay`, `.ovl-head`, `.sheet`, `.sheet-scrim` |
| `«Pager` | Buchseiten |
| `«Übersicht / Diagramme` | Graphen, Netz, Zeitstrahl |
| `«Einrichtung` | `.splash`, `.setup-inner`, Vollbild-Regeln |
| `«g'sund` | `.gbuehne`, `.gkarte`, `.gseite`, `.g-uhr`, `.gb-griff` |

Fastreader-CSS steht ohne eigenes Banner zwischen Einrichtung und g'sund:
`.frbuehne`, `.frwort`, `.frpult`, `.frbahn`.

---

## JavaScript

### Grundlage
| Anker / Funktion | Was |
|---|---|
| `«kleine Helfer` | `$`, `$$`, `uid`, `clamp`, `esc`, `pl` |
| `«Ruhe über der Tastatur` | `feldZuZeile`, `zeilenMachen`, `feldRuhig`, `felderBeobachten` – einzeilige Felder sind `.zeile` (contenteditable), nicht `<input>` |
| `«Toast` | `toast()` |
| `«Sichtbarer Bereich` | `leistenHoeheMessen`, `--vvh`, `--tabh` |
| `«Datenmodell` | `leereDb`, `normalisiere`, Statistik der leseliste |
| `«Speicher:` | `macheSpeicher(cfg)` – eine Ausfertigung je App |
| `«Ersteinrichtung` | `splashZeigen`, `setupZeigen`, `speicherErklaerung`, `appFlaeche`, `APPS` |
| `«Erscheinungsbild` | `SHELL`, `shellSchreiben`, `themeAnwenden`, `alsAppGestartet`, `vollbildUmschalten`, `vollbildAutostart` |
| `huelleEinstellungenHtml` / `…Binden` | der gemeinsame Block „Darstellung" im *Mehr* jeder App |
| `«Los geht's` | ganz unten: `boot()` |

### Ebenen und Gesten
| Anker / Funktion | Was |
|---|---|
| `«Ebenen:` | `layerOeffnen`, `layerErsetzen`, `layerSchliessen`, `alleLayerSchliessen`, `blatt`, `bestaetigen` |
| `ziehenZumSchliessen` | Blatt nach unten wegschieben |
| `ebeneZiehen` | Vollbild-Ebene vom linken Rand wegziehen |
| `vorhangSetzen` / `vorhangLoesen` / `vorhangHochBinden` / `unschaerfeSetzen` | Vorhang von oben (Übersicht, Vergangene) |
| `heimZiehen` | App nach rechts schieben → Startbildschirm; enthält die Tabu-Liste |
| `ziehenZumSortieren` | langes Drücken zum Verschieben |
| `wischNavigation` | quer durch die Reiter der leseliste |

### leseliste (Rumpf `#app`)
`«Plan`, `«Buchansicht:`, `«Seite 4: Lesen`, `«Diagramme`, `«Themenfelder`,
`«Suche über alles`, `«Einkaufsliste`, `«KI-Prompts`, `«Stöbern, Teil 1`,
`«Stöbern, Teil 2`, `«Mehr:`, `«Lese-Sitzungen`, `«Bilder:`, `«Daten laden`.
Einstieg: `leselisteOeffnen` → `appStarten` → `viewMalen`.

### kalender (Rumpf `#kal`, Präfix `k`)
Banner `«Kalender – die zweite App`. `kalenderOeffnen` → `kalStarten` → `kViewMalen`.
`«Tage rechnen` (`kDatum`, `kTagText`, `kFaelltAuf`), `«Heute` (`kHeuteMalen`),
`«Kalender: das Monatsblatt` (`kMonatMalen`, `kMonatZiehen`, `kTagBlatt`),
`«To-Do` (`kTodoMalen`, `kThemaHtml`, `kTagBearbeiten`) – Thema → Tag → Tätigkeit.

### fastreader (Rumpf `#fr`, Präfix `fr`/`f`)
Banner `«fastreader – die dritte App`. `fastreaderOeffnen` → `frStarten` → `fViewMalen`.
`«Text aufbereiten` (`frZerlegen`, `frFixpunkt`, `frFaktor`),
`«Bibliothek`, `«Text hereinholen` (`frDocx`, `frPdf`, `frUrl`),
`«Lesen` (`frTakt`, `frWortMalen`, `frVertiefen`, `frBahnZiehen`), `«Bilanz`.

### g'sund (Rumpf `#gs`, Präfix `g`)
Banner `«g'sund – die vierte App`. `gsundOeffnen` → `gsStarten` → `gViewMalen`.
`«Der Countdown` (`gZiel`, `gRest`, `gUhrLaufen`),
`«Guzi: die Karte` (`gGuziMalen`, `gKarteZiehen`, `gKarteAblegen`),
`«Die Vergangenen` (`gVergangenOeffnen`, `gZurueckholen`, `gVorhangBinden`),
`«Puzzle und Bald` – noch leer.

---

## Wo suche ich was?

| Frage | Anker |
|---|---|
| Wo wird gespeichert? | `macheSpeicher`, `IDB`, Schlüssel `daten-*` / `meta-*` |
| Warum springt die Tastatur auf? | `blatt(` – Fokus nur bei `{ fokus: true }` |
| Wie kommt eine App in die Fussleiste? | `TABS`, `KTABS`, `FTABS`, `GTABS` |
| Wo hängt ein Wisch? | `window.__zieht` – wer ihn setzt, hat den Zug |
| Warum sieht ein Knopf überall gleich aus? | `globalKnoepfeHtml`, `saveChipMalen` |
| Neue App anlegen? | `APPS`, `appFlaeche`, ein `macheSpeicher`, ein Rumpf mit `.appflaeche` |

## Stand

Vier Apps laufen: leseliste, kalender, fastreader, g'sund. Offen ist einzig der
Reiter **Puzzle** in g'sund – dort steht ein Platzhalter, die Anweisungen dazu
folgen noch. Ebenso der dritte Reiter **Bald**.

## Zahlen zum Prüfen statt Bilder

`getBoundingClientRect()` für Masse, `getComputedStyle()` für Farben und
`transform`, `DOMMatrixReadOnly` für Winkel. Testskripte liegen im
Scratchpad-Verzeichnis der Sitzung; die Startbausteine heissen `helper.js`
(leseliste), `kal.js`, `fr.js`, `gs.js`.
