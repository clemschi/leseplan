/* ============================================================
   Los geht's
   ============================================================ */
/* Liegt die Seite unter einer Adresse statt als Datei, meldet sie ihr
   Manifest an. Chrome legt sie dann als eigene App auf den Startbildschirm –
   ohne Browserleisten und damit ohne den Vollbild-Hinweis bei jedem Start.
   Aus einer Datei heraus (file://) ginge der Abruf ins Leere, darum erst
   hier und nicht im Kopf. */
if (location.protocol === 'http:' || location.protocol === 'https:') {
  const m = document.createElement('link');
  m.rel = 'manifest';
  m.href = 'mylife.webmanifest';
  document.head.appendChild(m);
}

$('#btnSuche').innerHTML = ICON.search;
$('#btnSuche').onclick = sucheOeffnen;
vollbildAutostart();
boot();




