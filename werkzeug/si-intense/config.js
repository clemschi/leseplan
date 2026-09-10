// Einstellungen für die Sì-Intense-Suche. Alles, was man drehen will, steht hier.

module.exports = {
  // eBay Browse API
  suche: 'armani si intense',
  marktplaetze: ['EBAY_DE', 'EBAY_GB', 'EBAY_US', 'EBAY_IT', 'EBAY_FR', 'EBAY_AU'],
  proSeite: 50,          // Browse API erlaubt bis 200; 50 hält die Antworten klein
  maxProMarkt: 200,      // wie viele Treffer je Marktplatz höchstens geholt werden

  // Was schon am Titel ausscheidet (2021er, 2023er Nachfüll-Flakon, andere Düfte)
  titelSperre: /refill|nachf(ü|ue)ll|passione|fiori|2021/i,

  // Umrechnung in EUR. Die Browse API liefert Landeswährung; hier stehen feste
  // Kurse, weil kein Kursdienst erreichbar ist. Vor dem Lauf prüfen und anpassen.
  kurse: {
    EUR: 1,
    GBP: 1.17,
    USD: 0.92,
    AUD: 0.60,
    CHF: 1.06,
  },
  kurseStand: 'von Hand gesetzt – vor dem Lauf prüfen',

  // Länder, die in der Tabelle als EU zuerst stehen
  eu: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
       'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'],

  zielland: 'AT',        // wohin versandt werden soll
  pause: 250,            // ms zwischen Detail-Abrufen
  ordner: 'bilder',      // Bildablage, je Item-ID ein Unterordner
};
