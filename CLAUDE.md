# Arbeitsregeln für diese App

## Aufbau
- Quelle ist immer `leseplan.html`. `node build.js` schreibt daraus `leseliste.html`
  (eine Datei, alles darin). `leseliste.html` niemals von Hand bearbeiten.
- Kommentare und Oberfläche auf Deutsch, im Ton des übrigen Codes.

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
