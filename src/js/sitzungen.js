/* ============================================================
   Lese-Sitzungen: starten, beenden, laufende anzeigen
   ============================================================ */
/* „ersetzen“ heisst: der Start kommt aus einer offenen Ebene – der Buchauswahl.
   Die Kette Buchauswahl → Timer-Frage bleibt dann eine einzige Ebene mit
   einem einzigen Verlaufseintrag. Schliessen und im selben Zug wieder
   Öffnen brächte den Verlauf durcheinander. */
function sitzungStarten(buchId, ersetzen) {
  const b = buchById(buchId);
  if (!b) return;
  aendern(() => {
    DB.einstellungen.timer = { buchId, startTs: Date.now(), geweckt: false };
    if (b.status === 'offen') b.status = 'lese';
  });
  viewMalen();
  if (DB.einstellungen.timerFragen) timerFrageZeigen(b, ersetzen);
  else {
    if (ersetzen) layerSchliessen();
    toast('Sitzung läuft: ' + b.titel);
  }
}

/* Nach dem Start: Timer stellen – und wenn ja, wie lange? */
function timerFrageZeigen(buch, ersetzen) {
  const werte = [15, 25, 45, 60, 90];
  let wahl = DB.einstellungen.weckerMin || 45;

  const s = blatt('Timer stellen?', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:14px">
      Die Sitzung läuft${buch ? ': „' + esc(buch.titel) + '“' : ''}. Soll dich etwas erinnern?
    </p>
    <div style="display:flex;gap:7px;flex-wrap:wrap" data-w></div>
    <div class="field" style="margin-top:14px"><label>Eigener Wert in Minuten</label>
      <input type="number" data-eigen value="${wahl}" placeholder="45"></div>
    <p class="hinweis" style="padding:4px 0 12px">
      Der Wecker meldet sich, solange die leseliste geöffnet ist. Bei gesperrtem Bildschirm
      friert der Browser die Seite ein – dafür brauchst du den Timer deiner Uhr-App.
    </p>
    <div class="btn-row">
      <button class="btn btn-primary" data-ok style="flex:1">Timer stellen</button>
      <button class="btn" data-ohne style="flex:1">Ohne Timer</button>
    </div>
    <button class="btn btn-block btn-ghost btn-sm" style="margin-top:10px" data-nie>Nicht mehr fragen</button>`,
    { fokus: false, ersetzen: ersetzen });

  const malen = () => {
    $('[data-w]', s).innerHTML = werte.map(v =>
      `<button class="chip" data-v="${v}" aria-pressed="${wahl === v}">${v} min</button>`).join('');
    $$('[data-v]', s).forEach(x => x.onclick = () => { wahl = +x.dataset.v; $('[data-eigen]', s).value = wahl; malen(); });
  };
  malen();

  const stellen = () => {
    const eigen = num($('[data-eigen]', s).value);
    const min = eigen && eigen > 0 ? Math.round(eigen) : wahl;
    aendern(() => {
      DB.einstellungen.weckerMin = min;
      if (DB.einstellungen.timer) {
        DB.einstellungen.timer.geweckt = false;
        DB.einstellungen.timer.weckMin = min;
      }
    });
    layerSchliessen();
    viewMalen();
    toast('Wecker nach ' + pl(min, 'Minute', 'Minuten') + '.');
  };

  $('[data-ok]', s).onclick = stellen;
  $('[data-ohne]', s).onclick = () => {
    aendern(() => { DB.einstellungen.weckerMin = null; });
    layerSchliessen(); viewMalen();
    toast('Sitzung läuft ohne Timer.');
  };
  $('[data-nie]', s).onclick = () => {
    aendern(() => { DB.einstellungen.timerFragen = false; });
    layerSchliessen();
    toast('Wird nicht mehr gefragt. Unter „Mehr“ wieder einschaltbar.');
  };
}

/* Pause und Weiter. Beim Weitermachen rückt der Startzeitpunkt um die Dauer
   der Pause nach vorn – die Uhr macht dort weiter, wo sie stehen blieb, und
   der Wecker rechnet die Pause nicht mit. */
function sitzungPause() {
  const t = laufenderTimer();
  if (!t) return;
  aendern(() => {
    if (t.pauseTs) { t.startTs += Date.now() - t.pauseTs; t.pauseTs = 0; }
    else t.pauseTs = Date.now();
  });
  Store.sichern(true);
  const jetztPause = timerPausiert(laufenderTimer());
  nowbarMalen();
  toast(jetztPause ? 'Pausiert.' : 'Weiter.');
  return jetztPause;
}

function sitzungBeenden() {
  const t = laufenderTimer();
  if (!t) return;
  const b = buchById(t.buchId);
  /* timerMinuten zählt die Pause ohnehin nicht mit. */
  const minuten = Math.max(1, Math.round(timerMinuten(t)));
  aendern(() => { DB.einstellungen.timer = null; });
  clearInterval(uhrTick);
  viewMalen();
  if (!b) return;
  const stand = b.sessions.reduce((m, s) => Math.max(m, s.bis || 0), 0);
  sessionBearbeiten(b, null, { minuten, von: stand || null }, () => viewMalen(), true);
}

function buchWaehlenFuerSitzung() {
  const angefangen = DB.buecher.filter(b => b.status === 'lese');
  const offen = DB.buecher.filter(b => b.status !== 'gelesen');
  if (!offen.length) { toast('Kein offenes Buch in der Liste.'); return; }
  let nurAngefangene = angefangen.length > 0;

  const s = blatt(nurAngefangene ? 'Woran liest du gerade?' : 'Welches Buch?', `
    <input type="text" data-q placeholder="Titel oder Autor suchen" autocomplete="off">
    <div class="list-card" style="margin-top:12px;max-height:52vh;overflow-y:auto" data-l></div>
    ${angefangen.length ? '<button class="btn btn-block btn-ghost btn-sm" style="margin-top:10px" data-alle></button>' : ''}`,
    { fokus: false });

  const malen = () => {
    const q = $('[data-q]', s).value.trim().toLowerCase();
    const kandidaten = nurAngefangene ? angefangen : offen;
    const treffer = kandidaten
      .filter(b => !q || (b.titel + ' ' + b.autor).toLowerCase().includes(q))
      .sort((a, b) => (a.status === 'lese' ? 0 : 1) - (b.status === 'lese' ? 0 : 1));
    const knopf = $('[data-alle]', s);
    if (knopf) {
      knopf.textContent = nurAngefangene ? 'Alle offenen Bücher zeigen (' + offen.length + ')' : 'Nur angefangene zeigen (' + angefangen.length + ')';
      knopf.onclick = () => { nurAngefangene = !nurAngefangene; malen(); };
    }
    const l = $('[data-l]', s);
    l.innerHTML = treffer.length ? '' : '<div class="hinweis" style="padding:14px">Kein Treffer.</div>';
    treffer.slice(0, 60).forEach(b => {
      const r = document.createElement('button');
      r.className = 'rowline';
      r.style.cssText = 'width:100%;text-align:left';
      r.innerHTML = `<span class="grow">
          <span class="rn serif">${esc(b.titel)}</span>
          <span class="rm">${esc(b.autor)}${b.status === 'lese' ? ' · lese ich' : ''}</span>
        </span><span class="chev">${ICON.chev}</span>`;
      r.onclick = () => sitzungStarten(b.id, true);
      l.appendChild(r);
    });
  };
  let t;
  $('[data-q]', s).oninput = () => { clearTimeout(t); t = setTimeout(malen, 150); };
  malen();
}

/* Lese-Wecker: meldet sich, wenn die eingestellte Zeit erreicht ist. */
function piepsen() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    [0, 0.35].forEach(v => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + v);
      g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + v + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + v + 0.28);
      o.start(ctx.currentTime + v);
      o.stop(ctx.currentTime + v + 0.3);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) { } }, 1200);
  } catch (e) { }
}

function wecken(buch, minuten) {
  if (navigator.vibrate) { try { navigator.vibrate([220, 120, 220, 120, 420]); } catch (e) { } }
  piepsen();
  try {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification(minuten + ' Minuten gelesen', { body: buch ? buch.titel : '', tag: 'leseliste-wecker' });
    }
  } catch (e) { }
  const s = blatt(minuten + ' Minuten gelesen', `
    <p class="muted" style="font-size:13.5px;line-height:1.6;margin-bottom:16px">
      ${buch ? '„' + esc(buch.titel) + '“ – ' : ''}die eingestellte Zeit ist um. Die Stoppuhr läuft weiter, bis du sie beendest.
    </p>
    <div class="btn-row">
      <button class="btn btn-primary" data-weiter style="flex:1">Weiterlesen</button>
      <button class="btn" data-stop style="flex:1">Sitzung beenden</button>
    </div>
    <button class="btn btn-block btn-ghost btn-sm" style="margin-top:10px" data-nochmal>Noch einmal ${minuten} Minuten</button>`,
    { fokus: false });
  $('[data-nochmal]', s).onclick = () => {
    const t = laufenderTimer();
    /* Die Startzeit bleibt stehen – sonst wäre die bisherige Lesezeit weg.
       Verschoben wird nur die Marke, ab der wieder geweckt wird. */
    if (t) aendern(() => { t.geweckt = false; t.weckMin = Math.round(timerMinuten(t)) + minuten; });
    layerSchliessen();
    viewMalen();
    toast('Weiter für ' + minuten + ' Minuten.');
  };
  $('[data-weiter]', s).onclick = () => layerSchliessen();
  $('[data-stop]', s).onclick = () => { layerSchliessen(); setTimeout(sitzungBeenden, 80); };
}

function weckerBearbeiten(nachher) {
  const werte = [15, 25, 45, 60, 90];
  const s = blatt('Lese-Wecker', `
    <p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:12px">
      Meldet sich während einer laufenden Sitzung mit Ton und Vibration. Dafür muss die leseliste geöffnet bleiben.
    </p>
    <div style="display:flex;gap:7px;flex-wrap:wrap" data-w></div>
    <div class="field" style="margin-top:14px"><label>Eigener Wert in Minuten</label>
      <input type="number" data-eigen value="${DB.einstellungen.weckerMin || ''}" placeholder="45"></div>
    <button class="btn btn-primary btn-block" data-ok>Sichern</button>`, { fokus: false });

  let wahl = DB.einstellungen.weckerMin || null;
  const malen = () => {
    $('[data-w]', s).innerHTML = werte.map(v =>
      `<button class="chip" data-v="${v}" aria-pressed="${wahl === v}">${v} min</button>`).join('') +
      `<button class="chip" data-v="0" aria-pressed="${!wahl}">aus</button>`;
    $$('[data-v]', s).forEach(x => x.onclick = () => {
      wahl = +x.dataset.v || null;
      $('[data-eigen]', s).value = wahl || '';
      malen();
    });
  };
  malen();
  $('[data-ok]', s).onclick = () => {
    const eigen = num($('[data-eigen]', s).value);
    const v = eigen && eigen > 0 ? Math.round(eigen) : wahl;
    aendern(() => { DB.einstellungen.weckerMin = v || null; });
    if (v && window.Notification && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch (e) { }
    }
    layerSchliessen();
    viewMalen();
    if (nachher) nachher();
    toast(v ? 'Wecker nach ' + v + ' Minuten.' : 'Wecker aus.');
  };
}

let nowTick = null;
/* Die Tableiste ist im Vollbild höher – ihre Höhe wird gemessen, nicht geraten. */
function leistenHoeheMessen() {
  /* Es gibt zwei Leisten in dieser Datei – gemessen wird die der offenen App. */
  const tb = Array.from(document.querySelectorAll('.tabbar'))
    .find(x => x.getBoundingClientRect().height > 0);
  if (!tb) return;
  const h = Math.round(tb.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty('--tabh', h + 'px');
}
window.addEventListener('resize', leistenHoeheMessen);
document.addEventListener('fullscreenchange', () => setTimeout(leistenHoeheMessen, 60));
document.addEventListener('webkitfullscreenchange', () => setTimeout(leistenHoeheMessen, 60));

function nowbarMalen() {
  leistenHoeheMessen();
  const bar = $('#nowbar'), inner = $('#nowbarInner');
  if (!bar) return;
  clearInterval(nowTick);
  if (!DB.buecher.length) {
    bar.hidden = true;
    document.body.classList.remove('hat-nowbar');
    return;
  }
  bar.hidden = false;
  document.body.classList.add('hat-nowbar');
  const t = laufenderTimer();
  /* Was heute noch fehlt – rechnet sich aus den Sitzungen des Tages. */
  const z = zielHeute();
  const rest = z.ziel ? Math.max(0, z.ziel - z.gelesen) : 0;

  if (t) {
    const b = buchById(t.buchId);
    const ruht = timerPausiert(t);
    inner.className = 'nowbar-inner laeuft' + (ruht ? ' ruht' : '');
    inner.innerHTML = `
      <span class="grow">
        <span class="nt serif">${esc(b ? b.titel : 'Sitzung')}</span>
        <span class="nm">${ruht ? 'pausiert'
      : 'Sitzung läuft' + (z.ziel ? ' · ' + (rest ? 'heute noch ' + rest + ' S.' : 'Ziel geschafft') : '')}</span>
      </span>
      <span class="uhr" data-uhr>00:00</span>
      <button class="btn btn-sm nb-pause" data-pause aria-label="${ruht ? 'Weiterlesen' : 'Pause'}"
        title="${ruht ? 'Weiterlesen' : 'Pause'}">${ruht ? ICON.play : ICON.pause}</button>
      <button class="btn btn-sm" data-wecker title="Lese-Wecker">${DB.einstellungen.weckerMin ? DB.einstellungen.weckerMin + '′' : '⏰'}</button>
      <button class="btn btn-sm" data-stop>Beenden</button>`;
    const malen = () => {
      const el = $('[data-uhr]', inner);
      if (!el) return;
      const sek = Math.floor(timerVerstrichen(t) / 1000);
      const teile = sek >= 3600
        ? [Math.floor(sek / 3600), Math.floor(sek / 60) % 60, sek % 60]
        : [Math.floor(sek / 60), sek % 60];
      el.textContent = teile.map(x => String(x).padStart(2, '0')).join(':');
      const w = +t.weckMin || +DB.einstellungen.weckerMin || 0;
      if (w && !t.geweckt && sek >= w * 60) {
        aendern(() => { t.geweckt = true; });
        wecken(buchById(t.buchId), +DB.einstellungen.weckerMin || w);
      }
    };
    malen();
    /* In der Pause steht die Uhr – kein Ticken, kein Wecker. */
    if (!ruht) nowTick = setInterval(malen, 1000);
    $('[data-stop]', inner).onclick = sitzungBeenden;
    $('[data-pause]', inner).onclick = () => { sitzungPause(); if (aktiverTab === 'plan') viewMalen(); };
    $('[data-wecker]', inner).onclick = () => timerFrageZeigen(b);
    if (b) $('.grow', inner).onclick = () => buchOeffnen(b.id);
  } else {
    const lese = DB.buecher.filter(b => b.status === 'lese');
    const eines = lese.length === 1 ? lese[0] : null;
    const kopf = !z.ziel ? 'Heute noch kein Ziel'
      : rest ? 'Heute noch ' + rest + ' Seiten zu lesen'
        : 'Tagesziel geschafft';
    const unten = !z.ziel ? 'Tagesziel setzen'
      : eines ? esc(eines.titel)
        : (lese.length > 1 ? lese.length + ' Bücher angefangen' : 'Buch wählen');
    inner.className = 'nowbar-inner' + (z.ziel && !rest ? ' fertig' : '');
    inner.innerHTML = `
      <span class="grow">
        <span class="nt serif">${esc(kopf)}</span>
        <span class="nm">${unten}</span>
      </span>
      <button class="btn btn-sm btn-primary" data-start>${ICON.play} Starten</button>`;
    $('[data-start]', inner).onclick = () => eines ? sitzungStarten(eines.id) : buchWaehlenFuerSitzung();
    /* Ohne Tagesziel führt die Zeile dorthin, wo eines gesetzt wird. */
    $('.grow', inner).onclick = () => !z.ziel ? zielBearbeiten(() => nowbarMalen())
      : eines ? buchOeffnen(eines.id) : buchWaehlenFuerSitzung();
  }
}

