# Sì Intense (2014) – Flakonsuche

Gesucht wird ausschließlich die Erstfassung von 2014. Alle drei Düfte hängen bei
den Händlern an derselben Katalognummer 3605522035300, deshalb entscheidet
**nur das Flakonbild**, nie Titel, Beschreibung oder EAN.

| Fassung | Flakon | Urteil |
|---|---|---|
| 2014 | komplett schwarz lackiert, undurchsichtig; schwarze Kappe in Flammenform; goldenes „Sì“; klarer Glassockel unten mit „GIORGIO ARMANI“ | **gesucht** |
| 2021 | transparent, dunkelroter Saft sichtbar, schwarze Flammenkappe | verwerfen |
| 2023 | transparent, nachfüllbar, dreidimensional geprägtes „Sì“ | verwerfen |

## Was an Zugangsdaten gebraucht wird

Developer-Account auf <https://developer.ebay.com> anlegen, dort einen
**Production**-Schlüsselsatz erzeugen (nicht Sandbox – die Sandbox hat keine
echten Angebote). Aus dem Schlüsselsatz werden genau zwei Werte gebraucht:

| Wert | heißt bei eBay | Beispielform |
|---|---|---|
| Client ID | „App ID (Client ID)“ | `Vorname-Appname-PRD-1a2b3c4d5-6e7f8a9b` |
| Client Secret | „Cert ID (Client Secret)“ | `PRD-1a2b3c4d5e6f-7a8b-9c0d-1e2f` |

Nicht gebraucht: Dev ID, Redirect-URI/RuName, User-Token. Der Client Credentials
Flow braucht keinen angemeldeten Nutzer, der Scope ist `api_scope`.

Gesetzt werden sie als Umgebungsvariablen, nicht in eine Datei geschrieben:

```sh
export EBAY_CLIENT_ID='…'
export EBAY_CLIENT_SECRET='…'
```

## Ablauf

```sh
NODE_USE_ENV_PROXY=1 node lauf.js sammeln   # suchen, filtern, Details, Bilder
node lauf.js bogen                          # Kontaktbögen zum Ansehen
# klassifikation.json ausfüllen: 2014 | 2021 | 2023 | anderes | ungeprueft
node lauf.js tabelle                        # ergebnis.md
```

`sammeln` sucht `armani si intense` auf EBAY_DE, GB, US, IT, FR, AU, holt je
Marktplatz bis zu 200 Treffer mit Paginierung, wirft alles mit `refillable`,
`nachfüllbar`, `passione`, `fiori` oder `2021` im Titel weg (Übersichts- **und**
Detailtitel), holt zu jedem Rest das Detail und legt `image` samt
`additionalImages` unter `bilder/<item-id>/` ab, daneben `quellen.json` mit den
Ursprungs-URLs.

`klassifikation.json` startet für jedes Angebot auf `ungeprueft` und wird bei
einem zweiten Lauf nur ergänzt, nie überschrieben. In `ergebnis.md` landen nur
`2014` und `ungeprueft`; die Spalte **ungeprüft** trägt `ja`, solange das Bild
nicht bestätigt ist. Sortiert wird EU-Verkäufer zuerst, darin Preis aufsteigend.

## Grenzen, die man kennen muss

- **Preise in EUR sind umgerechnet.** Die Kurse stehen fest in `config.js`
  (`kurse`), weil kein Kursdienst angebunden ist. Umgerechnete Beträge tragen
  ein `~` und die Landeswährung in Klammern. Vor jedem Lauf nachziehen.
- **`nach AT` kommt aus `shipToLocations`** (`regionIncluded`/`regionExcluded`),
  hilfsweise aus `shippingOptions`. Fehlt beides, steht dort `unklar` – nicht
  `nein`.
- **Ohne bestätigtes Bild gibt es kein Urteil „2014“.** Der Titelfilter trennt
  nur, was sich schon am Wort verrät.

## Ausweichweg ohne API

```sh
NODE_USE_ENV_PROXY=1 node kleinanzeigen.js roh    # Seiten holen, 4 s Pause
node kleinanzeigen.js lesen                       # Angebote herausziehen
```

willhaben wird über den `__NEXT_DATA__`-Block gelesen (stabiler als CSS-Selektoren),
Parfumo über HTML-Blöcke. **Beide Auslesefunktionen sind gegen echtes Markup nicht
geprüft** – der Schritt `roh` legt die Seiten deshalb erst als Datei ab, damit man
die Selektoren daran zurechtrücken kann, bevor man ihnen glaubt.

## Proben

`node probe.js` prüft ohne Netz: Titelfilter, Umrechnung, Größenerkennung,
Versand-nach-AT, Rückgabe, Sortierung, Tabellenbau. 9 Proben, alle grün.
