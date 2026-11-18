'use strict';
/* PWA Lab · mostra tutto ciò che una PWA può fare su iOS 27.2 */

const $ = (s, r = document) => r.querySelector(s);
const j = (o) => JSON.stringify(o, null, 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

const app = $('#app');
const navItems = [];

function card(id, title, desc, build) {
  const out = h('pre', { class: 'out', hidden: true, 'aria-live': 'polite' });
  const box = h('div', { class: 'row' });
  const sec = h('section', { class: 'card', id }, h('h2', null, title), desc ? h('p', { class: 'desc' }, desc) : null, box, out);
  const log = (m) => { out.hidden = false; out.textContent = String(m); };
  const logAdd = (m) => { out.hidden = false; out.textContent += (out.textContent ? '\n' : '') + m; };
  const act = (label, fn, cls = '') => h('button', {
    class: 'btn ' + cls, type: 'button',
    onclick: async () => {
      try { await fn(); } catch (e) { log('❌ ' + (e.name || 'Errore') + ': ' + (e.message || e)); }
    }
  }, label);
  const add = (...n) => box.append(...n.flat().filter(Boolean));
  const block = (...n) => sec.insertBefore(h('div', { class: 'row' }, ...n.flat().filter(Boolean)), out);
  app.append(sec);
  navItems.push([id, title.replace(/^\S+\s/, '')]);
  try { build({ log, logAdd, act, add, block, sec, out }); }
  catch (e) { log('❌ Errore di inizializzazione: ' + e.message); }
  return sec;
}

/* ------------------------------------------------------------------ */
/* Modalità installazione                                              */
/* ------------------------------------------------------------------ */
const modeChip = $('#mode');
modeChip.textContent = standalone ? 'App installata' : 'In Safari';
if (!standalone) modeChip.classList.add('warn');

if (!standalone) {
  app.append(h('section', { class: 'banner' },
    h('h2', null, '📲 Installa l’app per sbloccare tutto'),
    h('p', { class: 'desc' }, 'Notifiche push, badge e wake lock affidabili funzionano solo se l’app è sulla Home. Safari su iOS non mostra un prompt di installazione.'),
    h('ol', null,
      h('li', null, 'Tocca il pulsante Condividi (quadrato con freccia).'),
      h('li', null, 'Scegli “Aggiungi alla schermata Home”.'),
      h('li', null, 'Lascia attivo “Apri come web app” e tocca Aggiungi.'),
      h('li', null, 'Apri l’icona “PWA Lab” dalla Home.')
    )
  ));
}

/* ------------------------------------------------------------------ */
/* Matrice delle funzioni disponibili                                  */
/* ------------------------------------------------------------------ */
const T = (fn) => { try { return !!fn(); } catch { return false; } };
const capGroups = {
  'App e installazione': [
    ['Service Worker', () => 'serviceWorker' in navigator],
    ['Web App Manifest in uso', () => standalone, 'Vero solo dopo “Aggiungi alla Home”'],
    ['Navigation API', () => 'navigation' in window],
    ['View Transitions', () => 'startViewTransition' in document],
    ['Cookie Store API', () => 'cookieStore' in window],
    ['Web Locks', () => 'locks' in navigator],
    ['BroadcastChannel', () => 'BroadcastChannel' in window],
  ],
  'Notifiche': [
    ['Notification API', () => 'Notification' in window, 'Utilizzabile nell’app installata'],
    ['Push API', () => 'PushManager' in window],
    ['Badging API', () => 'setAppBadge' in navigator],
  ],
  'Sensori e posizione': [
    ['Geolocalizzazione', () => 'geolocation' in navigator],
    ['DeviceMotion', () => 'DeviceMotionEvent' in window],
    ['DeviceOrientation', () => 'DeviceOrientationEvent' in window],
    ['Fotocamera / microfono', () => navigator.mediaDevices && navigator.mediaDevices.getUserMedia],
    ['MediaRecorder', () => 'MediaRecorder' in window],
    ['Screen Wake Lock', () => 'wakeLock' in navigator],
    ['Screen Orientation (lettura)', () => screen.orientation && screen.orientation.type],
    ['Blocco orientamento', () => screen.orientation && screen.orientation.lock, 'Non disponibile su iPhone'],
  ],
  'Sistema e condivisione': [
    ['Web Share', () => 'share' in navigator],
    ['Condivisione file', () => navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.txt', { type: 'text/plain' })] })],
    ['Clipboard (testo)', () => navigator.clipboard && navigator.clipboard.writeText],
    ['Clipboard (immagini)', () => 'ClipboardItem' in window],
    ['Vibration API', () => 'vibrate' in navigator, 'Assente: si usa l’aptica dello switch'],
    ['Aptica via <input switch>', () => 'ontouchstart' in window],
    ['Contact Picker', () => 'contacts' in navigator],
    ['Fullscreen API', () => document.fullscreenEnabled || document.webkitFullscreenEnabled, 'Solo video su iPhone'],
  ],
  'Voce e audio': [
    ['Sintesi vocale', () => 'speechSynthesis' in window],
    ['Riconoscimento vocale', () => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window],
    ['Web Audio', () => window.AudioContext || window.webkitAudioContext],
    ['Media Session', () => 'mediaSession' in navigator],
    ['Picture-in-Picture', () => document.pictureInPictureEnabled || HTMLVideoElement.prototype.webkitSetPresentationMode],
    ['AirPlay', () => 'WebKitPlaybackTargetAvailabilityEvent' in window],
  ],
  'Dati e sicurezza': [
    ['IndexedDB', () => 'indexedDB' in window],
    ['Cache API', () => 'caches' in window],
    ['OPFS (file system privato)', () => navigator.storage && navigator.storage.getDirectory],
    ['Storage persistente', () => navigator.storage && navigator.storage.persist],
    ['File System Access (picker)', () => 'showOpenFilePicker' in window, 'Non in Safari'],
    ['WebAuthn / Passkey', () => 'PublicKeyCredential' in window],
    ['Apple Pay', () => 'ApplePaySession' in window],
    ['Payment Request', () => 'PaymentRequest' in window],
    ['Compression Streams', () => 'CompressionStream' in window],
  ],
  'Grafica e calcolo': [
    ['WebGL 2', () => document.createElement('canvas').getContext('webgl2')],
    ['WebGPU', () => 'gpu' in navigator],
    ['WebAssembly', () => 'WebAssembly' in window],
    ['Web Worker', () => 'Worker' in window],
    ['OffscreenCanvas', () => 'OffscreenCanvas' in window],
    ['Elemento <model> (iOS 27)', () => 'HTMLModelElement' in window],
    ['<select> personalizzabile (iOS 27)', () => CSS.supports('appearance', 'base-select')],
  ],
  'Non supportate su iOS': [
    ['Web Bluetooth', () => 'bluetooth' in navigator],
    ['WebUSB', () => 'usb' in navigator],
    ['Web NFC', () => 'NDEFReader' in window],
    ['Web Serial', () => 'serial' in navigator],
    ['WebHID', () => 'hid' in navigator],
    ['Background Sync', () => 'SyncManager' in window],
    ['Periodic Background Sync', () => 'PeriodicSyncManager' in window],
    ['Battery Status', () => 'getBattery' in navigator],
    ['Network Information', () => 'connection' in navigator],
    ['BarcodeDetector', () => 'BarcodeDetector' in window],
    ['EyeDropper', () => 'EyeDropper' in window],
  ],
};

card('caps', '✅ Funzioni rilevate', 'Test eseguito in questo momento sul tuo dispositivo.', ({ sec, out }) => {
  out.remove();
  let yes = 0, no = 0;
  const groups = h('div', null);
  for (const [group, items] of Object.entries(capGroups)) {
    const ul = h('ul', { class: 'caps' });
    for (const [name, fn, note] of items) {
      const ok = T(fn);
      ok ? yes++ : no++;
      ul.append(h('li', null,
        h('span', null, name, note ? h('small', null, note) : null),
        h('span', { class: 'st ' + (ok ? 'ok' : 'no') }, ok ? '✓ sì' : '✗ no')));
    }
    groups.append(h('h3', { style: 'margin:1rem 0 .25rem;font-size:.95rem' }, group), ul);
  }
  sec.append(h('div', { class: 'summary' }, h('span', { class: 'chip' }, yes + ' disponibili'), h('span', { class: 'chip' }, no + ' non disponibili')), groups);
});

/* ------------------------------------------------------------------ */
/* Dispositivo                                                         */
/* ------------------------------------------------------------------ */
function safeInsets() {
  const p = h('div', { style: 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' });
  document.body.append(p);
  const cs = getComputedStyle(p);
  const r = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' ');
  p.remove();
  return r;
}

card('device', '📱 Dispositivo e schermo', 'Cosa il browser può leggere. iOS nasconde modello, IMEI, batteria e identificatori.', ({ log, act, add }) => {
  const show = () => log(j({
    userAgent: navigator.userAgent,
    piattaforma: navigator.platform,
    lingue: navigator.languages,
    fusoOrario: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendario: Intl.DateTimeFormat().resolvedOptions().calendar,
    schermo: screen.width + '×' + screen.height + ' @' + devicePixelRatio + 'x',
    viewport: innerWidth + '×' + innerHeight,
    areeSicure_top_dx_bas_sx: safeInsets(),
    orientamento: (screen.orientation && screen.orientation.type) || (innerWidth > innerHeight ? 'landscape' : 'portrait'),
    coreCPU: navigator.hardwareConcurrency,
    puntiTocco: navigator.maxTouchPoints,
    modalita: standalone ? 'app installata (standalone)' : 'scheda di Safari',
    temaScuro: matchMedia('(prefers-color-scheme: dark)').matches,
    riduciMovimento: matchMedia('(prefers-reduced-motion: reduce)').matches,
    altoContrasto: matchMedia('(prefers-contrast: more)').matches,
    gamutP3: matchMedia('(color-gamut: p3)').matches,
    hdr: matchMedia('(dynamic-range: high)').matches,
    hover: matchMedia('(hover: hover)').matches,
    online: navigator.onLine,
    cookie: navigator.cookieEnabled,
    contestoSicuro: isSecureContext,
    sicuroCrossOriginIsolated: crossOriginIsolated
  }));
  add(act('Aggiorna', show));
  show();
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(show, 200); });
});

/* ------------------------------------------------------------------ */
/* Posizione                                                           */
/* ------------------------------------------------------------------ */
card('geo', '📍 Posizione', 'Geolocalizzazione con permesso. Funziona solo con l’app in primo piano.', ({ log, act, add }) => {
  let watchId = null;
  const fmt = (p) => {
    const c = p.coords;
    return j({
      latitudine: c.latitude, longitudine: c.longitude,
      precisioneMetri: Math.round(c.accuracy), altitudine: c.altitude,
      velocitaMs: c.speed, direzione: c.heading,
      ora: new Date(p.timestamp).toLocaleTimeString(),
      mappa: 'https://maps.apple.com/?ll=' + c.latitude + ',' + c.longitude
    });
  };
  const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
  add(
    act('Posizione attuale', () => new Promise((res, rej) => {
      log('Attendo il GPS…');
      navigator.geolocation.getCurrentPosition((p) => { log(fmt(p)); res(); }, (e) => rej(new Error(e.message)), opts);
    })),
    act('Segui', () => {
      if (watchId != null) return;
      watchId = navigator.geolocation.watchPosition((p) => log(fmt(p)), (e) => log('❌ ' + e.message), opts);
      log('Tracciamento attivo…');
    }, 'alt'),
    act('Ferma', () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      watchId = null; log('Tracciamento fermato.');
    }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Sensori di movimento                                                */
/* ------------------------------------------------------------------ */
card('motion', '🧭 Movimento e bussola', 'Accelerometro, giroscopio e orientamento. iOS chiede un permesso esplicito.', ({ log, act, add, block }) => {
  const dot = h('div', { class: 'dot' });
  const level = h('div', { class: 'level' }, dot);
  const compass = h('div', { class: 'compass' }, '—');
  block(level);
  block(compass);
  let on = false;
  const last = { o: null, m: null };
  let raf = null;
  const onO = (e) => { last.o = e; };
  const onM = (e) => { last.m = e; };
  const render = () => {
    const o = last.o, m = last.m;
    if (o) {
      const x = Math.max(-45, Math.min(45, o.gamma || 0)) / 45 * 66;
      const y = Math.max(-45, Math.min(45, o.beta || 0)) / 45 * 66;
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      const heading = o.webkitCompassHeading != null ? o.webkitCompassHeading : (o.alpha != null ? 360 - o.alpha : null);
      compass.textContent = heading != null ? Math.round(heading) + '°' : '—';
    }
    log(j({
      orientamento: o ? { alpha: r1(o.alpha), beta: r1(o.beta), gamma: r1(o.gamma), bussola: o.webkitCompassHeading != null ? r1(o.webkitCompassHeading) : null } : null,
      accelerazioneConG: m && m.accelerationIncludingGravity ? { x: r1(m.accelerationIncludingGravity.x), y: r1(m.accelerationIncludingGravity.y), z: r1(m.accelerationIncludingGravity.z) } : null,
      rotazione: m && m.rotationRate ? { alpha: r1(m.rotationRate.alpha), beta: r1(m.rotationRate.beta), gamma: r1(m.rotationRate.gamma) } : null
    }));
    raf = requestAnimationFrame(render);
  };
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
  const start = async () => {
    if (on) return;
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      if ((await DeviceMotionEvent.requestPermission()) !== 'granted') throw new Error('Permesso negato (Impostazioni → Safari → Movimento e orientamento)');
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission();
    }
    addEventListener('deviceorientation', onO);
    addEventListener('devicemotion', onM);
    on = true; raf = requestAnimationFrame(render);
  };
  const stop = () => {
    removeEventListener('deviceorientation', onO);
    removeEventListener('devicemotion', onM);
    cancelAnimationFrame(raf); on = false; log('Sensori fermati.');
  };
  add(act('Avvia sensori', start), act('Ferma', stop, 'alt'));
});

/* ------------------------------------------------------------------ */
/* Fotocamera                                                          */
/* ------------------------------------------------------------------ */
card('camera', '📷 Fotocamera', 'Anteprima live, scatto foto, cambio fotocamera e condivisione.', ({ log, logAdd, act, add, block }) => {
  const video = h('video', { playsinline: true, muted: true, autoplay: true, hidden: true });
  const canvas = h('canvas', { class: 'preview', hidden: true });
  const facing = h('select', null, h('option', { value: 'environment' }, 'Posteriore'), h('option', { value: 'user' }, 'Anteriore'));
  let stream = null;
  const stop = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; video.hidden = true; video.srcObject = null; };
  const start = async () => {
    stop();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing.value }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream; video.hidden = false; await video.play();
    const s = stream.getVideoTracks()[0].getSettings();
    log(j({ risoluzione: s.width + '×' + s.height, fps: s.frameRate, fotocamera: stream.getVideoTracks()[0].label, caratteristiche: Object.keys(navigator.mediaDevices.getSupportedConstraints()) }));
  };
  const snap = async () => {
    if (!stream) throw new Error('Avvia prima la fotocamera');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.hidden = false;
    logAdd('Foto scattata: ' + canvas.width + '×' + canvas.height);
  };
  const toBlob = () => new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
  add(facing);
  block(video, canvas);
  block(
    act('Avvia', start),
    act('Scatta', snap),
    act('Condividi foto', async () => {
      if (canvas.hidden) throw new Error('Scatta prima una foto');
      const f = new File([await toBlob()], 'foto.jpg', { type: 'image/jpeg' });
      await navigator.share({ files: [f], title: 'Foto da PWA Lab' });
    }, 'alt'),
    act('Ferma', stop, 'alt')
  );
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
});

/* ------------------------------------------------------------------ */
/* Microfono e registrazione                                           */
/* ------------------------------------------------------------------ */
card('mic', '🎙️ Microfono', 'Livello in tempo reale e registrazione di 5 secondi.', ({ log, logAdd, act, add, block }) => {
  const meter = h('div', { class: 'meter' }, h('i'));
  const player = h('audio', { controls: true, hidden: true });
  let ctx = null, stream = null, raf = null;
  const stop = () => {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (ctx) ctx.close();
    stream = ctx = null; meter.firstChild.style.width = '0';
  };
  const start = async () => {
    stop();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    await ctx.resume();
    const an = ctx.createAnalyser(); an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);
    const data = new Uint8Array(an.fftSize);
    const tick = () => {
      an.getByteTimeDomainData(data);
      let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      meter.firstChild.style.width = Math.min(100, peak / 128 * 220) + '%';
      raf = requestAnimationFrame(tick);
    };
    tick(); log('Microfono attivo: parla.');
  };
  const record = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(s, type ? { mimeType: type } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(); log('● Registro per 5 secondi… (formato ' + (rec.mimeType || 'default') + ')');
    await sleep(5000); rec.stop(); await done;
    s.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: rec.mimeType });
    player.src = URL.createObjectURL(blob); player.hidden = false;
    logAdd('Fatto: ' + Math.round(blob.size / 1024) + ' KB');
  };
  block(meter, player);
  add(act('Mostra livello', start), act('Registra 5 s', record), act('Ferma', stop, 'alt'));
});

