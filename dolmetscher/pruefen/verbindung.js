/* Probe: die Teile von src/whatsapp.js, die ohne Verbindung pruefbar sind -
   das Herausholen des Textes und die Frage, welcher Chat uns nichts angeht.
   Der Handschlag mit WhatsApp selbst laesst sich nur am Geraet pruefen. */
import { textAus, beiseite } from '../src/whatsapp.js';
import { nameAus } from '../src/kern.js';
import { macheProbe } from './hilfe.js';

export default async function laufen() {
  const p = macheProbe('Verbindung');

  const t = (nachricht) => textAus({ message: nachricht });

  p.ist('einfacher Text', t({ conversation: 'Salut' }), { text: 'Salut', art: 'text' });
  p.ist('Text mit Antwortbezug',
    t({ extendedTextMessage: { text: 'Salut' } }), { text: 'Salut', art: 'text' });
  p.ist('Bild mit Beschriftung',
    t({ imageMessage: { caption: 'Uite' } }), { text: 'Uite', art: 'bild' });
  p.ist('Bild ohne Beschriftung',
    t({ imageMessage: {} }), { text: '', art: 'bild' });
  p.ist('Sprachnachricht',
    t({ audioMessage: { seconds: 3 } }), { text: '', art: 'sprachnachricht' });
  p.ist('Sticker', t({ stickerMessage: {} }), { text: '', art: 'sticker' });
  p.ist('Ort', t({ locationMessage: {} }), { text: '', art: 'ort' });

  /* Verschwindende Nachrichten und Einmal-Ansichten stecken eine Schicht
     tiefer - der Text muss trotzdem herauskommen. */
  p.ist('verschwindende Nachricht',
    t({ ephemeralMessage: { message: { conversation: 'weg gleich' } } }),
    { text: 'weg gleich', art: 'text' });
  p.ist('einmal ansehen',
    t({ viewOnceMessageV2: { message: { conversation: 'nur einmal' } } }),
    { text: 'nur einmal', art: 'text' });

  /* Systemkram gehoert nicht in den Verlauf. */
  p.ist('Quittungen sind System', t({ protocolMessage: {} }).art, 'system');
  p.ist('Reaktionen sind System', t({ reactionMessage: {} }).art, 'system');
  p.ist('gar keine Nachricht', textAus({}), { text: '', art: 'leer' });
  p.ist('null faellt nicht um', textAus(null), { text: '', art: 'leer' });

  /* Was uns nichts angeht. */
  p.wahr('Status wird uebergangen', beiseite('status@broadcast'));
  p.wahr('Kanaele werden uebergangen', beiseite('123@newsletter'));
  p.wahr('Rundrufe werden uebergangen', beiseite('123@broadcast'));
  p.wahr('leerer JID wird uebergangen', beiseite(''));
  p.wahr('ein Mensch nicht', !beiseite('40712345678@s.whatsapp.net'));
  p.wahr('eine Gruppe auch nicht', !beiseite('120363000000000000@g.us'));

  /* Notnamen, solange das Adressbuch noch nichts hergibt. */
  p.ist('aus der Nummer wird ein Name', nameAus('40712345678@s.whatsapp.net'), '+40712345678');
  p.ist('mit Geraeteteil', nameAus('40712345678:12@s.whatsapp.net'), '+40712345678');
  p.ist('ohne alles', nameAus(''), 'Unbekannt');

  return p.ende();
}
