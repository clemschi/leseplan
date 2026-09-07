/**
 * Attrappen: ein WhatsApp ohne WhatsApp und ein Uebersetzer ohne Netz.
 * Damit laesst sich der ganze Weg durchspielen - ohne Handy, ohne Konto,
 * ohne dass eine Nachricht das Geraet verlaesst.
 */

/* Ein winziges Woerterbuch. Was nicht darin steht, bekommt die Zielsprache
   vorangestellt - dann sieht man in der Probe trotzdem, dass etwas geschah. */
const WORTE = [
  { de: 'Guten Morgen', ro: 'Bună dimineața' },
  { de: 'Wie geht es dir?', ro: 'Ce mai faci?' },
  { de: 'Ich komme später', ro: 'Vin mai târziu' },
  { de: 'Danke', ro: 'Mulțumesc' },
  { de: 'Bis gleich', ro: 'Pe curând' }
];

export function spracheRaten(text) {
  const treffer = WORTE.find(w => w.de === text || w.ro === text);
  if (treffer) return treffer.de === text ? 'de' : 'ro';
  return /[ăâîșşțţ]/i.test(text) ? 'ro' : 'de';
}

export function attrappenUebersetzung(text, ziel) {
  const treffer = WORTE.find(w => w.de === text || w.ro === text);
  if (treffer && treffer[ziel]) return treffer[ziel];
  return '[' + ziel + '] ' + text;
}

/**
 * Ersetzt fetch im Uebersetzer. Erkennt an der Adresse, welcher Dienst
 * gemeint ist, und antwortet in genau dessen Form.
 */
export function macheHolen(protokoll = []) {
  return async function holen(adresse, optionen = {}) {
    const u = new URL(adresse);
    protokoll.push(u.host);

    if (u.host.includes('translate.googleapis.com')) {
      const text = u.searchParams.get('q') || '';
      const ziel = u.searchParams.get('tl');
      const quelle = spracheRaten(text);
      return { json: async () => [[[attrappenUebersetzung(text, ziel), text, null, null, 10]], null, quelle] };
    }

    if (u.host.includes('deepl.com')) {
      const koerper = JSON.parse(optionen.body || '{}');
      const text = koerper.text[0];
      const ziel = String(koerper.target_lang || '').toLowerCase();
      return {
        json: async () => ({
          translations: [{
            detected_source_language: spracheRaten(text).toUpperCase(),
            text: attrappenUebersetzung(text, ziel)
          }]
        })
      };
    }

    /* alles andere gilt als LibreTranslate */
    const koerper = JSON.parse(optionen.body || '{}');
    return {
      json: async () => ({
        translatedText: attrappenUebersetzung(koerper.q, koerper.target),
        detectedLanguage: { language: spracheRaten(koerper.q), confidence: 90 }
      })
    };
  };
}

/** Eine Verbindung, die sich wie WhatsApp verhaelt, aber nirgends hinfunkt. */
export function macheWaAttrappe({ melden }) {
  let zustand = {
    stand: 'offen',
    qr: '',
    code: '',
    ich: { jid: '4915100000000@s.whatsapp.net', name: 'Ich' },
    grund: ''
  };
  let zaehler = 0;
  const gesendet = [];

  return {
    zustand: () => zustand,
    gesendet,

    async starten() { melden('zustand', zustand); },

    async koppeln(nummer) {
      if (String(nummer).replace(/\D/g, '').length < 8) throw new Error('Nummer bitte international angeben');
      zustand = { ...zustand, stand: 'kopplung', code: 'ABCD-1234' };
      melden('zustand', zustand);
      return 'ABCD-1234';
    },

    async senden(jid, text) {
      if (zustand.stand !== 'offen') throw new Error('Keine Verbindung zu WhatsApp');
      const id = 'gesendet-' + (++zaehler);
      gesendet.push({ jid, text, id });
      /* WhatsApp schickt das eigene Echo zurueck - genau wie im Betrieb. */
      setTimeout(() => melden('nachricht', {
        jid, id, vonMir: true, text, art: 'text', zeit: Date.now(), name: '', gruppe: false
      }), 5);
      return { id, zeit: Date.now() };
    },

    async abmelden() {
      zustand = { stand: 'aus', qr: '', code: '', ich: null, grund: 'Abgemeldet' };
      melden('zustand', zustand);
    },

    async schliessen() {},

    /* --- nur fuer die Probe --- */
    hereinkommen(jid, text, dazu = {}) {
      melden('nachricht', {
        jid,
        id: dazu.id || ('herein-' + (++zaehler)),
        vonMir: false,
        text,
        art: dazu.art || 'text',
        zeit: dazu.zeit || Date.now(),
        name: dazu.name || '',
        gruppe: !!dazu.gruppe
      });
    },
    namenMelden(liste) { melden('chats', liste); }
  };
}