/* ------------------------------------------------------------------ */
/* Voce                                                                */
/* ------------------------------------------------------------------ */
card('speech', '🗣️ Voce', 'Lettura ad alta voce e dettatura. La dettatura richiede Siri e Dettatura attivi.', ({ log, act, add, block }) => {
  const text = h('textarea', null, 'Ciao! Questa è una PWA che parla dal tuo iPhone.');
  text.value = 'Ciao! Questa è una PWA che parla dal tuo iPhone.';
  const voices = h('select');
  const fill = () => {
    const list = speechSynthesis.getVoices().sort((a, b) => (a.lang.startsWith('it') ? -1 : 0) - (b.lang.startsWith('it') ? -1 : 0));
    voices.replaceChildren(...list.map((v, i) => h('option', { value: i }, v.name + ' (' + v.lang + ')')));
    voices._list = list;
  };
  if ('speechSynthesis' in window) { fill(); speechSynthesis.addEventListener('voiceschanged', fill); }
  const speak = () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.value);
    const v = voices._list && voices._list[voices.value];
    if (v) { u.voice = v; u.lang = v.lang; }
    speechSynthesis.speak(u);
  };
  let rec = null;
  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) throw new Error('Riconoscimento vocale non disponibile');
    rec = new SR(); rec.lang = 'it-IT'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => log('🎤 ' + Array.from(e.results).map((r) => r[0].transcript).join(' '));
    rec.onerror = (e) => log('❌ ' + e.error);
    rec.onend = () => { if (!$('#speech .out').textContent) log('Nessun parlato rilevato.'); };
    log(''); rec.start();
    log('Ascolto… parla in italiano.');
  };
  block(text);
  block(voices);
  add(act('Leggi', speak), act('Stop lettura', () => speechSynthesis.cancel(), 'alt'), act('Detta', listen), act('Ferma dettatura', () => rec && rec.stop(), 'alt'));
});

