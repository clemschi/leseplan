/* ============================================================
   Prognose – aus einem gelaufenen Ergebnis auf andere Distanzen
   Nach jedem Test wird die Schätzung schärfer: gerechnet wird mit
   Riegel (T₂ = T₁ · (D₂/D₁)^1,06), der Standardformel für
   Zeitvergleiche zwischen Distanzen.

   Eine Ausnahme: der Marathon. Riegel unterschätzt ihn bei einem
   Erstmarathon mit drei Einheiten die Woche deutlich – dort wird
   die Halbmarathonzeit mit einem Faktor genommen (2,2–2,3), so wie
   es im Auftrag steht. Der Faktor kommt aus den Daten, nicht von hier.

   An keine App gebunden: rein und raus gehen Sekunden.
   ============================================================ */

/* "28:32", "1:53:07", "26:00" → Sekunden. Was nicht passt, gibt null. */
function zeitLesen(text) {
  const t = String(text || '').trim().replace(',', ':');
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const std = +(m[1] || 0), min = +m[2], sek = +m[3];
  if (min > 59 || sek > 59) return null;
  const s = std * 3600 + min * 60 + sek;
  return s > 0 ? s : null;
}
function zeitText(sek) {
  const s = Math.round(sek);
  const std = Math.floor(s / 3600), min = Math.floor(s % 3600 / 60), r = s % 60;
  return std ? std + ':' + String(min).padStart(2, '0') + ':' + String(r).padStart(2, '0')
    : min + ':' + String(r).padStart(2, '0');
}
/* Sekunden je Kilometer → "5:41" */
function paceText(sekProKm) {
  const s = Math.round(sekProKm);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/* Riegel: dieselbe Form, andere Distanz. */
function riegel(sek, vonKm, nachKm, exponent) {
  if (!(sek > 0) || !(vonKm > 0) || !(nachKm > 0)) return null;
  return sek * Math.pow(nachKm / vonKm, exponent || 1.06);
}

/* Aus einem Ergebnis die Zeit für eine Zieldistanz.
   marathonFaktor greift nur, wenn die Zieldistanz ein Marathon ist. */
function hochrechnen(sek, vonKm, zielKm, cfg) {
  const exp = (cfg && cfg.exponent) || 1.06;
  const faktor = (cfg && cfg.marathonFaktor) || 2.25;
  if (zielKm >= 42) {
    const hm = riegel(sek, vonKm, 21.0975, exp);
    return hm == null ? null : hm * faktor;
  }
  return riegel(sek, vonKm, zielKm, exp);
}
