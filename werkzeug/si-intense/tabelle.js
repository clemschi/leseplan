// Aus den gesammelten Einträgen die Markdown-Tabelle bauen.

const cfg = require('./config');

// ---- Preis ---------------------------------------------------------------

function preisEuro(eintrag) {
  const p = (eintrag.detail && eintrag.detail.price) || eintrag.price;
  if (!p || p.value == null) return { zahl: null, text: '–' };
  const wert = Number(p.value);
  const kurs = cfg.kurse[p.currency];
  if (p.currency === 'EUR') return { zahl: wert, text: `${wert.toFixed(2)} €` };
  if (!kurs) return { zahl: null, text: `${wert.toFixed(2)} ${p.currency} (kein Kurs)` };
  const eur = wert * kurs;
  return { zahl: eur, text: `~${eur.toFixed(2)} € (${wert.toFixed(2)} ${p.currency})` };
}

// ---- Größe ---------------------------------------------------------------

function groesse(eintrag) {
  const d = eintrag.detail || {};
  for (const a of d.localizedAspects || []) {
    if (/gr(ö|oe|o)(ß|ss)e|size|volume|inhalt|contenu|formato/i.test(a.name || '')) return a.value;
  }
  const t = `${eintrag.title || ''} ${d.title || ''}`;
  const m = t.match(/(\d{1,4})\s?(ml|ML|Ml)\b/);
  return m ? `${m[1]} ml` : 'unklar';
}

// ---- Versand nach Österreich --------------------------------------------

function versandAT(eintrag) {
  const d = eintrag.detail || {};
  const ein = d.shipToLocations && d.shipToLocations.regionIncluded;
  const aus = (d.shipToLocations && d.shipToLocations.regionExcluded) || [];
  if (!ein) return 'unklar';

  const gesperrt = aus.some((r) => r.regionId === cfg.zielland);
  if (gesperrt) return 'nein';

  const treffer = ein.some((r) =>
    r.regionId === cfg.zielland ||
    r.regionType === 'WORLDWIDE' ||
    (r.regionType === 'WORLD_REGION' && /europ/i.test(r.regionName || r.regionId || '')));
  if (treffer) return 'ja';

  // Versandoptionen als zweite Quelle
  const opt = d.shippingOptions || [];
  if (opt.some((o) => (o.shipToLocationUsedForEstimate || {}).country === cfg.zielland)) return 'ja';
  return 'nein';
}

// ---- Rückgabe, Verkäufer, Standort --------------------------------------

function rueckgabe(eintrag) {
  const r = (eintrag.detail || {}).returnTerms;
  if (!r) return 'unklar';
  if (r.returnsAccepted === false) return 'nein';
  const frist = r.returnPeriod ? `${r.returnPeriod.value} ${r.returnPeriod.unit === 'DAY' ? 'Tage' : r.returnPeriod.unit}` : '';
  const wer = r.returnShippingCostPayer === 'SELLER' ? ', Verkäufer zahlt' :
              r.returnShippingCostPayer === 'BUYER'  ? ', Käufer zahlt' : '';
  return `ja${frist ? ` (${frist}${wer})` : ''}`;
}

function verkaeufer(eintrag) {
  const s = (eintrag.detail || {}).seller || eintrag.seller;
  if (!s) return 'unklar';
  const teile = [];
  if (s.feedbackPercentage != null) teile.push(`${s.feedbackPercentage} %`);
  if (s.feedbackScore != null) teile.push(`${s.feedbackScore} Bew.`);
  return teile.length ? teile.join(' / ') : 'unklar';
}

function standort(eintrag) {
  const l = (eintrag.detail || {}).itemLocation || eintrag.itemLocation || {};
  return [l.city, l.stateOrProvince, l.country].filter(Boolean).join(', ') || 'unklar';
}

function zustand(eintrag) {
  return (eintrag.detail || {}).condition || eintrag.condition || 'unklar';
}

function land(eintrag) {
  const l = (eintrag.detail || {}).itemLocation || eintrag.itemLocation || {};
  return l.country || '';
}

// ---- Tabelle -------------------------------------------------------------

const KOPF = ['Angebot', 'Preis (EUR)', 'Größe', 'Zustand', 'Standort',
              'Verkäufer', 'Rückgabe', 'nach AT', 'ungeprüft'];

function zeile(eintrag, urteil) {
  const d = eintrag.detail || {};
  const url = d.itemWebUrl || eintrag.itemWebUrl || '';
  const titel = (d.title || eintrag.title || eintrag.itemId).replace(/\|/g, '\\|').slice(0, 70);
  const p = preisEuro(eintrag);
  return [
    `[${titel}](${url})`,
    p.text,
    groesse(eintrag),
    zustand(eintrag),
    standort(eintrag),
    verkaeufer(eintrag),
    rueckgabe(eintrag),
    versandAT(eintrag),
    urteil === 'ungeprueft' ? 'ja' : '',
  ];
}

// Sortierung: EU-Verkäufer zuerst, darin Preis aufsteigend.
function sortieren(liste) {
  return [...liste].sort((a, b) => {
    const euA = cfg.eu.includes(land(a)) ? 0 : 1;
    const euB = cfg.eu.includes(land(b)) ? 0 : 1;
    if (euA !== euB) return euA - euB;
    const pA = preisEuro(a).zahl, pB = preisEuro(b).zahl;
    if (pA == null && pB == null) return 0;
    if (pA == null) return 1;
    if (pB == null) return -1;
    return pA - pB;
  });
}

function markdown(eintraege, urteile) {
  const zeilen = [`| ${KOPF.join(' | ')} |`, `|${KOPF.map(() => '---').join('|')}|`];
  for (const e of sortieren(eintraege)) {
    zeilen.push(`| ${zeile(e, urteile[e.itemId]).join(' | ')} |`);
  }
  return zeilen.join('\n');
}

module.exports = { markdown, sortieren, preisEuro, groesse, versandAT, rueckgabe, verkaeufer, standort, land };
