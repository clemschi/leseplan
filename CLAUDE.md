# Arbeitsregeln für diese Datei

**Vor dem ersten Suchen in `mylife.src.html`: `KARTE.md` lesen.** Dort steht,
welcher Abschnitt wo liegt und wie er heisst – das erspart das Durchsuchen von
10.000 Zeilen.

## Aufbau
- Quelle ist immer `mylife.src.html`. `node build.js` schreibt daraus `mylife.html`
  (eine Datei, alles darin). `mylife.html` niemals von Hand bearbeiten.
- Kommentare und Oberfläche auf Deutsch, im Ton des übrigen Codes.

## Antworten
- **Stichpunkte, kein Fließtext.** Was getan wurde, als kurze Liste: Sache,
  Befund, Ergebnis. Keine ausformulierten Absätze, keine Einleitung, kein
  Nachwort.
- Zahlen und Messwerte gehören dazu, aber knapp – „0,0 px Abweichung“ statt
  eines Satzes darüber.
- Ausführlich nur, wenn ausdrücklich nach einer Erklärung gefragt wird.

## Übergabe
- **In der Regel reicht die neue `mylife.html` als ganze Antwort.** Stichpunkte
  nur, wenn etwas wirklich Wichtiges dazugehört – ein Befund, eine Grenze, eine
  Entscheidung, die der Nutzer kennen muss.
- **Am Ende jeder Aufgabe, die an der App etwas ändert: `node build.js` laufen
  lassen und `mylife.html` mitgeben.** Nicht auf Nachfrage warten, nicht nur
  darauf verweisen – die Datei gehört zur Antwort. Hat sich an der App nichts
  geändert (nur Notizen, nur Dokumentation), einen Satz dazu sagen statt
  dieselbe Datei ein zweites Mal zu schicken.

## Mehrere Apps in einer Datei
- `mylife.html` ist die Hülle. Der Startbildschirm (`splashZeigen`, Register
  `APPS`) ist ihr Homescreen; jede App wird erst beim Antippen geweckt.
- **Jede App führt ihre eigene Datenbasis.** Eine Ausfertigung von
  `macheSpeicher(...)` je App, eigener IDB-Schlüssel, eigene JSON-Datei
  (`leseplan.json`, `kalender.json`, `fastreader.json`, `gsund.json`). Nie Daten zweier Apps in eine Datei
  mischen. Die App ohne gewählten Speicherort fragt beim ersten Öffnen danach.
- Was allen gemeinsam ist – Hell/Dunkel, Akzent, Vollbild – liegt in `SHELL`
  und wird über `shellSchreiben()` gesichert, nicht in den Daten einer App.
  Angezeigt wird es **überall aus demselben Baustein**:
  `huelleEinstellungenHtml()` + `huelleEinstellungenBinden(wurzel, neuMalen)`
  im „Mehr“ jeder App. Nie eine dieser Einstellungen einzeln nachbauen.
- `aktiverSpeicher` zeigt auf den Speicher der offenen App; der Chip in der
  Kopfzeile liest ihn.
- Neue App: Eintrag in `APPS`, eigener `macheSpeicher`, eigener Rumpf im
  Markup mit Klasse `appflaeche`, eigene Fussleiste; geöffnet wird über
  `appFlaeche('<id>')`. Design und Bausteine kommen aus dem Bestand
  (`.list-card`, `.rowline`, `.chip`, `.section-head`, `blatt`, `toast`).

## Wischen – so und nicht anders
Der Kartenstapel beim Stöbern (`ziehenBinden` in `stoebernOeffnen`) ist die
Richtschnur für jede Geste in dieser App. Wer eine neue Geste baut, baut sie
danach:

1. **1:1 am Finger.** Was gezogen wird, folgt der Hand ohne Übersetzung und
   ohne Beschleunigung. Kein `dy / weg`-Faktor, keine Prozentsprünge.
2. **Kein Sprung beim Übernehmen.** Erst ab einer klaren Bewegung (10–15 px)
   übernimmt die Geste; der bis dahin gelaufene Weg wird abgezogen, damit
   nichts hüpft.
3. **Kurze Schwelle plus Schwung.** Beim Loslassen entscheidet
   `Weg > max(~80–96 px, Kante * 0,14–0,3)` **oder** eine Geschwindigkeit von
   etwa 0,45 px/ms. Darunter federt es zurück, darüber läuft es durch.
4. **Rückweg mit derselben Mechanik.** Was am Finger aufgeht, geht auch am
   Finger wieder zu (Übersicht: runterziehen zum Öffnen, hochziehen zum
   Schliessen).
5. **Nur ein Zug zur Zeit.** `window.__zieht` wird beim Übernehmen gesetzt und
   erst nach der Ausklang-Animation gelöst; jede andere Geste prüft es vorher.
6. **Übernehmen erst nach Richtungsentscheid**, quer laufende Bewegungen geben
   die Geste ab (`dx > 14 && dx > |dy|` und umgekehrt).

7. **Nie schlagartig schliessen.** Was per Geste weggeht, geht am Finger weg
   und klingt mit derselben Kurve aus (`.26s cubic-bezier(.2,.8,.3,1)`).
   `layerSchliessen()` auf Zuruf aus einem Wisch heraus ist verboten.
