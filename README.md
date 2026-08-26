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

*Mehr → Daten aus Datei laden → `leseplan-katalog.json` wählen.* Drei Modi, alle
gleichen über leseliste-Name → Blockname → Buchtitel ab:

- **Ersetzen** – der bisherige Stand wird verworfen. Für den ersten Start und zum
  Zurückspielen einer Sicherung.
- **Ergänzen** – nur Fehlendes kommt dazu, Vorhandenes bleibt unangetastet.
- **Abgleichen** – wie Ergänzen, aber vorhandene Bücher übernehmen zusätzlich die
  Katalogangaben: Titel, Autoren samt Biographien und Einflüssen, Jahr, Seitenzahl,
  Ausgabe, Beschreibung, Kurzfassung, Schwierigkeit. **Dein Fortschritt bleibt:**
  Status, Lese-Sitzungen, Notizen, Fotos, Preis, Besitz und Einkaufsliste werden
  nicht angefasst. So kommen Korrekturen an, ohne dass du etwas verlierst.

## Aufbau

- **Liste** – Blöcke und Bücher, anlegen, ändern, verschieben, löschen. Der Kreis
  links schaltet den Status weiter: offen → lese ich → gelesen.
- **Buch** – sechs Seiten, zwischen denen gewischt wird:
  1. *Beschreibung* mit Erscheinungsjahr, Seitenzahl, Preis, Besitz, Schwierigkeit,
     dazu Stoppuhr und Zugang zu den Sitzungen
  2. *Autor* – bei mehreren Autoren jeder einzeln, mit Lebensdaten, Biographie,
     Einflüssen und den weiteren Werken desselben Autors
  3. *Themenfelder* – Notizen nach Thema gruppiert, ein Tipp führt zu den Notizen
  4. *Arten* – dieselben Notizen nach Zitat, Gedanke, Frage, Widerspruch …
  5. *Alle Notizen* – ungruppiert, nach Seitenzahl gereiht
  6. *Galerie* – alle Fotos des Buches; von der Großansicht geht es zur Notiz
- **Notizen** – Seite, Themenfeld, Art, Text und beliebig viele Fotos. Die Seite ist
  ein Textfeld, `35-36` ist also erlaubt; gereiht wird nach der ersten Zahl. Fotos
  über die Kamera in der Seite (fällt auf die Kamera-App zurück, wo die Umgebung
  das verbietet) oder aus der Galerie; sie werden auf 1600 px Kantenlänge
  verkleinert, rund 300 KB je Bild.
- **Übersicht** – vier Rubriken: *Zahlen* (Kennzahlen und Graphen, jeder als Tabelle
  aufklappbar), *Zusammenfassungen* (je Block jedes Buch zum Auf- und Zuklappen),
  *Autoren* und *Tage* (Tagesziel, Seiten pro Tag, Protokoll jedes Lesetags).
- **Autoren** – nach Blöcken geordnet wie die Zusammenfassungen, jeder Eintrag zum
  Aufklappen; ein Wisch zeigt die Kurzinfo. Jeder Autor führt, von wem er beeinflusst
  wurde; wer auf wen wirkt, leitet die App daraus ab und verlinkt es. Zwei Ansichten
  dazu: **Vernetzung** (alle Einflusslinien, nach Geburtsjahr gereiht, ein Tipp
  zeigt nur die eines Autors; wer ohne Linie zu den anderen dasteht, wird eigens
  aufgeführt, samt Einfluss in reinem Text) und **Zeitstrahl** (Lebenszeit als Balken, jedes Buch
  als Punkt im Jahr seiner Erstveröffentlichung). Die Skala des Zeitstrahls wird aus
  den Daten gebaut: belegte Zeitspannen bekommen Platz, leere Jahrhunderte werden
  schraffiert zusammengezogen – so steht Platon auf derselben Achse wie Piketty.
- **Notizen** – buchübergreifend, umschaltbar zwischen Themenfeldern, Arten, allen
  Notizen und der Galerie aller Fotos.
- **Suche** – über Titel, Autoren, Beschreibungen, Notizen und Themen.

## Mit KI

Unter *Mehr → Mit KI* stehen zwei Prompt-Generatoren. Beide erzeugen einen Text zum
Kopieren, der in Claude eingefügt wird; die Antwort ist reines JSON im Ergänzen-Format
– als Datei sichern und unter *Daten aus Datei laden → Ergänzen* einspielen.

- **Leseliste erstellen lassen** – Forschungsfrage, These oder Thema eintragen,
  gewünschte Buchzahl und Name der neuen leseliste dazu; die Antwort liefert eine
  vollständige neue leseliste in Blöcken.
- **Aktuelle Liste bewerten lassen** – schickt die aktuelle leseliste (Blöcke, Titel,
  Autoren, Jahr, Kurzfassung) mit; die Antwort benennt Lücken und schlägt zusätzliche,
  real existierende Bücher vor, einsortiert in bestehende oder neue Blöcke.

## Lesen und Einkaufen

Über der Tableiste sitzt eine Leiste für die laufende Sitzung: Läuft eine, zeigt sie
Buch und Uhr; läuft keine, startet sie das aktuelle Buch. Gibt es kein oder mehr als
ein angefangenes Buch, wird gewählt. Starten geht auch im Buch und über langes Drücken
auf eine Zeile der Liste – dort finden sich außerdem *nach oben* und *nach unten*.

Wischen führt durch die App: nach links zur nächsten Ansicht, nach rechts zurück
beziehungsweise aus einer geöffneten Ansicht heraus. Blätter von unten lassen sich
nach unten wegschieben. Langes Drücken auf einen **Block** verschiebt ihn nach oben
oder unten.

Nach dem Start einer Lese-Sitzung fragt die App, ob und wie lange ein **Timer**
laufen soll. Der Wecker meldet sich mit Ton und Vibration, solange die Seite geöffnet
ist; bei gesperrtem Bildschirm friert das System die Seite ein – dafür braucht es den
Timer der Uhr-App. Die Rückfrage lässt sich unter *Mehr* abschalten.

Ein **Tagesziel** in Seiten wird bei der Einführung abgefragt, steht danach in der
Kopfzeile und füllt sich aus den Lese-Sitzungen; die Rubrik *Tage* führt Protokoll.

Jedes Buch trägt eine **Schwierigkeit** von 1 bis 5, im Katalog vorgeschlagen und
überall als Punktreihe sichtbar.

Beim ersten Start führt eine kurze **Einführung** durch Speichern, Tagesziel,
leseliste, Block und Buch. Sie ist unter *Mehr* jederzeit wieder aufrufbar.

Ein Wisch nach links auf einer Buchzeile zeigt die **Kurzfassung**: das Buch in
höchstens 15 Wörtern, änderbar unter *Bearbeiten*.

Jedes Buch hat einen **Besitz**-Zustand: fehlt, bestellt, habe ich, Bibliothek. Was
fehlt, sammelt die **Einkaufsliste** unter *Mehr* – angetippt wandert ein Buch nach
*Als Nächstes*. Die Liste rechnet die eingetragenen Preise zusammen und lässt sich als
Textdatei speichern oder in die Zwischenablage kopieren. Der Filter *Fehlt mir* in der
Listenansicht zeigt dasselbe im Zusammenhang des Plans.

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
