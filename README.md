# mylife

Eine einzige HTML-Datei, in der mehrere kleine Apps wohnen. Der Startbildschirm ist ihr
Homescreen: ein paar Namen auf dem Grund, sonst nichts. Ein Tipp öffnet eine App, das ×
in der Kopfzeile führt zurück – ebenso ein Wisch nach rechts, in jeder App. Nur dort, wo
quer schon etwas anderes passiert (die Tage-Bahn im To-Do, das Monatsblatt, die Bahn im
fastreader), bleibt er aussen vor.

**Jede App hat ihre eigene Datenbasis.** Die leseliste führt eine `leseplan.json`, der
Kalender eine `kalender.json`, der fastreader eine `fastreader.json`, g’sund eine
`gsund.json` – getrennte Dateien,
getrennte Speicherorte, getrennte Sicherung. Was allen gemeinsam ist, sind Hell/Dunkel, Akzentfarbe und Vollbild; die
gehören der Hülle und gelten überall.

Gebaut wird mit `node build.js` aus `mylife.src.html`.

## kalender

Vier Reiter in der Fussleiste:

- **Heute** – die Termine des Tages, was heute fällig ist, die laufenden Themen mit
  Fortschritt und ein Ausblick auf die nächsten sieben Tage. Jeder fällige Eintrag lässt
  sich aufklappen: darunter stehen die einzelnen Tätigkeiten, jede für sich abhakbar. Ohne Tagesziel führt jede
  Zeile dorthin, wo etwas einzutragen ist.
- **Kalender** – das Monatsblatt mit Punkten für Termine und einem Ring für Fälliges.
  Ein Tipp auf einen Tag öffnet ihn als Blatt von unten; gewischt wird von Monat zu
  Monat, am Finger, mit derselben Mechanik wie die Karten beim Stöbern. Termine tragen
  Uhrzeit, Dauer, Ort, Notiz, Farbe und wahlweise eine Wiederholung (täglich bis
  jährlich).
- **To-Do** – Aufgaben in drei Ebenen als Flussbild: **Thema** → quer die **Tage** → an
  jedem Tag die einzelnen **Tätigkeiten**. Der Tag ist zugleich die Frist: beim Anlegen
  wählst du das Datum, und was daran hängt, taucht unter *Heute* und im Monatsblatt auf.
  Neue Tage rutschen von selbst an ihren Platz in der Reihe. Abgehakt wird von unten nach
  oben: sind alle Tätigkeiten erledigt, gilt der Tag als erledigt, sind alle Tage
  erledigt, das Thema. **Langes Drücken hebt an** – Themen untereinander, Tage
  nebeneinander, Tätigkeiten innerhalb ihres Tages; das angehobene Thema schrumpft dabei
  auf seine Kopfzeile.
- **Mehr** – Speicherort, Sichern, Laden, Zurücksetzen. Darunter, wie in jeder App,
  derselbe Block **Darstellung**: Hell/Dunkel, Akzentfarbe, Vollbild und der Weg zur
  Startseite. Diese Einstellungen gehören der Hülle und gelten überall.

## fastreader

Wort für Wort an einem festen Punkt: das Auge bleibt stehen, der Text läuft. Vier Reiter:

- **Bibliothek** – Texte hereinholen und wiederfinden. Datei (TXT, MD, DOCX, PDF),
  Einfügen aus der Zwischenablage oder eine Adresse. DOCX packt die App selbst aus, PDF
  holt sich dafür einmalig eine fremde Bibliothek – ohne Verbindung geht nur Einfügen.
  Zeilenumbrüche aus Dateien werden als Layout behandelt: getrennte Wörter wachsen wieder
  zusammen, Kopf- und Fusszeilen fliegen raus.
- **Lesen** – ein Wort zwischen zwei Strichen, mittig, in immer derselben Größe. Der
  Buchstabe am Blickpunkt ist rot, und die beiden Markierungen an den Strichen wandern mit
  ihm – er sitzt nicht in der Wortmitte, sondern etwas davor,
  wo das Auge ein Wort tatsächlich erfasst. **Sobald gelesen wird, versinkt alles andere:**
  Kopfzeile, Leisten, Striche und Kontext gehen langsam in den Grund über, bis nur noch das
  Wort samt seinen Strichen dasteht. Es sitzt dabei genau in der Bildmitte – waagerecht
  wie senkrecht, unabhängig von Kopfzeile und Pult. Ein Tipp irgendwohin hält an und holt
  alles zurück. Lange Wörter
  stehen länger, Komma, Punkt und Absatz halten auf, und die ersten fünfundvierzig Wörter
  laufen langsamer an. Antippen startet und hält an, die Bahn darunter folgt dem Finger,
  beim Anhalten erscheint der Satz um das Wort.