8. **Schwellen deckeln.** Eine Schwelle, die an der Höhe einer Fläche hängt,
   bekommt eine Obergrenze (`Math.min(hoehe * 0.16, 160)`) – sonst verlangt ein
   hohes Blatt einen Marathon.
9. **Masse einmal messen**, beim Übernehmen, nicht in jedem `touchmove`.
   `clientWidth` im Zug erzwingt Layout und ruckelt.

Fertige Bausteine, die genau das tun:
- `vorhangSetzen` / `vorhangLoesen` / `vorhangSchwelle` / `vorhangHochBinden` –
  eine Ebene wie ein Tuch auf- und zuziehen (Übersicht aus der Kopfzeile).
  `unschaerfeSetzen(f)` macht dabei den Grund dahinter ansteigend unscharf.
- `ebeneZiehen` – eine Vollbild-Ebene vom **linken Rand** (erste 30 px) nach
  rechts wegziehen. Wird in `layerOeffnen` automatisch gebunden. Nur vom Rand,
  damit Karten, Seiten und Bahnen in der Fläche frei bleiben.
- `ziehenZumSchliessen` – Blatt von unten nach unten wegschieben.
- `heimZiehen` – die App nach rechts schieben, dahinter liegt der
  Startbildschirm.
- `ziehenBinden` im Stöbern – Karten nach links und rechts.
- `kMonatZiehen` – das Monatsblatt von Monat zu Monat.
- `gKarteZiehen` – die Guzi-Karte umdrehen; der linke Rand bleibt frei für `heimZiehen`.
  Schräge Züge drehen um **eine** Achse (`rotate3d`), nie um zwei nacheinander –
  sonst rollt die Fläche und eine Richtung fühlt sich verkehrt an.

## Ebenen
- Eine offene Ebene wird **getauscht, nicht geschlossen und neu geöffnet**:
  `blatt(..., { ersetzen: true })` beziehungsweise `layerErsetzen`. Sonst
  räumt das nachlaufende `popstate` des `history.back()` die eben geöffnete
  Ebene wieder weg – und mehrere solcher Fehlgriffe laufen aus dem Verlauf
  heraus, bis die Seite ganz verschwindet.
- Mehrere Ebenen auf einmal schliesst `alleLayerSchliessen()` (ein einziges
  `history.go(-n)`), niemals `layerSchliessen()` in einer Schleife.

## Speichern
- `aendern()` merkt nur vor (Selbstsicherung nach Sekunden),
  `Store.sichern(true)` schreibt sofort. Beim Verlassen einer Ebene, die einen
  Stand hält (z. B. Stöbern), immer sofort schreiben.
- Es gibt genau **einen** Speicher-Chip (`.savechip`, `saveChipMalen`). Er sitzt
  in der Kopfzeile der App und über `globalKnoepfeHtml(true)` in jeder
  `.ovl-head`. Keine zweite Speicheranzeige, kein eigenes Symbol irgendwo –
  gleiche Logik, gleiches Aussehen, überall.
- Eine Ebene mit eigenem Stand (Stöbern) steigt dort wieder ein, wo gearbeitet
  wurde, nicht dort, wo der Zurück-Pfeil zuletzt stand.

## Eingabefelder
- Kein Feld bekommt von Hand `autocomplete` oder einen Formularrahmen.
  `felderBeobachten()` nimmt sich beim Start jedes Feld vor und jedes neue:
  `autocomplete=off` und ein eigenes `<form class="feldrahmen">` je Feld.
  Der einzelne Rahmen ist der Punkt – Felder ohne Formular fasst Chrome zu
  einem gedachten Adressformular zusammen und blendet darüber seine
  Ausfüllhilfe ein.
- **Rechtschreibprüfung bleibt an.** Kein `spellcheck=false` irgendwo.
- Die Vorschlagsleiste der Tastatur gehört der Tastatur, nicht der Seite.
- **Blätter springen nicht von selbst ins erste Feld.** `blatt()` setzt den
  Fokus nur bei `{ fokus: true }`; sonst fährt bei jedem Blatt die Tastatur hoch.
- Zwei Felder nebeneinander: `.grid2`. `.row2` gibt es nicht.

## Prüfen
Playwright liegt unter `/opt/pw-browsers/chromium`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`,
`require('/opt/node22/lib/node_modules/playwright')`). Gesten lassen sich nur
mit `hasTouch: true` und `Input.dispatchTouchEvent` über eine CDP-Sitzung
prüfen – `page.touchscreen` kann nicht ziehen.

**Keine Screenshots in den Chat.** Ein Bild anzusehen kostet mehr als hundert
Zeilen Code. Geprüft wird mit Zahlen: Höhen, Breiten, Winkel aus
`getBoundingClientRect()` und `getComputedStyle()`, Farben als Wert, Text als
Text. `page.screenshot(...)` darf in einem Testskript stehen und liegen
bleiben – geöffnet wird es nicht. Wo etwas nur nach Augenmass zu klären ist,
lieber fragen als schauen.
