# Dolmetscher

WhatsApp auf Deutsch. Du schreibst deutsch, drüben kommt es rumänisch an;
was hereinkommt, steht bei dir auf Deutsch. Ein Tipp auf eine Nachricht
zeigt, was wirklich über die Leitung ging.

Das Ganze läuft **auf deinem Handy selbst** – kein Rechner, kein fremder
Server. Es meldet sich bei WhatsApp als *verknüpftes Gerät* an, genau wie
WhatsApp Web, und macht daneben ein eigenes Fenster im Browser auf.

```
Du tippst:      "Ich komme später"      ← so siehst du es immer
über WhatsApp:  "Vin mai târziu"        ← so kommt es bei ihr an
sie schreibt:   "Ce mai faci?"
du siehst:      "Wie geht es dir?"      ← Tippen zeigt das Original
```

---

## Bevor du anfängst – drei Dinge, die du wissen musst

1. **WhatsApp erlaubt das nicht ausdrücklich.** Der Zugang läuft über
   Baileys, eine freie Nachbildung des WhatsApp-Web-Protokolls. Es ist kein
   offizieller Weg, und WhatsApp kann eine Nummer dafür sperren. Das kommt
   vor. Nimm es als Möglichkeit, nicht als Theorie.
2. **Der Text geht zum Übersetzungsdienst.** Damit übersetzt werden kann,
   verlässt der Wortlaut jeder betroffenen Nachricht das Handy – zu Google,
   DeepL oder deinem eigenen LibreTranslate. Die Ende-zu-Ende-Verschlüsselung
   von WhatsApp endet auf deinem Gerät; ab da entscheidest du. Wenn dir das
   zu weit geht: LibreTranslate lässt sich selbst betreiben, dann bleibt
   alles bei dir.
3. **Läuft der Dolmetscher nicht, passiert einfach nichts.** Nachrichten
   kommen dann ganz normal und unübersetzt in WhatsApp an. Kaputt geht nichts.

---

## Einrichten auf dem Handy (Android, etwa 15 Minuten)

### 1. Termux installieren

Termux ist eine Linux-Umgebung für Android. **Nicht aus dem Play Store** –
die Fassung dort ist alt und funktioniert nicht mehr. Aus F-Droid:

* F-Droid holen: <https://f-droid.org> → **Download F-Droid** → APK installieren
* In F-Droid nach **Termux** suchen und installieren

### 2. Node einrichten

Termux öffnen und eintippen (jede Zeile mit Eingabe abschliessen):

```sh
pkg update && pkg upgrade -y
pkg install nodejs-lts git -y
```

### 3. Den Dolmetscher holen

```sh
git clone --depth 1 -b claude/whatsapp-translation-app-p2b8p9 \
  https://github.com/clemschi/leseplan.git
cd leseplan/dolmetscher
npm install
```

`npm install` lädt rund 30 MB und dauert im Mobilfunknetz ein paar Minuten.

### 4. Starten

```sh
termux-wake-lock
node server.js
```

`termux-wake-lock` hält Android davon ab, den Dienst nach ein paar Minuten
schlafen zu legen. Im Terminal steht dann:

```
Dolmetscher laeuft.
  http://localhost:8080/
```

**Termux offen lassen** (nicht wegwischen) und mit dem Home-Knopf in den
Hintergrund schieben.

### 5. Mit WhatsApp verknüpfen

Chrome öffnen, `http://localhost:8080` aufrufen. Dort:

* Deine eigene WhatsApp-Nummer eintippen, **international, ohne Plus und ohne
  Leerzeichen**: `491701234567` für Deutschland, `43…` Österreich, `41…`
  Schweiz.
* **Code anfordern** – es erscheint ein achtstelliger Code.
* In WhatsApp: **Einstellungen › Verknüpfte Geräte › Gerät hinzufügen ›
  Stattdessen mit Telefonnummer verknüpfen** – und den Code eintippen.

Nach ein paar Sekunden steht oben *verbunden* und die Chatliste erscheint.
Die Verknüpfung bleibt bestehen; das ist nur einmal nötig.

### 6. Einen Chat auf Übersetzen stellen

Chat öffnen → **⋯** oben rechts → **Übersetzen** einschalten, Sprache des
Gegenübers wählen → **Übernehmen**.

Das ist mit Absicht ein Schalter je Chat: sonst ginge deine nächste Nachricht
an die Mutter auch auf Rumänisch raus. Eingehendes wird überall übersetzt,
das schadet nichts – wer das nicht will, stellt in den Einstellungen
*Nur markierte Chats übersetzen* ein.

### 7. Auf den Startbildschirm legen

In Chrome: **⋮ › Zum Startbildschirm hinzufügen**. Danach öffnet sich der
Dolmetscher wie eine App, ohne Adresszeile.

---

## Damit es auch morgen noch läuft

**Akku-Sparen abschalten** – sonst killt Android Termux über Nacht:
Einstellungen → Apps → Termux → Akku → **Nicht optimiert** / *Uneingeschränkt*.

**Von selbst starten** (freiwillig): **Termux:Boot** aus F-Droid installieren,
einmal öffnen, dann:

```sh
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/dolmetscher.sh <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd ~/leseplan/dolmetscher
node server.js
EOF
chmod +x ~/.termux/boot/dolmetscher.sh
```

Danach startet der Dolmetscher nach jedem Neustart des Handys von allein.

**Neu starten von Hand:** Termux öffnen, `Strg+C`, dann wieder
`cd ~/leseplan/dolmetscher && node server.js`.

---

## Der Übersetzungsdienst

Voreingestellt ist **Google** über den offenen Endpunkt: kein Konto, kein
Schlüssel, sofort startklar. Inoffiziell – wenn er eines Tages dichtmacht,
steht in der Blase *nicht übersetzt* und du stellst um.

In den Einstellungen (⚙ oben rechts) gibt es zwei Alternativen:

| Dienst | Was dafür nötig ist | Wofür |
|---|---|---|
| **DeepL** | kostenloser Schlüssel bei [deepl.com/pro-api](https://www.deepl.com/pro-api), 500.000 Zeichen im Monat | merklich besseres Deutsch↔Rumänisch |
| **LibreTranslate** | eine eigene Adresse (selbst betrieben oder öffentlich) | wenn kein Text an Google oder DeepL gehen soll |

---

## Wenn etwas klemmt

| Was du siehst | Woran es liegt |
|---|---|
| `Code anfordern` meldet einen Fehler | Nummer ohne Plus und ohne Leerzeichen, mit Ländervorwahl. Sonst: warten, bis oben *bereit zum Verknüpfen* steht. |
| Chatliste bleibt leer | Normal. Chats erscheinen, sobald die erste Nachricht kommt oder du eine schreibst – der Dolmetscher holt nicht den ganzen alten Verlauf. |
| *verbindet …* hört nicht auf | Kein Netz, oder WhatsApp hat die Verknüpfung gelöst. In WhatsApp unter *Verknüpfte Geräte* nachsehen; notfalls in den Einstellungen abmelden und neu verknüpfen. |
| in der Blase steht *nicht übersetzt* | Der Übersetzungsdienst war nicht erreichbar. Die Nachricht ist da, nur eben im Urtext. |
| nach dem Handy-Neustart kommt nichts mehr | Termux läuft nicht. Siehe oben: Akku-Sparen abschalten, Termux:Boot. |

**Auf einem anderen Gerät im WLAN öffnen** (etwa vom Tablet aus):

```sh
HOST=0.0.0.0 node server.js
```

Dann verlangt der Server einen Schlüssel; er steht in `daten/schluessel.txt`
und hängt in der Adresse, die beim Start ausgegeben wird. Ohne `HOST=0.0.0.0`
kommt nur heran, wer auf demselben Gerät sitzt – das ist die sichere
Voreinstellung, und dabei sollte es bleiben, solange du nichts anderes brauchst.

---

## Was wo liegt

| Datei | Zeilen | Was |
|---|---|---|
| `server.js` | 48 | Start: Ort, Port, Schlüssel – mehr nicht |
| `src/anwendung.js` | 178 | alle Teile zusammengesteckt, HTTP-Wege, der Ereignisstrom zur Oberfläche |
| `src/kern.js` | 246 | die einzige Entscheidung: was geht in welcher Sprache raus, was wird beim Hereinkommen übersetzt |
| `src/whatsapp.js` | 248 | der einzige Baustein, der Baileys kennt – Verbinden, Kopplungscode, Senden, Abmelden |
| `src/uebersetzen.js` | 214 | Google, DeepL, LibreTranslate hinter einer Tür; Zerlegen langer Texte, Gemerktes |
| `src/speicher.js` | 108 | `daten/verlauf.json`, über eine Nebendatei geschrieben |
| `web/index.html` | 91 | drei Flächen: Anmelden, Chats, ein Chat |
| `web/app.js` | 522 | die Oberfläche; rechnet nichts, malt nur, was der Server meldet |
| `web/stil.css` | 251 | dunkel, für den Daumen |

Jede Nachricht führt zwei Fassungen: `text` in deiner Sprache – das steht im
Verlauf – und `fremd`, wie sie wirklich über WhatsApp lief. Das Antippen
zeigt `fremd`. Mehr Zauber ist nicht dahinter.

**Was wo liegt, wenn du aufräumen willst:**
`daten/verlauf.json` ist der Verlauf samt Einstellungen, `daten/anmeldung/`
sind die Schlüssel der WhatsApp-Verknüpfung. Beides gehört dir allein und
wird nie mitgeliefert (`.gitignore`).

---

## Prüfen

```sh
npm run pruefen            # alle Proben, unter einer Minute
node pruefen/alles.js kern # nur die Proben, deren Name das enthält
```

133 Proben: das Übersetzen mit allen drei Diensten, der Kern (was geht raus,
was kommt an, was überlebt einen Neustart), der Server samt Schlüssel und
Wegen, und die Oberfläche im echten Browser – getippt, gewischt, gemessen.
WhatsApp und das Netz sind dabei Attrappen (`pruefen/attrappe.js`), es
verlässt keine Nachricht das Gerät.
