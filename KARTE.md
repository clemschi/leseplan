# Karte der Quelle

Die Quelle liegt in Bausteinen unter `src/`. `node build.js` setzt sie in dieser
Reihenfolge zu `mylife.html` zusammen – die Reihenfolge steht in `build.js`.

**Zuerst hier nachsehen, welcher Baustein gemeint ist, dann nur den öffnen.**
Eine ganze App sind 800–1200 Zeilen statt 10.500. Die Zeilenzahlen sind
Anhaltspunkte, keine Zusicherung – sie wandern mit jeder Änderung.

---

## Stil (`src/stil/`, wird zu einem `<style>`)

| Datei | Zeilen | Was |
|---|---|---|
| `basis.css` | 582 | Farbtokens hell/dunkel, Akzente (`DREI`), Kopfzeile, Tableiste, Bausteine (`.list-card`, `.rowline`, `.chip`, `.field`, `.grid2`), Plan, Overlay/Sheets, Pager, Bilder, Diagramme, Einrichtung |
| `kalender.css` | 117 | alles mit `k`-Präfix |
| `fastreader.css` | 91 | `.frbuehne`, `.frwort`, `.frpult`, `.frbahn` |
| `gsund.css` | 53 | `.gbuehne`, `.gkarte`, `.gseite`, `.g-uhr`, `.gb-griff` |
| `stoebern.css` | 129 | `.sto…` – der Kartenstapel |

## Markup

| Datei | Zeilen | Was |
|---|---|---|
| `kopf.html` | 4 | Titel und Schriften |
| `rumpf.html` | 109 | `#setup` und die vier Rümpfe `#app`, `#kal`, `#fr`, `#gs`, dazu `#layers` |

## Skript (`src/js/`, wird zu einem `<script>`)

Grundlage – gilt für alle Apps:

| Datei | Zeilen | Was |
|---|---|---|
| `grundlage.js` | 248 | `$`, `$$`, `uid`, `clamp`, `esc`, `pl`; Ruhe über der Tastatur (`felderBeobachten`, `.zeile` statt `<input>`); `toast()`; sichtbarer Bereich (`--vvh`, `--tabh`) |
| `datenmodell.js` | 215 | `leereDb`, `normalisiere`, `DB`, Zugriffe und Statistik der leseliste |
| `speicher.js` | 309 | `IDB`, `macheSpeicher(cfg)`, `Store` |
| `einrichtung.js` | 287 | `setupZeigen`, `huelleEinstellungenHtml/…Binden`, `splashZeigen`, `APPS`, `appFlaeche` |
| `erscheinung.js` | 115 | `SHELL`, `shellSchreiben`, `themeAnwenden`, Vollbild |
| `rahmen.js` | 234 | `TABS`, `tabbarMalen`, `viewMalen`, Kopfzeile, Einführung, `appStarten` |
| `ebenen.js` | 380 | `layerOeffnen/…Schliessen/alleLayerSchliessen/layerErsetzen`, `verlaufTiefe`, `blatt`, `bestaetigen`, `ziehenZumSchliessen`, `ebeneZiehen`, `vorhang…`, `heimZiehen`, `globalKnoepfe…` |
| `start.js` | 11 | `boot()` |

Die vier Apps:

| Datei | Zeilen | Was |
|---|---|---|
| `kalender.js` | 892 | `KDB`, `KStore`, `kalenderOeffnen` → `kViewMalen`; Tage rechnen, Heute, Monatsblatt (`kMonatZiehen`), To-Do, Mehr |
| `fastreader.js` | 979 | `FDB`, `FStore`, `fastreaderOeffnen`; Text aufbereiten (`frZerlegen`), Bibliothek, Hereinholen (`frDocx`, `frPdf`, `frUrl`), Lesen (`frTakt`, `frBahnZiehen`), Bilanz |
| `gsund.js` | 820 | `GDB`, `GStore`, `gsundOeffnen`; Countdown, Guzi-Karte (`gGuziMalen`, `gKarteZiehen`), Vergangene; Puzzle und Bald sind leer |

leseliste – der Rest, nach Aufgaben getrennt:

| Datei | Zeilen | Was |
|---|---|---|
| `plan.js` | 627 | Listen, Blöcke, Bücher: anlegen, ordnen, verschieben |
| `buch.js` | 676 | Buchansicht (Beschreibung, Themen, Arten), Seite „Lesen“, Notizen |
| `diagramme.js` | 1214 | Übersicht, Graphen, Autorennetz, Zeitstrahl |
| `stoebern.js` | 903 | Prompt für eine Sammlung und die App in der App (`ziehenBinden`) |
| `sitzungen.js` | 308 | Stoppuhr, laufende und vergangene Sitzungen |
| `mehr.js` | 263 | Speicherort, Arten, Sicherung |
| `themenfelder.js` | 257 | Themenfelder über alle Bücher, Suche über alles |
| `prompts.js` | 235 | KI-Prompts zum Erstellen und Bewerten |
| `einkauf.js` | 187 | Was fehlt und was als Nächstes drankommt |
| `bilder.js` | 133 | aufnehmen, wählen, verkleinern |
| `laden.js` | 111 | ganze Liste ersetzen oder ergänzen |

---

## Wo suche ich was?

| Frage | Wo |
|---|---|
| Wo wird gespeichert? | `js/speicher.js`, Schlüssel `daten-*` / `meta-*` |
| Warum springt die Tastatur auf? | `js/ebenen.js`, `blatt(` – Fokus nur bei `{ fokus: true }` |
| Wie kommt eine App in die Fussleiste? | `TABS` in `js/rahmen.js`, `KTABS`/`FTABS`/`GTABS` in der jeweiligen App |
| Wo hängt ein Wisch? | `window.__zieht` – wer ihn setzt, hat den Zug |
| Warum sieht ein Knopf überall gleich aus? | `globalKnoepfeHtml`, `saveChipMalen` |
| Warum verschwindet die Seite beim Zurück? | `verlaufTiefe()` in `js/ebenen.js` – weiter zurück als bis zur App darf niemand |
| Neue App anlegen? | `APPS` und `appFlaeche` in `js/einrichtung.js`, ein `macheSpeicher`, ein Rumpf in `rumpf.html`, eine neue Datei unter `js/` und ein Eintrag in `build.js` |

## Stand

Vier Apps laufen: leseliste, kalender, fastreader, g'sund. Offen ist einzig der
Reiter **Puzzle** in g'sund – dort steht ein Platzhalter, die Anweisungen dazu
folgen noch. Ebenso der dritte Reiter **Bald**.

## Zahlen zum Prüfen statt Bilder

`node pruefen/rundgang.js` geht durch alle vier Apps und meldet OK/FEHL
(`--schnell` ohne den Klick-Teil, `--leer` mit leerer Datenbasis).
Für einzelne Messungen: `getBoundingClientRect()` für Masse,
`getComputedStyle()` für Farben und `transform`, `DOMMatrixReadOnly` für
Winkel. Eigene Skripte kommen in das Scratchpad-Verzeichnis der Sitzung.
