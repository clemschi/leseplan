// Zugriff auf die eBay Browse API: Token holen, suchen, Details holen, Bilder laden.
// Läuft mit: NODE_USE_ENV_PROXY=1 node lauf.js   (Node 22 liest den Proxy sonst nicht)

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SUCH_URL  = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const ITEM_URL  = 'https://api.ebay.com/buy/browse/v1/item/';
const SCOPE     = 'https://api.ebay.com/oauth/api_scope';

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- OAuth, Client Credentials -------------------------------------------

let merkeToken = null; // { wert, laeuftAb }

async function token() {
  if (merkeToken && Date.now() < merkeToken.laeuftAb - 60_000) return merkeToken.wert;

  const id = process.env.EBAY_CLIENT_ID;
  const geheim = process.env.EBAY_CLIENT_SECRET;
  if (!id || !geheim) {
    throw new Error('EBAY_CLIENT_ID und EBAY_CLIENT_SECRET fehlen in der Umgebung.');
  }
  const basic = Buffer.from(`${id}:${geheim}`).toString('base64');

  const antwort = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }),
  });
  const text = await antwort.text();
  if (!antwort.ok) throw new Error(`Token abgelehnt (${antwort.status}): ${text.slice(0, 400)}`);

  const daten = JSON.parse(text);
  merkeToken = {
    wert: daten.access_token,
    laeuftAb: Date.now() + (daten.expires_in || 7200) * 1000,
  };
  return merkeToken.wert;
}

// ---- Abruf mit Wiederholung bei 429/5xx ----------------------------------

async function hole(url, markt, versuch = 0) {
  const antwort = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${await token()}`,
      'X-EBAY-C-MARKETPLACE-ID': markt,
      'Accept': 'application/json',
    },
  });
  if (antwort.status === 429 || antwort.status >= 500) {
    if (versuch >= 4) throw new Error(`${antwort.status} nach 5 Versuchen: ${url}`);
    await warte(2000 * 2 ** versuch);
    return hole(url, markt, versuch + 1);
  }
  if (antwort.status === 404) return null;          // Angebot inzwischen weg
  if (!antwort.ok) {
    throw new Error(`${antwort.status} bei ${url}: ${(await antwort.text()).slice(0, 300)}`);
  }
  return antwort.json();
}

// ---- Suche über alle Marktplätze, mit Paginierung -------------------------

async function suchen(markt) {
  const treffer = [];
  for (let offset = 0; offset < cfg.maxProMarkt; offset += cfg.proSeite) {
    const url = `${SUCH_URL}?${new URLSearchParams({
      q: cfg.suche,
      limit: String(Math.min(cfg.proSeite, cfg.maxProMarkt - offset)),
      offset: String(offset),
    })}`;
    const seite = await hole(url, markt);
    const stueck = (seite && seite.itemSummaries) || [];
    for (const s of stueck) treffer.push({ ...s, markt });
    if (stueck.length === 0 || offset + stueck.length >= (seite.total || 0)) break;
    await warte(cfg.pause);
  }
  return treffer;
}

async function alleSuchen() {
  const alles = [];
  for (const markt of cfg.marktplaetze) {
    const t = await suchen(markt);
    console.log(`${markt}: ${t.length} Treffer`);
    alles.push(...t);
    await warte(cfg.pause);
  }
  // dieselbe Item-ID kann auf mehreren Marktplätzen auftauchen
  const gesehen = new Set();
  return alles.filter((t) => !gesehen.has(t.itemId) && gesehen.add(t.itemId));
}

// ---- Details (additionalImages, shipToLocations, Rückgabe, Verkäufer) -----

async function detail(item) {
  const url = `${ITEM_URL}${encodeURIComponent(item.itemId)}`;
  const d = await hole(url, item.markt);
  return d ? { ...item, detail: d } : null;
}

// ---- Bilder in bilder/<item-id>/ ablegen ---------------------------------

function bildListe(eintrag) {
  const d = eintrag.detail || {};
  const urls = [];
  if (d.image && d.image.imageUrl) urls.push(d.image.imageUrl);
  for (const b of d.additionalImages || []) if (b.imageUrl) urls.push(b.imageUrl);
  if (urls.length === 0 && eintrag.image && eintrag.image.imageUrl) urls.push(eintrag.image.imageUrl);
  return [...new Set(urls)];
}

async function bilderLaden(eintrag, wurzel) {
  const ziel = path.join(wurzel, String(eintrag.itemId).replace(/[^\w.-]/g, '_'));
  fs.mkdirSync(ziel, { recursive: true });
  const urls = bildListe(eintrag);
  const dateien = [];

  for (let i = 0; i < urls.length; i++) {
    const endung = (urls[i].match(/\.(jpe?g|png|webp|avif)(\?|$)/i) || [, 'jpg'])[1];
    const name = `${String(i + 1).padStart(2, '0')}.${endung.toLowerCase()}`;
    const pfad = path.join(ziel, name);
    if (fs.existsSync(pfad)) { dateien.push(pfad); continue; }
    try {
      const a = await fetch(urls[i]);
      if (!a.ok) { console.warn(`  Bild ${antwortKurz(a)} ${urls[i]}`); continue; }
      fs.writeFileSync(pfad, Buffer.from(await a.arrayBuffer()));
      dateien.push(pfad);
    } catch (f) {
      console.warn(`  Bild fehlgeschlagen: ${f.message}`);
    }
    await warte(120);
  }
  // Bezugsliste, damit später nachvollziehbar ist, welche Datei welche URL war
  fs.writeFileSync(path.join(ziel, 'quellen.json'), JSON.stringify(urls, null, 2));
  return dateien;
}

const antwortKurz = (a) => `${a.status}`;

module.exports = { token, suchen, alleSuchen, detail, bilderLaden, bildListe, warte };
