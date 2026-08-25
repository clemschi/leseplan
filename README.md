# leseliste

Eine Lese-App für einen mehrjährigen Leseplan: Blöcke, Bücher, Notizen mit Fotos,
Lese-Sitzungen mit Stoppuhr und eine Auswertung mit Graphen.

**Die HTML-Datei enthält keine Inhalte.** Sämtliche Daten liegen im Speicherort,
den du beim ersten Start festlegst. Der mitgelieferte Leseplan steckt in einer
separaten Datei und wird bewusst geladen.

## Dateien

| Datei | Wofür |
|---|---|
| `leseplan.html` | Die App. Quelle der Wahrheit, ohne Dokumentrahmen – so wird sie als Artifact veröffentlicht. |
| `leseliste.html` | Daraus erzeugt: eigenständige Seite zum lokalen Öffnen. **Nicht von Hand bearbeiten.** |
| `build.js` | Erzeugt `leseliste.html` aus `leseplan.html`: `node build.js` |
| `leseplan-katalog.json` | Die leseliste „Lesestart": 14 Blöcke, 66 Bücher mit Seitenzahl, Erscheinungsjahr, Autor-Lebensdaten und Beschreibung. |

## Ebenen

`leseliste → Block → Buch → Notiz`. Es kann mehrere leselisten nebeneinander geben;
umgeschaltet wird über die Leiste ganz oben in der Planansicht oder unter *Mehr →
leselisten*. Beim Start öffnet sich immer die zuletzt benutzte.

## Speicherort

Beim ersten Start stehen zwei Wege zur Wahl:

**Datei auf diesem Gerät** – du wählst einmal eine `leseplan.json`, danach schreibt
die App still in genau diese Datei, im eingestellten Takt und ohne Rückfrage.
Setzt die File System Access API voraus: Chrome und Edge auf dem Rechner. Auf
iPhone und iPad gibt es das nicht, und in einer eingebetteten Ansicht verbieten
Browser den Dateidialog – dann bietet die App automatisch den zweiten Weg an.

**Arbeitskopie auf diesem Gerät** – IndexedDB im Browser. Viel Platz für Fotos,
speichert ebenso automatisch und ohne Dialog. Aber: Sie hängt an diesem Browser
auf diesem Gerät und verschwindet, wenn du die Website-Daten löschst. Deshalb
regelmäßig über **Jetzt sichern** eine Datei ziehen.

Gesichert wird im eingestellten Takt (Grundeinstellung 60 Sekunden, unter *Mehr*
änderbar), zusätzlich vier Sekunden nach der letzten Eingabe und beim Verlassen
der Seite. Der Punkt oben rechts zeigt den Stand: grün gesichert, gelb offene
Änderungen.

## Den Leseplan laden

*Mehr → Daten aus Datei laden → `leseplan-katalog.json` wählen.* Zwei Modi:
**Ersetzen** wirft den bisherigen Stand weg, **Ergänzen** fügt nur hinzu, was noch
fehlt (Abgleich über Blockname und Buchtitel). Derselbe Weg dient dazu, später
eine komplett andere Liste zu laden oder eine Sicherung zurückzuspielen.

## Aufbau

- **Plan** – Blöcke und Bücher, anlegen, ändern, verschieben, löschen. Der Kreis
  links schaltet den Status weiter: offen → lese ich → gelesen.
- **Buch** – sechs Seiten, zwischen denen gewischt wird:
  1. *Beschreibung* mit Erscheinungsjahr, Seitenzahl, Preis, Autor-Lebensdaten
  2. *Themenfelder* – Notizen nach Thema gruppiert, ein Tipp führt zu den Notizen
  3. *Arten* – dieselben Notizen nach Zitat, Gedanke, Frage, Widerspruch …
  4. *Alle Notizen* – ungruppiert, nach Seitenzahl gereiht
  5. *Galerie* – alle Fotos des Buches; von der Großansicht geht es zur Notiz
  6. *Lesen* – Stoppuhr und alle Sitzungen, jede einzeln korrigierbar
- **Notizen** – Seite, Themenfeld, Art, Text und beliebig viele Fotos. Die Seite ist
  ein Textfeld, `35-36` ist also erlaubt; gereiht wird nach der ersten Zahl. Fotos
  über die Kamera in der Seite (fällt auf die Kamera-App zurück, wo die Umgebung
  das verbietet) oder aus der Galerie; sie werden auf 1600 px Kantenlänge
  verkleinert, rund 300 KB je Bild.
- **Übersicht** – Kennzahlen und Graphen: Seiten pro Monat, gelesene Bücher
  kumuliert, Blöcke nach Seitenumfang, Kosten je Block, Lesetempo je Buch,
  Notizen nach Art und Themenfeld. Jeder Graph lässt sich als Tabelle aufklappen.
- **Themen** – alle Notizen zu einem Themenfeld über alle Bücher hinweg.
- **Suche** – über Titel, Autoren, Beschreibungen, Notizen und Themen.

Dunkel (reines Schwarz) ist die Grundeinstellung, umschaltbar über das Symbol in der
Kopfzeile. Die Akzentfarbe lässt sich unter *Mehr → Darstellung* aus neun Farben
wählen. Vollbild startet von selbst bei der ersten Berührung, wo der Browser es
zulässt (abschaltbar); am iPhone liefert „Zum Home-Bildschirm hinzufügen" dasselbe.

Ein `preis` steht im Katalog nicht: Buchhandels-Seiten sind aus der Umgebung, in der
dieser Katalog entstanden ist, nicht erreichbar. Das Feld ist im Buch vorhanden und
wartet auf deine Eingabe.

## Zu den Daten im Katalog

Seitenzahlen beziehen sich auf gängige deutsche Ausgaben; die Ausgabe steht beim
Buch dabei. Wo die Recherche keinen eindeutigen Wert ergab, steht die Zahl mit
einer Tilde (`~245`) – das ist eine Schätzung, die auf Korrektur wartet. `jahr`
ist immer das Jahr der Erstveröffentlichung im Original, nicht das der deutschen
Übersetzung. Antike Jahreszahlen stehen negativ in der Datei und werden als
„375 v. Chr." angezeigt.

## Entwicklung

```bash
node build.js     # leseliste.html neu erzeugen
```

Änderungen immer in `leseplan.html` machen, nie in `leseliste.html`.