- **Bilanz** – gelesene Wörter, Lesezeit, Durchschnittstempo, der Verlauf über die letzten
  Sitzungen und der Stand jedes Textes.
- **Mehr** – Schriftgröße, Aufwärmen, Pausen, Kontext, Speicherort und Sicherung. Die
  Schriftgröße gilt für jedes Wort gleich, einstellbar zwischen 14 und 72 px.

Mit Tastatur: **Leertaste** startet und hält an, **↑ ↓** ändern das Tempo, **← →** springen
zehn Wörter, mit **Umschalt** einen Satz.

## g’sund

Vier Reiter in der Fussleiste:

- **Guzi** – nur die Karte, sonst nichts. Vorne ein frei gewählter Titel in der
  Akzentfarbe, darunter Datum und wahlweise Uhrzeit, dann der Countdown im
  Sekundentakt – in Tagen, sonst als `HH:MM:SS`, nach dem Zeitpunkt mit Vorzeichen
  weiter. Hinten freier Text. **Ein Tipp öffnet die Karte zum Ändern**, gedreht wird
  nur mit dem Finger: quer eine halbe Umdrehung je halber Kartenbreite, dort ist
  Schluss – ein weiter Zug dreht sie nicht über die Rückseite hinaus. Dabei kippt
  sie auch längs mit, bis 26°, so dass ein Zug von rechts oben nach links unten die
  Karte wirklich in der Hand liegen lässt. Gedreht wird um **eine** Achse quer zur
  Zugrichtung, nicht um zwei nacheinander – sonst legt sich eine Rollbewegung
  obendrauf, die nach rechts und nach links gleich herum läuft, und eine der beiden
  Richtungen fühlt sich verkehrt an. Umgeblättert wird höchstens einmal je
  Zug: über die Hälfte gedreht, gut 50 px Fingerweg oder ein Schwung genügen, dann
  liegt die andere Seite oben – nicht mehr und nicht weniger. Ein **schneller Zug nach oben** legt sie zu
  den Vergangenen; sie fliegt weg, vorn bleibt eine leere Karte. Die ersten 30 px am
  linken Rand bleiben dem Zug zur Startseite.
- **Vergangen** – die Kopfzeile ist zugleich der Griff: **herunterziehen** (oder
  antippen) holt die abgelegten Karten hervor, hochziehen schiebt sie wieder weg –
  derselbe Vorhang wie die Übersicht in der leseliste. Von selbst landet man dort nie.
  Jede Karte lässt sich ansehen, zurückholen (liegt vorn schon etwas, wandert das im
  selben Zug nach hinten) oder löschen.
- **Puzzle** – noch leer, die Anweisungen dazu folgen.
- **Bald** – Platz für den dritten Reiter.
- **Mehr** – Speicherort, Sichern, Laden, Karte bearbeiten, Zurücksetzen, dazu derselbe
  Block **Darstellung** wie in jeder App.

## leseliste


| Datei | Wofür |
|---|---|
| `mylife.src.html` | Alle Apps. Quelle der Wahrheit, ohne Dokumentrahmen. |
| `mylife.html` | Daraus erzeugt: eigenständige Seite zum lokalen Öffnen. **Nicht von Hand bearbeiten.** |
| `build.js` | Erzeugt `mylife.html` aus `mylife.src.html`: `node build.js` |
| `leseplan-katalog.json` | Die leseliste „Lesestart": 14 Blöcke, 66 Bücher mit Seitenzahl, Erscheinungsjahr, Autor-Lebensdaten und Beschreibung. |

## Über der Tastatur

Chrome blendet über Eingabefeldern gern seine Ausfüllhilfe ein – Schlüssel, Karte,
Ortsnadel. Sie hängt nicht am einzelnen Feld: Felder ohne Formular fasst Chrome zu
einem gedachten zusammen, und weil in dieser einen Datei alle Apps zugleich im
Dokument stehen, sind das Dutzende auf einmal – genug, damit Chrome darin ein
Adressformular erkennt. `autocomplete="off"` allein hilft dagegen nicht, das
überspringt Chrome bei allem, was es für eine Anschrift hält. Darum bekommt jedes
Feld sein eigenes `<form class="feldrahmen">`: eines mit einem einzigen Feld bleibt
unter der Schwelle, ab der Chrome überhaupt zu raten anfängt. Der Rahmen kommt im
Layout nicht vor (`display:contents`) und lässt sich nicht absenden. Gestempelt wird
das nicht von Hand – `felderBeobachten()` nimmt sich jedes Feld vor, auch jedes, das
später entsteht.

