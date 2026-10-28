// Música y efectos generados con Web Audio (no hacen falta archivos de sonido).
const Sonido = (() => {
  const PREFS = "teorico-sonido";
  let prefs = { musica: true, efectos: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch {}
  const guardarPrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch {} };

  let ctx = null, master = null, musGain = null, sfxGain = null, ruido = null;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      musGain = ctx.createGain(); musGain.gain.value = 0.45; musGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
      ruido = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  // Nota con envolvente simple
  function nota(dest, t, freq, dur, { tipo = "triangle", vol = 0.1, ataque = 0.01, filtro } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let salida = g;
    if (filtro) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filtro; g.connect(f); salida = f; }
    o.connect(g); salida.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function golpe(t, { vol = 0.05, dur = 0.05, corte = 7000, tipo = "highpass" } = {}) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruido; f.type = tipo; f.frequency.value = corte;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(musGain);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function bombo(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(musGain); o.start(t); o.stop(t + 0.25);
  }

  // ---- Música: loop de 4 compases (C – Am – F – G), 16 pasos por compás ----
  const BPM = 100, PASO = 60 / BPM / 4;
  const ACORDES = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const BAJOS = [48, 45, 41, 43];
  const _ = null;
  const MELODIA = [
    [76, _, 79, _, 81, _, 79, _, 76, _, 74, _, 72, _, _, _],
    [72, _, 76, _, 81, _, 79, _, 76, _, _, _, 74, _, _, _],
    [77, _, 81, _, 84, _, 81, _, 79, _, 77, _, 76, _, _, _],
    [74, _, 79, _, 83, _, 81, _, 79, _, _, _, _, _, _, _],
  ];
  let sonando = false, timer = null, prox = 0, paso = 0;

  function programar(t, p) {
    const compas = (p >> 4) % 4, i = p % 16, vuelta = p >> 6;
    if (i === 0) for (const m of ACORDES[compas]) nota(musGain, t, hz(m), PASO * 16, { tipo: "sawtooth", vol: 0.018, ataque: 0.3, filtro: 900 });
    if (i === 0 || i === 6 || i === 8 || i === 14) nota(musGain, t, hz(BAJOS[compas]), PASO * 2, { tipo: "triangle", vol: 0.16 });
    if (i % 8 === 0) bombo(t);
    if (i % 8 === 4) golpe(t, { vol: 0.08, dur: 0.12, corte: 1800, tipo: "bandpass" });
    if (i % 2 === 0) golpe(t, { vol: i % 4 === 2 ? 0.035 : 0.02 });
    // La melodía entra una vuelta sí y una no, para que no canse
    const m = MELODIA[compas][i];
    if (vuelta % 2 === 1 && m) nota(musGain, t, hz(m), PASO * 1.8, { tipo: "square", vol: 0.035, filtro: 2500 });
  }
  function loop() {
    while (prox < ctx.currentTime + 0.15) { programar(prox, paso); prox += PASO; paso = (paso + 1) % 128; }
  }
  function play() {
    if (!prefs.musica || !init() || sonando) return;
    sonando = true; prox = ctx.currentTime + 0.08;
    musGain.gain.cancelScheduledValues(ctx.currentTime);
    musGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    musGain.gain.exponentialRampToValueAtTime(0.45, ctx.currentTime + 1);
    timer = setInterval(loop, 25); loop();
  }
  function stop() {
    if (!sonando) return;
    sonando = false; clearInterval(timer);
    const t = ctx.currentTime;
    musGain.gain.cancelScheduledValues(t);
    musGain.gain.setValueAtTime(musGain.gain.value, t);
    musGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  }

  // ---- Efectos ----
  function bien() {
    if (!prefs.efectos || !init()) return;
    const t = ctx.currentTime;
    nota(sfxGain, t, hz(84), 0.18, { tipo: "triangle", vol: 0.25 });
    nota(sfxGain, t + 0.09, hz(91), 0.3, { tipo: "triangle", vol: 0.25 });
    nota(sfxGain, t + 0.09, hz(96), 0.35, { tipo: "sine", vol: 0.12 });
  }
  function mal() {
    if (!prefs.efectos || !init()) return;
    const t = ctx.currentTime;
    for (const [d, f] of [[0, 196], [0.16, 147]]) {
      const o = nota(sfxGain, t + d, f, 0.22, { tipo: "sawtooth", vol: 0.14, filtro: 1100 });
      o.frequency.exponentialRampToValueAtTime(f * 0.9, t + d + 0.2);
    }
  }
  function fin(bueno) {
    if (!prefs.efectos || !init()) return;
    const t = ctx.currentTime;
    const notas = bueno ? [72, 76, 79, 84] : [72, 67, 64, 60];
    notas.forEach((m, k) => nota(sfxGain, t + k * 0.13, hz(m), k === 3 ? 0.6 : 0.2, { tipo: "triangle", vol: 0.22 }));
  }

  return {
    get musica() { return prefs.musica; },
    get efectos() { return prefs.efectos; },
    setMusica(v) { prefs.musica = v; guardarPrefs(); },
    setEfectos(v) { prefs.efectos = v; guardarPrefs(); },
    // El navegador no deja sonar nada hasta que el usuario toca la página
    get bloqueado() { return !ctx || ctx.state !== "running"; },
    // Corta todo al salir de la página (otra app, pantalla bloqueada, cerrar)
    dormir() { stop(); if (ctx && ctx.state === "running") ctx.suspend(); },
    play, stop, bien, mal, fin,
  };
})();