/* ------------------------------------------------------------------ */
/* Notifiche e badge                                                   */
/* ------------------------------------------------------------------ */
const urlB64 = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
let swReg = null;
const swReady = () => (swReg ? Promise.resolve(swReg) : navigator.serviceWorker.ready.then((r) => (swReg = r)));

card('notif', '🔔 Notifiche, push e badge', 'Richiedono l’app installata sulla Home (iOS 16.4+). Le notifiche push remote hanno bisogno di un tuo server.', ({ log, logAdd, act, add, block }) => {
  let count = 0;
  const vapid = h('input', { type: 'text', placeholder: 'Chiave pubblica VAPID (base64url) per le push remote', autocapitalize: 'off', autocorrect: 'off' });
  const state = () => log(j({
    permesso: 'Notification' in window ? Notification.permission : 'non supportato',
    appInstallata: standalone,
    push: 'PushManager' in window,
    badge: 'setAppBadge' in navigator
  }));
  add(
    act('Stato', state),
    act('Chiedi permesso', async () => { const r = await Notification.requestPermission(); log('Permesso: ' + r); }),
    act('Notifica locale', async () => {
      if (Notification.permission !== 'granted') throw new Error('Concedi prima il permesso');
      const reg = await swReady();
      await reg.showNotification('PWA Lab', { body: 'Notifica locale dal service worker 🎉', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'demo', data: { url: './' } });
      log('Notifica inviata.');
    }),
    act('Badge +1', async () => { count++; await navigator.setAppBadge(count); log('Badge: ' + count); }, 'alt'),
    act('Azzera badge', async () => { count = 0; await navigator.clearAppBadge(); log('Badge azzerato.'); }, 'alt')
  );
  block(vapid);
  block(act('Iscriviti alle push', async () => {
    if (!standalone) throw new Error('Installa prima l’app sulla Home');
    if (!vapid.value.trim()) throw new Error('Inserisci la chiave VAPID pubblica');
    if (Notification.permission !== 'granted') await Notification.requestPermission();
    const reg = await swReady();
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(vapid.value.trim()) });
    log('Sottoscrizione (invia questo JSON al tuo server):\n' + j(sub.toJSON()));
  }), act('Annulla iscrizione', async () => {
    const reg = await swReady(); const sub = await reg.pushManager.getSubscription();
    logAdd(sub ? ((await sub.unsubscribe()) ? 'Iscrizione rimossa.' : 'Impossibile rimuovere.') : 'Nessuna iscrizione attiva.');
  }, 'alt'));
});