Die **Rechtschreibprüfung bleibt an**. Die Wortvorschläge der Tastatur gehören ihr
selbst und lassen sich nur in ihren eigenen Einstellungen abstellen.

Und: **kein Blatt springt von selbst ins erste Feld.** Sonst führe jedes Öffnen die
Tastatur mit. Wer schreiben will, tippt hinein; nur die Suche fängt den Finger
gleich ab.

## Ebenen

`leseliste → Block → Buch → Notiz`. Es kann mehrere leselisten nebeneinander geben;
umgeschaltet wird über die Leiste ganz oben in der Planansicht oder unter *Mehr →
leselisten*. Beim Start öffnet sich immer die zuletzt benutzte.

## Startseite

Jeder Start beginnt hier: nur der Name der App auf dem Grund, karg wie ein Homescreen,
daneben ein Platzhalter für später. Ein Tipp auf **leseliste** öffnet sie; derselbe Tipp
löst das Vollbild aus, denn ohne Geste des Nutzers lässt kein Browser es zu. Unten sitzen
Hell/Dunkel, Vollbild und *Speicherort und Daten* – dahinter liegen die ausführlichen
Wege: Datei anlegen, Datei öffnen, Daten laden, von KI zusammenstellen, Stöbern.

Zurück führt das **×** in der Kopfzeile oder ein Wisch nach rechts, wenn die Liste offen
ist. **Hell/Dunkel und Vollbild** stehen überall zur Verfügung: jede Ebene und jedes
Blatt trägt das Paar oben rechts.

## Vollbild und der Hinweis von Chrome

