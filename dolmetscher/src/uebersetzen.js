/**
 * Uebersetzen - drei Dienste hinter einer Tuer.
 *
 * Nach aussen gibt es nur eine Sache: uebersetze(text, ziel) liefert
 * { text, quelle, gleich }. "quelle" ist die erkannte Ausgangssprache,
 * "gleich" heisst: Ausgangs- und Zielsprache waren dieselbe, es wurde
 * nichts angefasst. Wer den Dienst wechselt, aendert nur die Einstellung.
 */

const ZEIT = 12000;          /* wie lange auf eine Antwort gewartet wird */
const STUECK = 1200;         /* laengere Texte gehen in Stuecken raus */
const MERKGROESSE = 500;     /* so viele Uebersetzungen bleiben gemerkt */

/* --- Werkzeug ------------------------------------------------------- */

/** Holt eine Adresse mit Zeitgrenze und einem zweiten Versuch. */
async function hole(adresse, optionen = {}) {
  let letzter;
  for (let versuch = 0; versuch < 2; versuch++) {
    try {
      const antwort = await fetch(adresse, {
        ...optionen,
        signal: AbortSignal.timeout(ZEIT)
      });
      if (!antwort.ok) {
        const grund = (await antwort.text().catch(() => '')).slice(0, 200);
        throw new Error('HTTP ' + antwort.status + (grund ? ' - ' + grund : ''));
      }
      return antwort;
    } catch (e) {
      letzter = e;
      if (versuch === 0) await new Promise(r => setTimeout(r, 400));
    }
  }
  throw letzter;
}

/**
 * Zerlegt langen Text in Stuecke unter STUECK Zeichen - moeglichst an
 * Absaetzen, sonst an Satzenden, im Notfall hart. Google haengt den Text
 * an die Adresse, und die ist begrenzt.
 */
export function stuecke(text, grenze = STUECK) {
  if (text.length <= grenze) return [text];
  const teile = [];
  let rest = text;
  while (rest.length > grenze) {
    const fenster = rest.slice(0, grenze);
    let schnitt = Math.max(
      fenster.lastIndexOf('\n'),
      fenster.lastIndexOf('. '),
      fenster.lastIndexOf('! '),
      fenster.lastIndexOf('? ')
    );
    if (schnitt < grenze * 0.4) schnitt = fenster.lastIndexOf(' ');
    if (schnitt < grenze * 0.4) schnitt = grenze;
    else schnitt += 1;
    teile.push(rest.slice(0, schnitt));
    rest = rest.slice(schnitt);
  }
  if (rest) teile.push(rest);
  return teile;
}

/** Sprachkuerzel vereinheitlichen: "DE", "de-DE", "deu" -> "de". */
export function kuerzel(sprache) {
  if (!sprache) return '';
  return String(sprache).toLowerCase().split(/[-_]/)[0];
}

/* --- Die drei Dienste ----------------------------------------------- */
/* Jeder bekommt (text, ziel, quelle) und gibt { text, quelle } zurueck.
   "quelle" leer heisst: der Dienst hat nichts erkannt.               */

