/**
 * Die Verbindung zu WhatsApp - der einzige Baustein, der Baileys kennt.
 *
 * Nach aussen gibt es Ereignisse ("zustand", "nachricht", "chats") und vier
 * Handgriffe (starten, koppeln, senden, abmelden). Der Kern weiss nichts von
 * Baileys; deshalb laesst er sich mit einer Attrappe pruefen.
 *
 * Angemeldet wird als verknuepftes Geraet - dasselbe, was WhatsApp Web tut.
 * Auf dem Handy geht das nicht per QR-Code (man kann den eigenen Bildschirm
 * nicht abfotografieren), sondern ueber den achtstelligen Kopplungscode:
 * WhatsApp > Einstellungen > Verknuepfte Geraete > Mit Nummer verknuepfen.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  jidNormalizedUser,
  isJidGroup,
  isJidBroadcast,
  isJidNewsletter,
  isJidStatusBroadcast
} from 'baileys';

/* Baileys will einen Logger mit child(). Einer, der schweigt, genuegt -
   sonst laeuft das Terminal auf dem Handy in Sekunden voll. */
const stillerLog = {
  level: 'silent',
  child() { return stillerLog; },
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {}
};

/** Holt den Text aus einer Nachricht - und sagt, was es ist, wenn keiner drin steht. */
export function textAus(nachricht) {
  const m = nachricht && nachricht.message;
  if (!m) return { text: '', art: 'leer' };
  const inhalt = m.ephemeralMessage?.message
    || m.viewOnceMessage?.message
    || m.viewOnceMessageV2?.message
    || m.documentWithCaptionMessage?.message
    || m;

  if (typeof inhalt.conversation === 'string') return { text: inhalt.conversation, art: 'text' };
  if (inhalt.extendedTextMessage?.text) return { text: inhalt.extendedTextMessage.text, art: 'text' };
  if (inhalt.imageMessage) return { text: inhalt.imageMessage.caption || '', art: 'bild' };
  if (inhalt.videoMessage) return { text: inhalt.videoMessage.caption || '', art: 'video' };
  if (inhalt.documentMessage) return { text: inhalt.documentMessage.caption || '', art: 'datei' };
  if (inhalt.audioMessage) return { text: '', art: 'sprachnachricht' };
  if (inhalt.stickerMessage) return { text: '', art: 'sticker' };
  if (inhalt.locationMessage) return { text: '', art: 'ort' };
  if (inhalt.contactMessage || inhalt.contactsArrayMessage) return { text: '', art: 'kontakt' };
  if (inhalt.pollCreationMessage || inhalt.pollCreationMessageV3) return { text: '', art: 'umfrage' };
  /* Quittungen, Reaktionen, Systemkram - nichts, was in den Verlauf gehoert. */
  if (inhalt.protocolMessage || inhalt.reactionMessage || inhalt.senderKeyDistributionMessage) {
    return { text: '', art: 'system' };
  }
  return { text: '', art: 'anderes' };
}

/** Chats, die uns nichts angehen: Status, Kanaele, Rundrufe. */
export function beiseite(jid) {
  if (!jid) return true;
  return isJidStatusBroadcast(jid) || isJidNewsletter(jid) || isJidBroadcast(jid);
}

