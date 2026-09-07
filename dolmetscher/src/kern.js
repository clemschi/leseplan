/**
 * Der Kern - hier faellt die einzige Entscheidung, um die es geht:
 * was geht in welcher Sprache raus, und was wird beim Hereinkommen
 * uebersetzt.
 *
 * Jede Nachricht hat zwei Fassungen:
 *   text   - in meiner Sprache; das steht im Verlauf
 *   fremd  - wie sie wirklich ueber WhatsApp lief; das zeigt ein Tipp darauf
 *
 * Der Kern kennt weder Baileys noch HTTP. Er bekommt eine Verbindung
 * angeschlossen und meldet nach oben, was sich geaendert hat - damit laesst
 * er sich mit einer Attrappe pruefen, ohne dass ein Handy in der Naehe ist.
 */

const MAXNACHRICHTEN = 500;   /* so viele bleiben je Chat liegen */

/** Aus einem JID wird ein lesbarer Name, wenn kein besserer da ist. */
export function nameAus(jid) {
  const roh = String(jid || '').split('@')[0].split(':')[0];
  if (/^[0-9]{6,}$/.test(roh)) return '+' + roh;
  return roh || 'Unbekannt';
}

export function macheKern({ uebersetzer, speicher, melden, maxNachrichten = MAXNACHRICHTEN }) {
  const daten = speicher.daten;
  let wa = null;
  /* Was wir selbst gesendet haben - das Echo aus WhatsApp legt sonst
     eine zweite, unuebersetzte Zeile an. */
  const eigene = new Set();

  const einst = () => daten.einstellungen;

  function holeChat(jid, name = '', gruppe = false) {
    let chat = daten.chats[jid];
    if (!chat) {
      chat = daten.chats[jid] = {
        jid,
        name: name || nameAus(jid),
        uebersetzen: false,
        gegenueber: '',
        gruppe: !!gruppe,
        zuletzt: 0,
        ungelesen: 0,
        nachrichten: []
      };
    }
    if (name && (!chat.name || chat.name === nameAus(jid))) chat.name = name;
    if (gruppe) chat.gruppe = true;
    return chat;
  }

  const kopf = (chat) => ({
    jid: chat.jid,
    name: chat.name,
    uebersetzen: chat.uebersetzen,
    gegenueber: chat.gegenueber || einst().gegenueber,
    gruppe: chat.gruppe,
    zuletzt: chat.zuletzt,
    ungelesen: chat.ungelesen,
    vorschau: chat.nachrichten.length ? chat.nachrichten[chat.nachrichten.length - 1].text : ''
  });

  function anhaengen(chat, eintrag) {
    chat.nachrichten.push(eintrag);
    if (chat.nachrichten.length > maxNachrichten) {
      chat.nachrichten.splice(0, chat.nachrichten.length - maxNachrichten);
    }
    chat.zuletzt = Math.max(chat.zuletzt, eintrag.zeit);
  }

  /** Uebersetzt eine hereingekommene Nachricht und meldet sie noch einmal. */
  async function eingehendUebersetzen(chat, eintrag) {
    const ziel = einst().meine;
    try {
      const ergebnis = await uebersetzer.uebersetze(eintrag.fremd, ziel);
      eintrag.sprache = ergebnis.quelle;
      eintrag.uebersetzt = !ergebnis.gleich;
      eintrag.text = ergebnis.text;
      eintrag.wartet = false;
    } catch (e) {
      /* Kein Netz, Dienst hakt: die Urfassung stehen lassen und es
         danebenschreiben, statt die Nachricht zu verschlucken. */
      eintrag.wartet = false;
      eintrag.fehler = String(e.message || e).slice(0, 140);
    }
    speicher.aendern();
    melden('nachricht', { jid: chat.jid, nachricht: eintrag });
    melden('chat', kopf(chat));
  }

  const kern = {
    anschliessen(verbindung) { wa = verbindung; },

    /** Alles, was die Verbindung meldet, kommt hier an. */
    aufnehmen(art, inhalt) {
      if (art === 'zustand') { melden('zustand', inhalt); return; }

      if (art === 'chats') {
        for (const e of inhalt) {
          const chat = holeChat(e.jid, e.name, e.gruppe);
          melden('chat', kopf(chat));
        }
        speicher.aendern();
        return;
      }

      if (art === 'nachricht') {
        const chat = holeChat(inhalt.jid, inhalt.vonMir ? '' : inhalt.name, inhalt.gruppe);

        /* Unser eigenes Echo: schon im Verlauf, nichts zu tun. */
        if (eigene.has(inhalt.id)) return;
        if (chat.nachrichten.some(n => n.id === inhalt.id)) return;

        const eintrag = {
          id: inhalt.id,
          vonMir: !!inhalt.vonMir,
          zeit: inhalt.zeit || Date.now(),
          art: inhalt.art || 'text',
          text: inhalt.text || '',
          fremd: inhalt.text || '',
          sprache: '',
          uebersetzt: false,
          wartet: false,
          status: inhalt.vonMir ? 'gesendet' : ''
        };

        const lohnt = eintrag.art === 'text' && eintrag.fremd.trim()
          && !eintrag.vonMir
          && (!einst().nurMarkierte || chat.uebersetzen);
        eintrag.wartet = lohnt;

        anhaengen(chat, eintrag);
        if (!eintrag.vonMir) chat.ungelesen += 1;
        speicher.aendern();
        melden('nachricht', { jid: chat.jid, nachricht: eintrag });
        melden('chat', kopf(chat));

        /* Erst zeigen, dann uebersetzen: die Nachricht steht sofort da und
           wird nachtraeglich deutsch. Kein Warten auf das Netz. */
        if (lohnt) eingehendUebersetzen(chat, eintrag);
        return;
      }
    },

    /* --- was die Oberflaeche braucht --------------------------------- */

    chats() {
      return Object.values(daten.chats)
        .map(kopf)
        .sort((a, b) => b.zuletzt - a.zuletzt);
    },

    verlauf(jid, anzahl = 200) {
      const chat = daten.chats[jid];
      if (!chat) return { chat: null, nachrichten: [] };
      return { chat: kopf(chat), nachrichten: chat.nachrichten.slice(-anzahl) };
    },

    gelesen(jid) {
      const chat = daten.chats[jid];
      if (!chat || !chat.ungelesen) return;
      chat.ungelesen = 0;
      speicher.aendern();
      melden('chat', kopf(chat));
    },

    einstellen(jid, neu) {
      const chat = holeChat(jid);
      if (typeof neu.uebersetzen === 'boolean') chat.uebersetzen = neu.uebersetzen;
      if (typeof neu.gegenueber === 'string') chat.gegenueber = neu.gegenueber.trim().toLowerCase();
      if (typeof neu.name === 'string' && neu.name.trim()) chat.name = neu.name.trim();
      speicher.sichern();
      melden('chat', kopf(chat));
      return kopf(chat);
    },

    /** Wie der Text drueben ankaeme - ohne ihn zu senden. */
    async vorschau(jid, text) {
      const chat = holeChat(jid);
      const ziel = chat.gegenueber || einst().gegenueber;
      if (!chat.uebersetzen) return { text, ziel, uebersetzt: false };
      const ergebnis = await uebersetzer.uebersetze(text, ziel, einst().meine);
      return { text: ergebnis.text, ziel, uebersetzt: !ergebnis.gleich };
    },

    /**
     * Der Weg nach draussen: deutsch getippt, rumaenisch gesendet.
     * Schlaegt das Uebersetzen fehl, geht nichts raus - lieber eine
     * Fehlermeldung als eine Nachricht in der falschen Sprache.
     */
    async senden(jid, text) {
      const roh = String(text || '');
      if (!roh.trim()) throw new Error('Leere Nachricht');
      if (!wa) throw new Error('Keine Verbindung');

      const chat = holeChat(jid);
      const ziel = chat.gegenueber || einst().gegenueber;
      let hinaus = roh;
      let uebersetzt = false;

      if (chat.uebersetzen) {
        const ergebnis = await uebersetzer.uebersetze(roh, ziel, einst().meine);
        hinaus = ergebnis.text;
        uebersetzt = !ergebnis.gleich;
      }

      const gesendet = await wa.senden(jid, hinaus);
      const eintrag = {
        id: gesendet.id || ('eigen-' + Date.now()),
        vonMir: true,
        zeit: gesendet.zeit || Date.now(),
        art: 'text',
        text: roh,
        fremd: hinaus,
        sprache: einst().meine,
        uebersetzt,
        wartet: false,
        status: 'gesendet'
      };
      eigene.add(eintrag.id);
      anhaengen(chat, eintrag);
      speicher.sichern();
      melden('nachricht', { jid, nachricht: eintrag });
      melden('chat', kopf(chat));
      return eintrag;
    },

    einstellungen: () => ({ ...einst() }),

    einstellungenSetzen(neu) {
      const alt = einst();
      const felder = ['meine', 'gegenueber', 'dienst', 'deeplSchluessel', 'libreAdresse', 'libreSchluessel'];
      for (const f of felder) {
        if (typeof neu[f] === 'string') alt[f] = neu[f].trim();
      }
      if (typeof neu.nurMarkierte === 'boolean') alt.nurMarkierte = neu.nurMarkierte;
      uebersetzer.einstellen(alt);
      speicher.sichern();
      melden('einstellungen', { ...alt });
      return { ...alt };
    }
  };

  return kern;
}