const DIENSTE = {
  /**
   * Google Uebersetzer ueber den offenen Endpunkt - kein Konto, kein
   * Schluessel. Inoffiziell: die Antwort ist ein verschachteltes Feld,
   * [0] sind die Abschnitte, [2] die erkannte Sprache.
   */
  async google(text, ziel, quelle, cfg, holen) {
    const adresse = 'https://translate.googleapis.com/translate_a/single'
      + '?client=gtx&dt=t'
      + '&sl=' + encodeURIComponent(quelle || 'auto')
      + '&tl=' + encodeURIComponent(ziel)
      + '&q=' + encodeURIComponent(text);
    const antwort = await holen(adresse, { headers: { 'user-agent': 'Mozilla/5.0' } });
    const feld = await antwort.json();
    if (!Array.isArray(feld) || !Array.isArray(feld[0])) throw new Error('Unerwartete Antwort von Google');
    const heraus = feld[0].map(a => (Array.isArray(a) ? a[0] : '') || '').join('');
    return { text: heraus, quelle: kuerzel(feld[2]) };
  },

  /**
   * DeepL - braucht einen Schluessel (kostenlos bei deepl.com, 500.000
   * Zeichen im Monat). Der Schluessel endet bei der freien Fassung auf
   * ":fx"; daran haengt, welche Adresse gilt.
   */
  async deepl(text, ziel, quelle, cfg, holen) {
    const schluessel = cfg.deeplSchluessel;
    if (!schluessel) throw new Error('Kein DeepL-Schluessel hinterlegt');
    const wirt = schluessel.trim().endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    const koerper = { text: [text], target_lang: ziel.toUpperCase() };
    if (quelle) koerper.source_lang = quelle.toUpperCase();
    const antwort = await holen('https://' + wirt + '/v2/translate', {
      method: 'POST',
      headers: {
        'authorization': 'DeepL-Auth-Key ' + schluessel.trim(),
        'content-type': 'application/json'
      },
      body: JSON.stringify(koerper)
    });
    const daten = await antwort.json();
    const eins = daten && daten.translations && daten.translations[0];
    if (!eins) throw new Error('Unerwartete Antwort von DeepL');
    return { text: eins.text, quelle: kuerzel(eins.detected_source_language) };
  },

  /**
   * LibreTranslate - offen und selbst zu betreiben. Adresse kommt aus der
   * Einstellung, weil es keinen festen Ort gibt.
   */
  async libre(text, ziel, quelle, cfg, holen) {
    const wurzel = (cfg.libreAdresse || '').replace(/\/+$/, '');
    if (!wurzel) throw new Error('Keine LibreTranslate-Adresse hinterlegt');
    const koerper = { q: text, source: quelle || 'auto', target: ziel, format: 'text' };
    if (cfg.libreSchluessel) koerper.api_key = cfg.libreSchluessel;
    const antwort = await holen(wurzel + '/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(koerper)
    });
    const daten = await antwort.json();
    if (!daten || typeof daten.translatedText !== 'string') throw new Error('Unerwartete Antwort von LibreTranslate');
    const erkannt = daten.detectedLanguage
      ? (daten.detectedLanguage.language || daten.detectedLanguage)
      : '';
    return { text: daten.translatedText, quelle: kuerzel(erkannt) };
  }
};

export const DIENSTNAMEN = Object.keys(DIENSTE);

/* --- Die Tuer nach aussen ------------------------------------------- */

/**
 * @param cfg { dienst, deeplSchluessel, libreAdresse, libreSchluessel }
 * @param werkzeug.holen  nur zum Pruefen: ersetzt fetch
 */
export function macheUebersetzer(cfg = {}, werkzeug = {}) {
  const holen = werkzeug.holen || hole;
  const gemerkt = new Map();
  let stand = { ...cfg };

  const gewaehlt = () => {
    if (stand.dienst && DIENSTE[stand.dienst]) return stand.dienst;
    if (stand.deeplSchluessel) return 'deepl';
    if (stand.libreAdresse) return 'libre';
    return 'google';
  };

  const merken = (schluessel, wert) => {
    if (gemerkt.size >= MERKGROESSE) gemerkt.delete(gemerkt.keys().next().value);
    gemerkt.set(schluessel, wert);
  };

  return {
    /** Aktuelle Einstellung austauschen, ohne alles neu zu bauen. */
    einstellen(neu) {
      stand = { ...stand, ...neu };
      gemerkt.clear();
    },

    dienst: () => gewaehlt(),

    /**
     * @param text    was uebersetzt werden soll
     * @param ziel    Sprachkuerzel, z. B. "de"
     * @param quelle  optional erzwungene Ausgangssprache
     * @returns { text, quelle, gleich, dienst }
     */
    async uebersetze(text, ziel, quelle = '') {
      const roh = String(text == null ? '' : text);
      if (!roh.trim()) return { text: roh, quelle: '', gleich: true, dienst: gewaehlt() };

      const dienst = gewaehlt();
      const schluessel = dienst + '|' + (quelle || 'auto') + '|' + ziel + '|' + roh;
      if (gemerkt.has(schluessel)) return gemerkt.get(schluessel);

      const teile = stuecke(roh);
      let heraus = '';
      let erkannt = '';
      for (const teil of teile) {
        const ergebnis = await DIENSTE[dienst](teil, ziel, quelle, stand, holen);
        heraus += ergebnis.text;
        if (!erkannt) erkannt = ergebnis.quelle;
      }

      /* Kam es schon in der Zielsprache an, gilt der Urtext. Manche Dienste
         geben dann trotzdem eine leicht andere Fassung zurueck - die will
         niemand sehen. */
      const gleich = !!erkannt && kuerzel(erkannt) === kuerzel(ziel);
      const wert = {
        text: gleich ? roh : heraus,
        quelle: kuerzel(erkannt),
        gleich,
        dienst
      };
      merken(schluessel, wert);
      return wert;
    }
  };
}
