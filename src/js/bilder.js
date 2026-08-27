/* ============================================================
   Bilder: aufnehmen, wählen, verkleinern
   ============================================================ */
const BILD_KANTE = 1600, BILD_QUALITAET = 0.75;

function bildVerkleinern(quelle) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const f = Math.min(1, BILD_KANTE / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', BILD_QUALITAET));
    };
    img.onerror = () => rej(new Error('Bild konnte nicht gelesen werden'));
    img.src = quelle;
  });
}
function dateiZuBild(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => bildVerkleinern(r.result).then(res, rej);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
function bilderWaehlen(onFertig) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const out = [];
    for (const f of Array.from(inp.files || [])) {
      try { out.push(await dateiZuBild(f)); } catch (e) { console.error(e); }
    }
    inp.remove();
    if (out.length) onFertig(out);
  };
  inp.click();
}
function kameraUeberDateidialog(onFertig) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment'; inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    inp.remove();
    if (!f) return;
    try { onFertig([await dateiZuBild(f)]); } catch (e) { toast('Foto konnte nicht verarbeitet werden.'); }
  };
  inp.click();
}

/* Live-Kamera in der Seite; wo die Umgebung sie verbietet, springt die Kamera-App ein. */
async function kameraOeffnen(onFertig) {
  let stream = null, hinten = true;
  const holen = async () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: hinten ? { ideal: 'environment' } : 'user', width: { ideal: 2400 } }, audio: false
    });
    return stream;
  };
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('keine Kamera-Schnittstelle');
    await holen();
  } catch (e) {
    console.warn('Live-Kamera nicht möglich:', e);
    kameraUeberDateidialog(onFertig);
    return;
  }

  const aufnahmen = [];
  const node = document.createElement('div');
  node.className = 'cam';
  node.innerHTML = `
    <video playsinline autoplay muted></video>
    <div class="cam-strip" data-strip hidden></div>
    <div class="cam-bar">
      <button class="cam-side" data-abbruch style="text-align:left">Abbrechen</button>
      <button class="cam-shutter" data-shot aria-label="Auslösen"></button>
      <button class="cam-side" data-fertig style="text-align:right;font-weight:600">Fertig</button>
    </div>`;
  const video = $('video', node);
  video.srcObject = stream;

  const schliessen = () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  layerOeffnen(node, schliessen);

  $('[data-shot]', node).onclick = async () => {
    const c = document.createElement('canvas');
    const f = Math.min(1, BILD_KANTE / Math.max(video.videoWidth, video.videoHeight));
    c.width = Math.round(video.videoWidth * f); c.height = Math.round(video.videoHeight * f);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', BILD_QUALITAET);
    aufnahmen.push(d);
    const strip = $('[data-strip]', node);
    strip.hidden = false;
    const im = document.createElement('img'); im.src = d; strip.appendChild(im);
    strip.scrollLeft = strip.scrollWidth;
  };
  $('[data-abbruch]', node).onclick = () => layerSchliessen();
  $('[data-fertig]', node).onclick = () => { layerSchliessen(); if (aufnahmen.length) onFertig(aufnahmen); };
}

function bildGross(bilder, start, onLoeschen) {
  let i = start || 0;
  const node = document.createElement('div');
  node.className = 'lightbox';
  node.innerHTML = `<img alt="Foto zur Notiz">
    <div class="lb-bar">
      <button class="btn btn-sm btn-ghost" data-prev>Zurück</button>
      <span class="num" data-zaehler></span>
      <span style="display:flex;gap:8px">
        ${onLoeschen ? `<button class="btn btn-sm btn-danger" data-del>${ICON.trash}</button>` : ''}
        <button class="btn btn-sm" data-next>Weiter</button>
        <button class="btn btn-sm btn-ghost" data-zu>Schließen</button>
      </span>
    </div>`;
  const malen = () => {
    $('img', node).src = bilder[i].src || bilder[i];
    $('[data-zaehler]', node).textContent = (i + 1) + ' / ' + bilder.length;
  };
  layerOeffnen(node);
  malen();
  $('[data-prev]', node).onclick = () => { i = (i - 1 + bilder.length) % bilder.length; malen(); };
  $('[data-next]', node).onclick = () => { i = (i + 1) % bilder.length; malen(); };
  $('[data-zu]', node).onclick = () => layerSchliessen();
  if (onLoeschen) $('[data-del]', node).onclick = () => { const w = bilder[i]; layerSchliessen(); onLoeschen(w); };
}