export function macheWhatsApp({ ordner, melden, holeNachricht }) {
  fs.mkdirSync(ordner, { recursive: true });

  let sock = null;
  let zustand = { stand: 'aus', qr: '', code: '', ich: null, grund: '' };
  let wartend = null;
  let versuche = 0;
  let aufgeben = false;
  let kopplungFuer = '';     /* Nummer, fuer die beim naechsten Start ein Code geholt wird */

  const setzen = (neu) => {
    zustand = { ...zustand, ...neu };
    melden('zustand', zustand);
  };

  const anmeldungLoeschen = () => {
    try { fs.rmSync(ordner, { recursive: true, force: true }); } catch { /* dann eben nicht */ }
    fs.mkdirSync(ordner, { recursive: true });
  };

  async function verbinden() {
    if (aufgeben) return;
    if (wartend) { clearTimeout(wartend); wartend = null; }

    const { state, saveCreds } = await useMultiFileAuthState(ordner);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

    setzen({ stand: state.creds.registered ? 'verbindet' : 'offen-fuer-kopplung', grund: '' });

    sock = makeWASocket({
      auth: state,
      version,
      logger: stillerLog,
      browser: Browsers.ubuntu('Dolmetscher'),
      /* Nicht als "online" melden: sonst schickt WhatsApp die Benachrichtigungen
         nicht mehr aufs Handy, und man merkt gar nichts mehr. */
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async (schluessel) => (holeNachricht ? holeNachricht(schluessel) : undefined)
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
      if (u.qr) setzen({ stand: 'qr', qr: u.qr });

      if (u.connection === 'open') {
        versuche = 0;
        const ich = sock.user
          ? { jid: jidNormalizedUser(sock.user.id), name: sock.user.name || sock.user.verifiedName || '' }
          : null;
        setzen({ stand: 'offen', qr: '', code: '', ich, grund: '' });
      }

      if (u.connection === 'close') {
        const fehler = u.lastDisconnect && u.lastDisconnect.error;
        const nummer = fehler && fehler.output && fehler.output.statusCode;

        if (nummer === DisconnectReason.loggedOut) {
          /* Auf dem Handy abgemeldet - die Schluessel sind wertlos. */
          anmeldungLoeschen();
          setzen({ stand: 'aus', qr: '', code: '', ich: null, grund: 'Auf dem Handy abgemeldet' });
          versuche = 0;
          wartend = setTimeout(() => verbinden().catch(() => {}), 1500);
          return;
        }

        versuche += 1;
        const pause = Math.min(30000, 1000 * Math.pow(2, Math.min(versuche, 5)));
        setzen({
          stand: 'verbindet',
          grund: (fehler && fehler.message) ? String(fehler.message).slice(0, 160) : ''
        });
        wartend = setTimeout(() => verbinden().catch(() => {}), pause);
      }
    });

    /* Nachrichten: alles, was neu hereinkommt oder von einem anderen Geraet
       aus geschrieben wurde. */
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify' && type !== 'append') return;
      for (const m of messages || []) {
        const jid = m.key && m.key.remoteJid;
        if (beiseite(jid)) continue;
        const { text, art } = textAus(m);
        if (art === 'system' || art === 'leer') continue;
        melden('nachricht', {
          jid,
          id: m.key.id,
          vonMir: !!m.key.fromMe,
          text,
          art,
          zeit: Number(m.messageTimestamp || 0) * 1000 || Date.now(),
          name: m.pushName || '',
          gruppe: isJidGroup(jid)
        });
      }
    });

    /* Namen: aus dem Adressbuch und aus der Chatliste. */
    const namenMelden = (liste, feldName) => {
      const heraus = [];
      for (const e of liste || []) {
        const jid = e.id || e.jid;
        if (!jid || beiseite(jid)) continue;
        const name = e[feldName] || e.name || e.notify || e.verifiedName || '';
        heraus.push({ jid, name, gruppe: isJidGroup(jid) });
      }
      if (heraus.length) melden('chats', heraus);
    };
    sock.ev.on('contacts.upsert', l => namenMelden(l, 'name'));
    sock.ev.on('contacts.update', l => namenMelden(l, 'name'));
    sock.ev.on('chats.upsert', l => namenMelden(l, 'name'));
    sock.ev.on('messaging-history.set', ({ chats, contacts }) => {
      namenMelden(contacts, 'name');
      namenMelden(chats, 'name');
    });
  }

  return {
    zustand: () => zustand,

    async starten() {
      aufgeben = false;
      await verbinden();
      if (kopplungFuer) {
        const nummer = kopplungFuer;
        kopplungFuer = '';
        await this.koppeln(nummer).catch(() => {});
      }
    },

    /**
     * Fordert den achtstelligen Kopplungscode fuer eine Telefonnummer an.
     * Nummer international ohne + und ohne Zwischenraum: 491701234567.
     */
    async koppeln(nummer) {
      const sauber = String(nummer || '').replace(/[^0-9]/g, '');
      if (sauber.length < 8) throw new Error('Nummer bitte international angeben, z. B. 491701234567');
      if (!sock) { kopplungFuer = sauber; await verbinden(); }
      if (sock.authState.creds.registered) throw new Error('Dieses Geraet ist schon verknuepft');

      /* Baileys braucht einen Moment, bis der erste Handschlag steht -
         vorher weist WhatsApp die Anfrage ab. */
      await new Promise(r => setTimeout(r, 2500));
      const code = await sock.requestPairingCode(sauber);
      const huebsch = String(code).replace(/(.{4})(?=.)/g, '$1-');
      setzen({ stand: 'kopplung', code: huebsch, qr: '' });
      return huebsch;
    },

    async senden(jid, text) {
      if (!sock || zustand.stand !== 'offen') throw new Error('Keine Verbindung zu WhatsApp');
      const ergebnis = await sock.sendMessage(jid, { text });
      return { id: ergebnis && ergebnis.key ? ergebnis.key.id : '', zeit: Date.now() };
    },

    async abmelden() {
      aufgeben = true;
      if (wartend) { clearTimeout(wartend); wartend = null; }
      try { if (sock) await sock.logout(); } catch { /* schon weg */ }
      try { if (sock) sock.end(undefined); } catch { /* schon weg */ }
      sock = null;
      anmeldungLoeschen();
      setzen({ stand: 'aus', qr: '', code: '', ich: null, grund: 'Abgemeldet' });
    },

    async schliessen() {
      aufgeben = true;
      if (wartend) { clearTimeout(wartend); wartend = null; }
      try { if (sock) sock.end(undefined); } catch { /* schon weg */ }
      sock = null;
    }
  };
}

/** Wo die Schluessel liegen - eigener Ordner, nichts anderes darin. */
export const anmeldeOrdner = (wurzel) => path.join(wurzel, 'anmeldung');