/* ------------------------------------------------------------------ */
/* Wake lock                                                           */
/* ------------------------------------------------------------------ */
card('wake', '💡 Schermo sempre acceso', 'Impedisce lo spegnimento dello schermo (Screen Wake Lock).', ({ log, act, add }) => {
  let lock = null, want = false;
  const take = async () => {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => log('Wake lock rilasciato.'));
    log('Schermo mantenuto acceso.');
  };
  document.addEventListener('visibilitychange', async () => { if (want && document.visibilityState === 'visible') { try { await take(); } catch { /* ignora */ } } });
  add(act('Attiva', async () => { want = true; await take(); }), act('Disattiva', async () => { want = false; if (lock) await lock.release(); lock = null; }, 'alt'));
});

/* ------------------------------------------------------------------ */
/* Condivisione e appunti                                              */
/* ------------------------------------------------------------------ */
card('share', '📤 Condivisione e appunti', 'Foglio di condivisione nativo, file e appunti.', ({ log, act, add, block }) => {
  const text = h('input', { type: 'text', value: 'Guarda cosa può fare una PWA su iOS 27!' });
  block(text);
  add(
    act('Condividi link', async () => { await navigator.share({ title: 'PWA Lab', text: text.value, url: location.href }); log('Condiviso.'); }),
    act('Condividi file', async () => {
      const f = new File(['Ciao da PWA Lab\n' + new Date().toISOString()], 'pwa-lab.txt', { type: 'text/plain' });
      if (!navigator.canShare || !navigator.canShare({ files: [f] })) throw new Error('Condivisione file non supportata');
      await navigator.share({ files: [f], title: 'File da PWA Lab' }); log('File condiviso.');
    }),
    act('Copia', async () => { await navigator.clipboard.writeText(text.value); log('Copiato negli appunti.'); }, 'alt'),
    act('Incolla', async () => { log('Incollato: ' + (await navigator.clipboard.readText())); }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Aptica                                                              */
/* ------------------------------------------------------------------ */
card('haptic', '📳 Aptica', 'Vibration API non esiste su iOS, ma da iOS 18 un <input switch> produce un tocco aptico. Funziona solo da un tuo tocco.', ({ log, act, add }) => {
  const tap = () => {
    const label = h('label', { class: 'sr' }, h('input', { type: 'checkbox', switch: true }));
    document.body.append(label); label.click(); setTimeout(() => label.remove(), 150);
  };
  add(
    act('Tocco singolo', () => { tap(); log('Tocco inviato (se il dispositivo ha il Taptic Engine e l’aptica è attiva).'); }),
    act('Doppio tocco', async () => { tap(); await sleep(120); tap(); log('Doppio tocco.'); }),
    act('Raffica', async () => { for (let i = 0; i < 6; i++) { tap(); await sleep(90); } log('Raffica.'); }),
    act('navigator.vibrate', () => log('navigator.vibrate: ' + ('vibrate' in navigator ? navigator.vibrate(200) : 'non supportato su iOS')), 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Archiviazione                                                       */
/* ------------------------------------------------------------------ */
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open('pwa-lab', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('note', { keyPath: 'id', autoIncrement: true });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const idbTx = async (mode, fn) => {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('note', mode); const store = tx.objectStore('note');
    const req = fn(store);
    tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error);
  });
};

card('storage', '💾 Archiviazione', 'localStorage, IndexedDB, Cache, file system privato (OPFS) e quota.', ({ log, logAdd, act, add, block }) => {
  const note = h('input', { type: 'text', placeholder: 'Scrivi una nota da salvare' });
  const opfsWrite = async (name, text) => {
    const root = await navigator.storage.getDirectory();
    const fh = await root.getFileHandle(name, { create: true });
    if (fh.createWritable) {
      try { const w = await fh.createWritable(); await w.write(text); await w.close(); return 'createWritable'; } catch { /* fallback */ }
    }
    const code = "onmessage=async(e)=>{const r=await navigator.storage.getDirectory();const f=await r.getFileHandle(e.data.n,{create:true});const a=await f.createSyncAccessHandle();const b=new TextEncoder().encode(e.data.t);a.truncate(0);a.write(b,{at:0});a.flush();a.close();postMessage('ok')}";
    const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
    await new Promise((res, rej) => { w.onmessage = res; w.onerror = (e) => rej(new Error(e.message)); w.postMessage({ n: name, t: text }); });
    w.terminate(); return 'worker + SyncAccessHandle';
  };
  block(note);
  add(
    act('localStorage: conta aperture', () => {
      const n = (+localStorage.getItem('aperture') || 0) + 1; localStorage.setItem('aperture', n);
      log('Aperture contate: ' + n);
    }),
    act('IndexedDB: salva nota', async () => {
      await idbTx('readwrite', (s) => s.add({ testo: note.value || '(vuota)', quando: new Date().toISOString() }));
      const all = await idbTx('readonly', (s) => s.getAll()); log(j(all));
    }),
    act('IndexedDB: svuota', async () => { await idbTx('readwrite', (s) => s.clear()); log('Note cancellate.'); }, 'alt'),
    act('OPFS: scrivi e leggi', async () => {
      const how = await opfsWrite('demo.txt', 'File privato creato ' + new Date().toISOString());
      const root = await navigator.storage.getDirectory();
      const file = await (await root.getFileHandle('demo.txt')).getFile();
      log('Metodo: ' + how + '\n' + (await file.text()));
    }),
    act('Cache e quota', async () => {
      const names = await caches.keys();
      const est = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
      log(j({ cache: names, usatoMB: +(est.usage / 1048576).toFixed(2), quotaMB: Math.round(est.quota / 1048576), persistente: persisted }));
    }, 'alt'),
    act('Richiedi persistenza', async () => { logAdd('Persistenza concessa: ' + (await navigator.storage.persist())); }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* File                                                                */
/* ------------------------------------------------------------------ */
card('files', '🗂️ File e foto', 'Scegli dalla libreria, dai file o scatta con la fotocamera di sistema.', ({ log, add, block }) => {
  const img = h('img', { class: 'preview', hidden: true, alt: 'anteprima' });
  const show = (inp) => {
    const files = Array.from(inp.files);
    log(j(files.map((f) => ({ nome: f.name, tipo: f.type, KB: Math.round(f.size / 1024), modificato: new Date(f.lastModified).toLocaleString() }))));
    const first = files.find((f) => f.type.startsWith('image/'));
    if (first) { img.src = URL.createObjectURL(first); img.hidden = false; } else img.hidden = true;
  };
  const mk = (label, attrs) => {
    const inp = h('input', Object.assign({ type: 'file', class: 'sr', onchange: () => show(inp) }, attrs));
    return h('label', { class: 'btn' + (attrs.alt ? ' alt' : '') }, label, inp);
  };
  add(
    mk('Scegli file', { multiple: true }),
    mk('Foto/Video', { accept: 'image/*,video/*', multiple: true, alt: true }),
    mk('Scatta foto', { accept: 'image/*', capture: 'environment', alt: true })
  );
  block(img);
});

/* ------------------------------------------------------------------ */
/* Passkey                                                             */
/* ------------------------------------------------------------------ */
card('auth', '🔐 Passkey e Face ID', 'WebAuthn: crea e usa una passkey protetta da Face ID o Touch ID (demo locale, senza server).', ({ log, act, add }) => {
  const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  add(
    act('Disponibilità', async () => log(j({
      autenticatorePiattaforma: await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
      autofillPasskey: PublicKeyCredential.isConditionalMediationAvailable ? await PublicKeyCredential.isConditionalMediationAvailable() : 'n/d',
      dominio: location.hostname
    }))),
    act('Crea passkey', async () => {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: rnd(32), rp: { name: 'PWA Lab', id: location.hostname },
        user: { id: rnd(16), name: 'demo@pwa-lab', displayName: 'Utente Demo' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' }, timeout: 60000
      } });
      localStorage.setItem('passkey', b64(cred.rawId));
      log('✅ Passkey creata. ID: ' + b64(cred.rawId).slice(0, 24) + '…');
    }),
    act('Accedi con passkey', async () => {
      const id = localStorage.getItem('passkey');
      const a = await navigator.credentials.get({ publicKey: {
        challenge: rnd(32), rpId: location.hostname, userVerification: 'required', timeout: 60000,
        allowCredentials: id ? [{ type: 'public-key', id: unb64(id) }] : []
      } });
      log('✅ Autenticato: ' + b64(a.rawId).slice(0, 24) + '… (in un’app vera la firma va verificata dal server)');
    }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */
card('audio', '🔊 Audio (Web Audio)', 'Sintetizzatore. Su iOS il Web Audio è muto con l’interruttore Suoneria su silenzioso.', ({ log, act, add, block }) => {
  const freq = h('input', { type: 'range', min: 110, max: 1760, value: 440 });
  const wave = h('select', null, ...['sine', 'square', 'sawtooth', 'triangle'].map((w) => h('option', { value: w }, w)));
  let ctx = null, osc = null, gain = null;
  const start = async () => {
    if (osc) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = ctx || new AC(); await ctx.resume();
    osc = ctx.createOscillator(); gain = ctx.createGain();
    osc.type = wave.value; osc.frequency.value = +freq.value; gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination); osc.start();
    log('Suono attivo.');
  };
  const stop = () => { if (osc) { osc.stop(); osc.disconnect(); osc = null; } log('Suono fermato.'); };
  freq.addEventListener('input', () => { if (osc) osc.frequency.value = +freq.value; log('Frequenza: ' + freq.value + ' Hz'); });
  wave.addEventListener('change', () => { if (osc) osc.type = wave.value; });
  block(h('label', { class: 'field' }, 'Frequenza', freq), wave);
  add(act('Suona', start), act('Stop', stop, 'alt'));
});

/* ------------------------------------------------------------------ */
/* Media: PiP, AirPlay, Media Session                                  */
/* ------------------------------------------------------------------ */
card('media', '📺 Video, PiP e AirPlay', 'Un video generato in tempo reale: prova Picture-in-Picture, AirPlay e controlli di blocco schermo.', ({ log, act, add, block }) => {
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360;
  const g = cv.getContext('2d');
  let t = 0;
  const draw = () => {
    t += 0.03;
    const grad = g.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, 'hsl(' + ((t * 40) % 360) + ',80%,50%)'); grad.addColorStop(1, 'hsl(' + ((t * 40 + 120) % 360) + ',80%,40%)');
    g.fillStyle = grad; g.fillRect(0, 0, 640, 360);
    g.fillStyle = '#fff'; g.font = 'bold 40px -apple-system, sans-serif'; g.textAlign = 'center';
    g.fillText('PWA Lab', 320, 160 + Math.sin(t * 3) * 20);
    g.beginPath(); g.arc(320 + Math.cos(t * 2) * 200, 270, 22, 0, Math.PI * 2); g.fill();
    requestAnimationFrame(draw);
  };
  draw();
  const video = h('video', { playsinline: true, muted: true, controls: true });
  video.muted = true;
  const ready = () => {
    if (video.srcObject) return;
    if (!cv.captureStream) throw new Error('canvas.captureStream non supportato');
    video.srcObject = cv.captureStream(30);
  };
  block(video);
  add(
    act('Riproduci', async () => {
      ready(); await video.play();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: 'Video demo', artist: 'PWA Lab', album: 'iOS 27', artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
        navigator.mediaSession.setActionHandler('play', () => video.play());
        navigator.mediaSession.setActionHandler('pause', () => video.pause());
      }
      log('In riproduzione. Media Session attiva (controlli su blocco schermo).');
    }),
    act('Picture-in-Picture', async () => {
      ready(); await video.play();
      if (video.requestPictureInPicture) await video.requestPictureInPicture();
      else if (video.webkitSetPresentationMode) video.webkitSetPresentationMode('picture-in-picture');
      else throw new Error('PiP non supportato');
    }, 'alt'),
    act('AirPlay', () => {
      ready();
      if (!video.webkitShowPlaybackTargetPicker) throw new Error('AirPlay non supportato');
      video.webkitShowPlaybackTargetPicker();
    }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Grafica e calcolo                                                   */
/* ------------------------------------------------------------------ */
card('gpu', '⚡ Grafica e calcolo', 'GPU, WebAssembly, worker e un piccolo test di velocità.', ({ log, act, add }) => {
  add(
    act('Info GPU', async () => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const info = {
        webgl2: !!gl,
        renderer: gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : null,
        maxTexture: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : null
      };
      if ('gpu' in navigator) {
        const ad = await navigator.gpu.requestAdapter();
        info.webgpu = ad ? { funzioni: Array.from(ad.features).slice(0, 12), info: ad.info ? { vendor: ad.info.vendor, architecture: ad.info.architecture } : null } : 'nessun adattatore';
      } else info.webgpu = 'non supportato';
      log(j(info));
    }),
    act('WebAssembly', async () => {
      const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 3, 2, 1, 0, 7, 7, 1, 3, 97, 100, 100, 0, 0, 10, 9, 1, 7, 0, 32, 0, 32, 1, 106, 11]);
      const { instance } = await WebAssembly.instantiate(bytes);
      log('wasm add(20, 22) = ' + instance.exports.add(20, 22));
    }),
    act('Test velocità', async () => {
      const t0 = performance.now(); let n = 0;
      for (let i = 2; i < 300000; i++) { let p = true; for (let d = 2; d * d <= i; d++) if (i % d === 0) { p = false; break; } if (p) n++; }
      const main = performance.now() - t0;
      const code = "onmessage=()=>{const t=performance.now();let n=0;for(let i=2;i<300000;i++){let p=true;for(let d=2;d*d<=i;d++)if(i%d===0){p=false;break}if(p)n++}postMessage({n,ms:performance.now()-t})}";
      const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      const r = await new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage(0); }); w.terminate();
      log(j({ primiTrovati: n, threadPrincipaleMs: Math.round(main), workerMs: Math.round(r.ms), core: navigator.hardwareConcurrency }));
    }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Pagamenti                                                           */
/* ------------------------------------------------------------------ */
card('pay', '💳 Pagamenti', 'Rilevamento di Apple Pay e Payment Request. Un pagamento reale richiede un merchant ID e un server.', ({ log, act, add }) => {
  add(act('Verifica', async () => {
    const r = { applePaySession: 'ApplePaySession' in window, paymentRequest: 'PaymentRequest' in window };
    if (r.applePaySession) { r.puoPagare = ApplePaySession.canMakePayments(); r.versioneMax = [14, 10, 6, 3].find((v) => ApplePaySession.supportsVersion(v)); }
    log(j(r));
  }));
});

/* ------------------------------------------------------------------ */
/* Rete e offline                                                      */
/* ------------------------------------------------------------------ */
card('net', '🌐 Rete e offline', 'L’app funziona anche senza connessione grazie al service worker. Prova la Modalità aereo e riapri l’app.', ({ log, logAdd, act, add }) => {
  const st = () => (navigator.onLine ? '🟢 online' : '🔴 offline');
  addEventListener('online', () => logAdd(new Date().toLocaleTimeString() + ' → ' + st()));
  addEventListener('offline', () => logAdd(new Date().toLocaleTimeString() + ' → ' + st()));
  add(
    act('Stato', () => log(j({ stato: st(), serviceWorkerAttivo: !!(navigator.serviceWorker && navigator.serviceWorker.controller), infoRete: 'navigator.connection non esiste su iOS' }))),
    act('Test fetch', async () => {
      const t = performance.now();
      const r = await fetch('manifest.webmanifest', { cache: 'no-store' });
      log('HTTP ' + r.status + ' in ' + Math.round(performance.now() - t) + ' ms');
    }, 'alt'),
    act('Aggiorna cache', async () => {
      const reg = await swReady(); await reg.update(); log('Controllo aggiornamenti effettuato.');
    }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Novità iOS 27                                                       */
/* ------------------------------------------------------------------ */
card('ios27', '🆕 Novità di iOS 27 / Safari 27', 'Funzioni introdotte con questa versione, rilevate sul tuo dispositivo.', ({ log, act, add, block }) => {
  const sel = h('select', { class: 'custom' }, h('option', null, 'Rosso'), h('option', null, 'Verde'), h('option', null, 'Blu'));
  const box = h('div', { class: 'vt-box' }, 'View Transition');
  block(h('label', { class: 'field' }, 'Select personalizzabile (appearance: base-select)', sel));
  block(box);
  add(
    act('Rileva novità', async () => {
      const r = {
        selectPersonalizzabile: CSS.supports('appearance', 'base-select'),
        elementoModel: 'HTMLModelElement' in window,
        cssStretch: CSS.supports('width', 'stretch'),
        cssRandom: CSS.supports('width', 'random(1px, 2px)'),
        navigationApi: 'navigation' in window,
        webTransport: 'WebTransport' in window,
        topLevelAwait: true
      };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        r.serviceWorker = await new Promise((res) => {
          const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data);
          navigator.serviceWorker.controller.postMessage({ type: 'status' }, [ch.port2]);
          setTimeout(() => res('nessuna risposta'), 2000);
        });
        if (r.serviceWorker && typeof r.serviceWorker === 'object') {
          r.staticRouting = r.serviceWorker.hasAddRoutes; // InstallEvent esiste solo nel service worker
        }
      } else r.serviceWorker = 'non ancora attivo: ricarica la pagina';
      log(j(r));
    }),
    act('Cookie con maxAge', async () => {
      if (!('cookieStore' in window)) throw new Error('Cookie Store non supportata');
      await cookieStore.set({ name: 'demo', value: String(Date.now()), maxAge: 3600, path: location.pathname });
      log('Cookie: ' + j(await cookieStore.get('demo')));
    }, 'alt'),
    act('View Transition', async () => {
      const flip = () => box.classList.toggle('alt');
      if (document.startViewTransition) { await document.startViewTransition(flip).finished; log('Transizione completata.'); }
      else { flip(); log('View Transitions non supportate: cambio senza animazione.'); }
    }, 'alt')
  );
});

/* ------------------------------------------------------------------ */
/* Limiti                                                              */
/* ------------------------------------------------------------------ */
card('limits', '🚫 Cosa non si può fare', null, ({ sec, out }) => {
  out.remove();
  sec.append(h('ul', { style: 'margin:.25rem 0 0;padding-left:1.2rem;color:var(--muted);font-size:.92rem' },
    ['Bluetooth, USB, NFC, seriale e HID.',
     'Contatti, SMS, chiamate, calendario, rubrica.',
     'Livello batteria e tipo di connessione.',
     'Esecuzione in background reale (Background Sync, sync periodico).',
     'Widget sulla Home e prompt di installazione automatico.',
     'Identificatori del dispositivo (IMEI, UDID, MAC, IDFA).',
     'File system completo: solo OPFS privato e selezione manuale dei file.',
     'Blocco dell’orientamento e fullscreen della pagina su iPhone.'
    ].map((t) => h('li', null, t))));
});

/* ------------------------------------------------------------------ */
/* Navigazione, footer, service worker                                 */
/* ------------------------------------------------------------------ */
$('#nav').append(...navItems.map(([id, t]) => h('a', { href: '#' + id }, t)));
app.append(h('footer', null, 'PWA Lab · testata per iOS 27.2 · tutto gira sul tuo dispositivo'));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: './' })
    .then((r) => { swReg = r; })
    .catch((e) => console.warn('Service worker non registrato:', e));
}
