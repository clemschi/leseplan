# Karte der Quelle

Die Quelle liegt in Bausteinen unter `src/`. `node build.js` setzt sie in dieser
Reihenfolge zu `mylife.html` zusammen – die Reihenfolge steht in `build.js`.
Daneben fallen `mylife.webmanifest`, `index.html` (Weiche) und `mylife.zip`
(dieselbe Seite als Anhang, für den Download aufs Handy) ab.

**Zuerst hier nachsehen, welcher Baustein gemeint ist, dann nur den öffnen.**
Eine ganze App sind 800–1200 Zeilen statt 10.500. Die Zeilenzahlen sind
Anhaltspunkte, keine Zusicherung – sie wandern mit jeder Änderung.

---

## Stil (`src/stil/`, wird zu einem `<style>`)

| Datei | Zeilen | Was |
|---|---|---|
| `basis.css` | 582 | Farbtokens hell/dunkel, Akzente (`DREI`), Kopfzeile, Tableiste, Bausteine (`.list-card`, `.rowline`, `.chip`, `.field`, `.grid2`), Plan, Overlay/Sheets, Pager, Bilder, Diagramme, Einrichtung |
| `kalender.css` | 135 | alles mit `k`-Präfix |
| `fastreader.css` | 91 | `.frbuehne`, `.frwort`, `.frpult`, `.frbahn` |
| `gsund.css` | 99 | `.gbuehne`, `.gkarte`, `.gseite`, `.g-uhr`, `.gb-griff` |
| `minimal.css` | 55 | `.mizahl`, `.mikauf`, `.miding`, `.mimonat` – die beiden Zahlen und die Listen |
| `cash.css` | 64 | `.cazahl`, `.cabahn` (der Zeitstrahl mit Kurve, Marke, Griff), `.casumme`, `.capunkt` |
| `puzzle.css` | 85 | `.pztisch` (rechnet in Zellen: `--zb`/`--zh`), `.pzbrett`, `.pzloch`, `.pzliegt`, `.pzlose` |
| `stoebern.css` | 141 | `.sto…` – der Kartenstapel |

## Markup

| Datei | Zeilen | Was |
|---|---|---|
| `kopf.html` | 7 | Titel, Zeichen (inline), Schriften |
| `rumpf.html` | 155 | `#setup` und die sechs Rümpfe `#app`, `#kal`, `#fr`, `#gs`, `#mi`, `#ca`, dazu `#layers` |

## Skript (`src/js/`, wird zu einem `<script>`)

Grundlage – gilt für alle Apps:

| Datei | Zeilen | Was |
|---|---|---|
| `grundlage.js` | 291 | `$`, `$$`, `uid`, `clamp`, `esc`, `pl`; Ruhe über der Tastatur (`felderBeobachten`, `.zeile` statt `<input>`); `toast()`; `jsonLesen`/`jsonFehlerText` (JSON auch aus ```-Zäunen und mit Text drumherum); sichtbarer Bereich (`--vvh`, `--tabh`) |
| `datenmodell.js` | 215 | `leereDb`, `normalisiere`, `DB`, Zugriffe und Statistik der leseliste |
| `speicher.js` | 526 | `IDB`, `macheSpeicher(cfg)`, `Store` |
| `einrichtung.js` | 312 | `setupZeigen`, `huelleEinstellungenHtml/…Binden`, `splashZeigen`, `APPS`, `appFlaeche` |
| `erscheinung.js` | 126 | `SHELL`, `shellSchreiben`, `themeAnwenden`, Vollbild |
| `rahmen.js` | 234 | `TABS`, `tabbarMalen`, `viewMalen`, Kopfzeile, Einführung, `appStarten` |
| `ebenen.js` | 385 | `layerOeffnen/…Schliessen/alleLayerSchliessen/layerErsetzen`, `verlaufTiefe`, `blatt`, `bestaetigen`, `ziehenZumSchliessen`, `ebeneZiehen`, `vorhang…`, `heimZiehen`, `globalKnoepfe…` |
| `start.js` | 23 | Manifest anmelden, wenn die Seite unter einer Adresse liegt; `boot()` |

Die sechs Apps:

| Datei | Zeilen | Was |
|---|---|---|
| `kalender.js` | 1211 | `KDB`, `KStore`, `kalenderOeffnen` → `kViewMalen`; Termine von–bis über Tag und Uhrzeit (`kSpanne`, `kTagImTermin`, `kZeitspanne`, `kTerminDauer`; alte `dauer` wird beim Laden übersetzt), Tage rechnen, Heute als flache Reihe (`kHeuteListe`, Gruppe je Zeile, lang drücken zum Ordnen, `KDB.reihen`), Routine-Tätigkeiten (`kRoutineAm`, `kRoutineBearbeiten`), geplante Dauer, Monatsblatt (`kMonatZiehen`), To-Do, Mehr |
| `fastreader.js` | 950 | `FDB`, `FStore`, `fastreaderOeffnen`; Text aufbereiten (`frZerlegen`), Bibliothek, Hereinholen (`frDocx`, `frPdf`, `frUrl`), Lesen (`frTakt`, `frBahnZiehen`), Bilanz |
| `gsund.js` | 952 | `GDB`, `GStore`, `gsundOeffnen`; Countdown, Guzi-Karte (`gGuziMalen`, `gKarteZiehen`), Notizen auf der Rückseite mit Datum (`GARTEN`, `GTREFFER`, `gNotizenHtml`, `gRueckMigrieren`), getrennte Masken (`gVorderseiteBearbeiten` / `gRueckseiteBearbeiten`), Vergangene; „Bald“ ist noch leer |
| `minimal.js` | 584 | `MDB`, `MStore`, `minimalOeffnen`; Stand (die zwei Zahlen), Dinge (Liste, anlegen, abgeben), Verlauf (Monate und Ereignisse), Mehr |
| `cash.js` | 692 | `CDB`, `CStore`, `cashOeffnen`; in Cent rechnen (`cGeld`, `cCent`), Termine einer Routine (`caTermine`), Fortschreiben (`caBis`, `caStandAm`), Stand mit Zeitstrahl (`caStandMalen` malt das Feste, `caZielMalen` den Zeiger, `caBahnBinden` zieht ihn), Routinen, Posten, Mehr |
| `puzzle.js` | 607 | Das Bilderpuzzle im Reiter Puzzle: `pzKante`/`pzUmriss` (die Form der Teile), `pzVorratBauen` (jedes Teil einmal als Bild), `pzTeilung`, `pzLage` (wo ein loses Teil liegt), `pzSchiebenBinden` (Ziehen am Zeiger, Einrasten), `gPuzzleMalen` |

leseliste – der Rest, nach Aufgaben getrennt:

| Datei | Zeilen | Was |
|---|---|---|
| `plan.js` | 627 | Listen, Blöcke, Bücher: anlegen, ordnen, verschieben |
| `buch.js` | 676 | Buchansicht (Beschreibung, Themen, Arten), Seite „Lesen“, Notizen |
| `diagramme.js` | 1233 | Übersicht, Graphen (`balken` kann Stapel: gelesen / lese ich / offen), Autorennetz, Zeitstrahl |
| `stoebern.js` | 987 | Prompt für eine Sammlung und die App in der App (`ziehenBinden`); `wiederherstellen` entscheidet, wo ein Durchgang wieder einsteigt – durchgestöbert heisst „laden“ |
| `sitzungen.js` | 308 | Stoppuhr, laufende und vergangene Sitzungen |
| `mehr.js` | 239 | Speicherort, Arten, Sicherung |
| `themenfelder.js` | 257 | Themenfelder über alle Bücher, Suche über alles |
| `prompts.js` | 510 | KI-Prompts: Erstellen, Bewerten, über die ISBN holen (`isbnPruefen` mit Prüfziffer, `kiIsbnOeffnen`) und Vorrat aus Webseiten (`webAdressen`, `stoebernWebOeffnen` – mit Entdoppeln und Sperrliste) |
| `einkauf.js` | 187 | Was fehlt und was als Nächstes drankommt |
| `bilder.js` | 133 | aufnehmen, wählen, verkleinern |
| `laden.js` | 111 | ganze Liste ersetzen oder ergänzen |

---

## Wo suche ich was?

| Frage | Wo |
|---|---|
| Wo wird gespeichert? | `js/speicher.js`, Schlüssel `daten-*` / `meta-*` |
| Warum springt die Tastatur auf? | `js/ebenen.js`, `blatt(` – Fokus nur bei `{ fokus: true }` |
| Wie kommt eine App in die Fussleiste? | `TABS` in `js/rahmen.js`, `KTABS`/`FTABS`/`GTABS`/`MTABS`/`CTABS` in der jeweiligen App |
| Wo hängt ein Wisch? | `window.__zieht` – wer ihn setzt, hat den Zug |
| Was steht beim Wisch nach Hause dahinter? | `grundBauen` in `js/ebenen.js` – die Namen kommen aus `APPS`, nie von Hand |
| Lang drücken und schieben? | `ziehenZumSortieren` in `js/plan.js` – Griff, Auswahl, `fertig(reihe)` |
| Wisch geht heim statt zu wirken? | die Tabu-Liste in `heimZiehen` (`js/ebenen.js`) – Flächen, die quer selbst etwas tun, stehen dort |
| Warum sieht ein Knopf überall gleich aus? | `globalKnoepfeHtml`, `saveChipMalen` |
| Datei lässt sich nicht laden? | `jsonLesen` in `js/grundlage.js` – jedes Dateifeld geht darüber, nie über `JSON.parse` direkt |
| Warum verschwindet die Seite beim Zurück? | `verlaufTiefe()` in `js/ebenen.js` – weiter zurück als bis zur App darf niemand |
| Neue App anlegen? | `APPS` und `appFlaeche` in `js/einrichtung.js`, ein `macheSpeicher`, ein Rumpf in `rumpf.html`, eine neue Datei unter `js/` und ein Eintrag in `build.js` |

## Stand

Sechs Apps laufen: **leseliste, kalender, fastreader, g'sund, minimal, cashflow.**
Offen ist einzig der dritte Reiter **Bald** in g'sund – dort steht ein Platzhalter.

Zuletzt gemacht (falls jemand frisch dazukommt):

- **cashflow** als sechste App: Stand mit Zeitstrahl, Routinen, Posten.
- **Kalender**: „Heute fällig" ist eine flache Reihe mit Gruppe und Dauer je Zeile,
  lang drücken ordnet den Tag (`KDB.reihen`); Routine-Tätigkeiten am Wochentag
  („Mo–Fr lesen, 45 min"); geplante Dauer je Tätigkeit.
- **g'sund**: Notizen auf der Rückseite – Befürchtung/Kritik und davon getrennt
  eingetroffen/nicht eingetroffen.
- **leseliste**: zwei neue KI-Prompts – Werke über die **ISBN** (mit Prüfziffer) und
  ein Vorrat **aus Webseiten** (Bestenlisten, entdoppelt).
- **Dateien laden**: alles geht über `jsonLesen` – auch JSON aus ```-Zäunen.
- **Unter einer Adresse**: `index.html` als Weiche, Manifest wird bei http(s)
  angemeldet. GitHub Pages ist **noch nicht eingeschaltet** (Settings → Pages →
  Branch `claude/book-tracking-features-eh17ao`, Ordner `/`); danach läuft die App
  unter `clemschi.github.io/leseplan/` und muss nie mehr heruntergeladen werden.
- `node build.js` legt neben `mylife.html` auch `mylife.webmanifest`, `index.html`
  und `mylife.zip` an – die ZIP, weil GitHub eine `.html` als `text/plain` ohne
  `content-disposition` ausliefert und der Browser sie dann anzeigt statt sichert.

## Zahlen zum Prüfen statt Bilder

Zwei Werkzeuge, beide melden `OK`/`FEHL` und enden mit einem Zählstand:

| Befehl | Was | Dauer |
|---|---|---|
| `node pruefen/rundgang.js` | alle sechs Apps, jeder Reiter, ~700 Bedienelemente, Verlaufs-Disziplin | ~5 min |
| `node pruefen/rundgang.js --schnell` | dasselbe ohne den Klick-Teil | <1 min |
| `node pruefen/rundgang.js --leer` | mit leerer Datenbasis | ~4 min |
| `node pruefen/proben.js` | die zwölf Einzelproben unter `pruefen/proben/` | ~5 min |
| `node pruefen/proben.js stoebern` | nur die Proben, deren Name das enthält | |

Die Proben halten fest, was einmal kaputt war: `cashflow`, `cashflow-finger`,
`isbn`, `bestenlisten`, `dateien` (JSON aus Zäunen), `stoebern-wieder`,
`stoebern-sackgasse`, `kalender-gsund`, `adresse` (Seite unter einer Adresse),
`uebersicht-lesend`, `termin-spanne`, `gsund-notizen`.
Die Saat für beides steht in `pruefen/saat.js` – **neue Felder in einer Datenbasis
gehören dort dazu.**

Für einzelne Messungen: `getBoundingClientRect()` für Masse, `getComputedStyle()`
für Farben und `transform`, `DOMMatrixReadOnly` für Winkel. Eigene Skripte kommen
in das Scratchpad-Verzeichnis der Sitzung – **was bleiben soll, gehört nach
`pruefen/proben/`.**

Playwright liegt unter `/opt/pw-browsers/chromium`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`,
`require('/opt/node22/lib/node_modules/playwright')`). Gesten nur mit
`hasTouch: true` und `Input.dispatchTouchEvent` über eine CDP-Sitzung.