Schaltet die Seite ins Vollbild, legt Chrome jedes Mal seinen eigenen Hinweis über
den Schirm („zum Beenden des Vollbildmodus: von oben ziehen …"). Der gehört dem
Browser; keine Seite kann ihn abstellen. Drei Wege daran vorbei:

- **Vollbild beim Start ausschalten** (*Mehr → Darstellung*). Dann kommt der Hinweis
  gar nicht erst – dafür bleiben die Leisten des Browsers stehen.
- **Über eine Adresse öffnen und auf den Startbildschirm legen.** Liegt `mylife.html`
  unter einer http(s)-Adresse, meldet sie dort ihr `mylife.webmanifest` an; Chrome legt
  sie dann als eigene App ab, die ohne Browserleisten startet. Ohne Leisten kein
  Vollbild-Ruf und damit kein Hinweis. Die App merkt das selbst: läuft sie so, bietet
  sie das Vollbild gar nicht mehr an.
- Aus einer Datei heraus (`file://`, `content://`) geht das nicht – dort gibt es keinen
  Ursprung, an dem ein Manifest hängen könnte.

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
- **Übersicht** – nicht in der Tableiste, sondern hinter dem Fortschritt in der
  Kopfzeile: antippen, oder von der Kopfzeile nach unten ziehen. Sie kommt wie ein
  Vorhang herunter: die Kante liegt genau unter der Fingerkuppe, ein kurzer Weg oder
  ein Schwung genügt, sonst zieht sie sich wieder zurück. Wegschieben lässt sie sich
  von unten nach oben – an der Kopfzeile oder am Ende der Liste, damit das Blättern
  darin unangetastet bleibt; die Seite dahinter bleibt dabei stehen. Vier Rubriken: *Zahlen*
  (Kennzahlen und Graphen, jeder als Tabelle aufklappbar), *Zusammenfassungen* (je Block
  jedes Buch zum Auf- und Zuklappen), *Autoren* und *Tage* (Tagesziel, Seiten pro Tag,
  Protokoll jedes Lesetags).
- **Autoren** – nach Blöcken geordnet wie die Zusammenfassungen, jeder Eintrag zum
  Aufklappen; ein Wisch zeigt die Kurzinfo. Jeder Autor führt, von wem er beeinflusst
  wurde; wer auf wen wirkt, leitet die App daraus ab und verlinkt es – in eigener Farbe,
  damit die beiden Richtungen auseinanderzuhalten sind. Trifft beides zu, haben sich
  also zwei aufeinander ausgewirkt, gilt eine dritte Farbe; sie steht in der Legende
  der Vernetzung und im Steckbrief als eigene Zeile *Gegenseitig*. Die drei Farben
  sind zu jedem Akzent so gewählt, dass sie sich unterscheiden – hell wie dunkel.
  Zwei Ansichten
  dazu: **Vernetzung** (alle Einflusslinien, nach Geburtsjahr gereiht, ein Tipp
  zeigt nur die eines Autors; wer ohne Linie zu den anderen dasteht, wird eigens
  aufgeführt, samt Einfluss in reinem Text) und **Zeitstrahl** (Lebenszeit als Balken,
  jedes Buch als Punkt im Jahr seiner Erstveröffentlichung). Die Skala des Zeitstrahls
  wird aus den Daten gebaut: belegte Zeitspannen bekommen Platz, leere Jahrhunderte
  werden schraffiert zusammengezogen – so steht Platon auf derselben Achse wie
  Piketty. Die Jahreszahlen stehen in Zwanzigerschritten und bleiben beim Blättern
  oben stehen; ein Tipp auf einen Namen hebt ihn samt seiner Einflüsse hervor und
  zeigt darunter denselben Steckbrief wie die Vernetzung.
- **Notizen** – buchübergreifend, umschaltbar zwischen Themenfeldern, Arten, allen
  Notizen und der Galerie aller Fotos.
- **Suche** – über Titel, Autoren, Beschreibungen, Notizen und Themen.

## Mit KI

Unter *Mehr → Mit KI* stehen drei Prompt-Generatoren. Alle erzeugen einen Text zum
Kopieren, der in Claude eingefügt wird. Der Prompt verlangt die Antwort als
**herunterladbare `leseliste.json`**, nicht als Nachricht im Chat – die Datei wird
unter *Daten aus Datei laden → Ergänzen* eingespielt.

- **Leseliste erstellen lassen** – Forschungsfrage, These oder Thema eintragen,
  gewünschte Zahl der Werke und Name der neuen leseliste dazu; die Antwort liefert eine
  vollständige neue leseliste in Blöcken. Erreichbar auch beim ersten Start: auf dem
  Startbildschirm, in der Einführung und in der noch leeren Listenansicht.
- **Aktuelle Liste bewerten lassen** – schickt die aktuelle leseliste (Blöcke, Titel,
  Autoren, Jahr, Kurzfassung) mit; die Beurteilung kommt in den Chat, die Vorschläge in
  die Datei, einsortiert in bestehende oder neue Blöcke.

Ein dritter Prompt, **Sammlung zum Stöbern**, liefert keinen fertigen Plan, sondern
einen Vorrat: mehrere Themen hinein, rund hundert Werke heraus, jedes mit seinem Thema.
Diese Datei ist das Futter fürs Stöbern. Die Themen gibst du entweder selbst vor, oder du
wählst **Überrasch mich** und sagst nur, wie viele es sein sollen – dann sucht die KI sie
aus, auf Wunsch in eine grobe Richtung. Der **Anteil Fachartikel** ist in Stufen bis
siebzig Prozent einstellbar, und Artikel lassen sich auf einen **Jahresbereich**
eingrenzen; für Bücher gilt die Schranke nicht.

Alle drei Prompts nehmen auf Wunsch **Fachartikel** mit auf – peer-reviewed und viel
zitiert, wie über Google Scholar auffindbar. Bei Büchern werden deutsche Ausgaben
bevorzugt, einschlägige englische aber ausdrücklich mitgenommen; bei Artikeln zählt
allein die Qualität, nicht die Sprache. Artikel tragen Zeitschrift und Seiten im Feld
*Ausgabe*, die auflösbare DOI-Adresse im Feld **Link**, und landen nicht auf der
Einkaufsliste. Der Link steht beim Buch unter der Ausgabe und ist antippbar; von Hand
lässt er sich unter *Bearbeiten* nachtragen.

## Stöbern

Eine App in der App, erreichbar über *Stöbern* – in der noch leeren Listenansicht, unter
*Mehr → leselisten* und unter *Mehr → Stöbern*. Sie führt in fünf Schritten von einem
Vorrat an Werken zu einer fertigen leseliste:

Die Kopfzeile ist dieselbe wie in jeder anderen Ebene: der Pfeil links führt in einem
Schritt zurück auf die leseliste. Zwischen den fünf Schritten geht es unten im Fuss
zurück, wo auch sonst gearbeitet wird.

1. **Laden** – eine Sammlung als `.json`. Es geht auch eine gewöhnliche leseliste; dann
   werden ihre Blöcke zu Themen.
2. **Themen wählen** – jedes Thema lässt sich aus dem Stapel nehmen. *Durchmischen* sorgt
   dafür, dass die Themen sich abwechseln, statt blockweise zu kommen.
3. **Wischen** – ein Werk je Karte, mit Thema, Autor, Kurzfassung, Beschreibung und
   Schwierigkeit. Nach rechts heißt merken, nach links weg; die Karte folgt dem Finger,
   kippt und stempelt sich. Ein Tipp öffnet den ganzen Text, der Pfeil nimmt die letzte
   Entscheidung zurück. Wer lieber tippt, nimmt die drei Knöpfe darunter.
4. **Sammlung** – das Gemerkte nach Themen geordnet, einzeln wieder verwerfbar.
5. **Blöcke ordnen** – jedes Thema wird als Block vorgeschlagen. Blöcke lassen sich
   umbenennen, verschieben, anlegen und auflösen; einzelne Werke wandern per Knopf in
   einen anderen Block. Was ohne Block bleibt, kommt als Block *Weitere* mit. Ein Name
   für die leseliste, und sie steht.

Es wird nichts in die leseliste geschrieben, bevor du am Ende *leseliste anlegen*
drückst. Der Durchgang selbst wird aber gemerkt: Vorrat, Stelle im Stapel, Gemerktes und
die begonnenen Blöcke. Beim nächsten Öffnen liegt genau die Karte wieder oben, bei der
du aufgehört hast – auch wenn du über *Themen* und *Laden* hinausgegangen bist und auch
nach einem Neustart der App. In der Kopfzeile steht dafür derselbe Speicher-Chip wie in
der Liste: er zeigt *offen*, solange etwas ungeschrieben ist, und *gerade eben*, sobald
es liegt. Nach dem Anlegen bleibt der Vorrat samt Stelle stehen, das Gemerkte ist
verbraucht.

## Lesen und Einkaufen

Über der Tableiste sitzt eine Leiste für die laufende Sitzung: Läuft eine, zeigt sie
Buch und Uhr; läuft keine, startet sie das aktuelle Buch. Obenan steht dabei immer,
was der Tag noch verlangt – **Heute noch X Seiten zu lesen**, mitgerechnet aus den
Sitzungen des Tages. Ist kein Tagesziel gesetzt, sagt die Leiste das und führt mit
einem Tipp dorthin, wo eines gesetzt wird. Gibt es kein oder mehr als
ein angefangenes Buch, wird gewählt. Starten geht auch im Buch und über langes Drücken
auf eine Zeile der Liste – dort finden sich außerdem *nach oben* und *nach unten*. Der
Rand der Leiste zeigt den Zustand: Akzentfarbe, solange sie zum Start bereitsteht, rot,
während tatsächlich gelesen wird, grün, wenn das Tagesziel steht. Ist eines gesetzt,
steht in der Leiste **Heute noch X Seiten zu lesen** – die Zahl rechnet aus den Sitzungen
des Tages mit; während einer laufenden Sitzung steht sie klein unter dem Buchtitel.

Wird eine Sitzung beendet, öffnet sich das Eintragen-Blatt. Schiebst du es weg, ohne
einzutragen, fragt die App nach – die gelesene Zeit soll nicht stillschweigend verfallen;
*Nachtragen* holt das Blatt mit deinen Eingaben zurück. Eine eingetragene Sitzung wird
sofort weggeschrieben, nicht erst beim nächsten Takt der Selbstsicherung.

Ein Tipp auf **leseliste** oben links führt aus jeder Ansicht zurück auf die Liste;
steht man schon dort, geht es nach oben. Das **×** rechts daneben führt zurück auf die
Startseite mit allen Apps – vorher wird gesichert. Dasselbe tut ein Wisch nach rechts,
wenn die Liste offen ist und keine Ebene darüber liegt: die App schiebt sich am Finger
zur Seite und gibt die Startseite frei; wer zu kurz zieht, schiebt sie wieder zurück.

Unten stehen **Liste**, **Stöbern**, **Notizen** und **Mehr**; *Stöbern* öffnet dabei
keine Ansicht, sondern die eigene Ebene.

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
