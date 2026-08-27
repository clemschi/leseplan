# Arbeitsregeln für diese Datei

## Aufbau
- Quelle ist immer `mylife.src.html`. `node build.js` schreibt daraus `mylife.html`
  (eine Datei, alles darin). `mylife.html` niemals von Hand bearbeiten.
- Kommentare und Oberfläche auf Deutsch, im Ton des übrigen Codes.

## Mehrere Apps in einer Datei
- `mylife.html` ist die Hülle. Der Startbildschirm (`splashZeigen`, Register
  `APPS`) ist ihr Homescreen; jede App wird erst beim Antippen geweckt.
- **Jede App führt ihre eigene Datenbasis.** Eine Ausfertigung von
  `macheSpeicher(...)` je App, eigener IDB-Schlüssel, eigene JSON-Datei
  (`leseplan.json`, `kalender.json`). Nie Daten zweier Apps in eine Datei
  mischen. Die App ohne gewählten Speicherort fragt beim ersten Öffnen danach.
- Was allen gemeinsam ist – Hell/Dunkel, Akzent, Vollbild – liegt in `SHELL`
  und wird über `shellSchreiben()` gesichert, nicht in den Daten einer App.
- `aktiverSpeicher` zeigt auf den Speicher der offenen App; der Chip in der
  Kopfzeile liest ihn.
- Neue App: Eintrag in `APPS`, eigener `macheSpeicher`, eigener Rumpf im
  Markup, eigene Fussleiste. Design und Bausteine kommen aus dem Bestand
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

Fertige Bausteine, die genau das tun:
- `vorhangSetzen` / `vorhangLoesen` / `vorhangSchwelle` / `vorhangHochBinden` –
  eine Ebene wie ein Tuch auf- und zuziehen (Übersicht aus der Kopfzeile).
- `heimZiehen` – die App nach rechts schieben, dahinter liegt der
  Startbildschirm.
- `ziehenBinden` im Stöbern – Karten nach links und rechts.

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

## Prüfen
Playwright liegt unter `/opt/pw-browsers/chromium`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`,
`require('/opt/node22/lib/node_modules/playwright')`). Gesten lassen sich nur
mit `hasTouch: true` und `Input.dispatchTouchEvent` über eine CDP-Sitzung
prüfen – `page.touchscreen` kann nicht ziehen.
