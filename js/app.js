const $ = id => document.getElementById(id);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SVG = "http://www.w3.org/2000/svg";

// Cada pregunta tiene un id estable para poder guardar los errores
const bancoSenales = SENALES.map(s => ({ id: "s:" + s.img, tipo: "senal", tag: s.cat, s }));
const todaLaTeoria = PREGUNTAS.map(p => ({ id: "t:" + p.q, tipo: "teoria", tag: p.tema, p }));

// Licencia elegida: las señales son las mismas, la teoría depende de auto o moto
const VEHICULO = "teorico-vehiculo";
const VEHICULOS = { auto: "Auto", moto: "Moto" };
let vehiculo = null;
try { vehiculo = localStorage.getItem(VEHICULO); } catch {}
if (!VEHICULOS[vehiculo]) vehiculo = null;
let bancoTeoria = [], porId = new Map();
function armarBancos() {
  bancoTeoria = todaLaTeoria.filter(x => !x.p.para || x.p.para === (vehiculo || "auto"));
  porId = new Map([...bancoSenales, ...bancoTeoria].map(x => [x.id, x]));
}
armarBancos();

function opcionesSenal(s) {
  const nombres = new Set([s.name]);
  const misma = shuffle(SENALES.filter(o => o.cat === s.cat && o.name !== s.name));
  const otras = shuffle(SENALES.filter(o => o.cat !== s.cat));
  for (const o of [...misma, ...otras]) { if (nombres.size === 4) break; nombres.add(o.name); }
  return { q: "¿Qué significa esta señal?", correcta: s.name, o: shuffle([...nombres]) };
}
function armar(item) {
  if (item.tipo === "senal") return { ...opcionesSenal(item.s), img: item.s.img };
  return { q: item.p.q, correcta: item.p.o[0], o: shuffle(item.p.o) };
}

// Lo que se guarda en el navegador: errores, XP, preguntas dominadas y mejor examen
const KEY = "teorico-errores", PERFIL = "teorico-perfil";
let errores = new Set();
try { errores = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify([...errores])); } catch {} };

// El mejor examen se guarda por licencia; el que había antes de existir la moto era de auto
let perfil = { xp: 0, examen: { auto: { mejor: 0, total: 0 }, moto: { mejor: 0, total: 0 } } };
let dominadas = new Set();
try {
  const p = JSON.parse(localStorage.getItem(PERFIL) || "{}");
  perfil.xp = p.xp || 0;
  if (p.examen) for (const v in VEHICULOS) Object.assign(perfil.examen[v], p.examen[v]);
  else if (p.mejorTotal) perfil.examen.auto = { mejor: p.mejor, total: p.mejorTotal };
  dominadas = new Set(p.dominadas || []);
} catch {}
const guardarPerfil = () => {
  try { localStorage.setItem(PERFIL, JSON.stringify({ ...perfil, dominadas: [...dominadas] })); } catch {}
};

const NIVELES = ["Peatón atento", "Aprendiz al volante", "Conductor prudente", "Baqueano del asfalto", "Maestro del tránsito"];
const XP_NIVEL = 500;
const nivel = xp => Math.floor(xp / XP_NIVEL) + 1;
const nombreNivel = xp => NIVELES[Math.min(nivel(xp) - 1, NIVELES.length - 1)];

let cantidad = 20;
document.querySelectorAll("#cant button").forEach(b => b.onclick = () => {
  document.querySelectorAll("#cant button").forEach(x => x.classList.toggle("on", x === b));
  cantidad = +b.dataset.n;
});

let ronda = [], idx = 0, aciertos = 0, falladas = [], respondida = false, ultimoModo = "senales";
let puntos = 0, combo = 0, comboMax = 0, racha = 0, rachaMax = 0, vidas = 0, conVidas = false;
let inicio = 0, reloj = null, espera = null, pausadoDesde = 0;
const PAUSA_BIEN = 900, PAUSA_MAL = 2200, ANIM = 280, VIDAS = 3, BASE = 50;

const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const tick = () => { $("relojTxt").textContent = fmt(Date.now() - inicio); };
function parar() { clearInterval(reloj); clearTimeout(espera); reloj = espera = null; pausadoDesde = 0; $("pausa").hidden = true; $("banda").hidden = true; }

const iconoVida = apagada => {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "20"); svg.setAttribute("height", "20");
  svg.setAttribute("fill", "currentColor"); svg.setAttribute("aria-hidden", "true");
  if (apagada) svg.setAttribute("class", "off");
  const p = document.createElementNS(SVG, "path");
  if (vehiculo === "moto") {
    // Moto: dos ruedas y el cuadro, en trazo
    svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
    p.setAttribute("d", "M2.8 16a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M14.8 16a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M6 16h5.5l3-5h3.2l1.3 5M9 11h4M15 7h2.5l1 4");
  } else {
    p.setAttribute("d", "M5 11.2 6.7 6.9A2.2 2.2 0 0 1 8.7 5.5h6.6a2.2 2.2 0 0 1 2 1.4l1.7 4.3v5.3a1 1 0 0 1-1 1h-1.3a1 1 0 0 1-1-1V16H8.3v.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z");
  }
  svg.appendChild(p);
  return svg;
};
function pintarVidas() {
  const box = $("vidas");
  box.hidden = !conVidas;
  if (!conVidas) return;
  box.innerHTML = "";
  box.setAttribute("aria-label", `${vidas} vidas de ${VIDAS}`);
  for (let i = 0; i < VIDAS; i++) box.appendChild(iconoVida(i >= vidas));
}

function pintarCombo() {
  $("combo").hidden = combo < 2;
  $("comboTxt").textContent = "x" + combo;
}

// Pausa: congela el reloj, el avance automático y la música
function pausar() {
  if ($("quiz").hidden || pausadoDesde) return;
  pausadoDesde = Date.now();
  clearInterval(reloj); clearTimeout(espera); reloj = espera = null;
  $("stage").classList.remove("out");
  $("auto").classList.remove("run");
  $("pausaSub").textContent = `Pregunta ${idx + 1} de ${ronda.length} · el reloj está detenido`;
  $("pAciertos").textContent = aciertos;
  $("pErrores").textContent = falladas.length;
  $("pTiempo").textContent = fmt(pausadoDesde - inicio);
  $("pausa").hidden = false;
  Sonido.stop();
}
function continuar() {
  if (!pausadoDesde) return;
  inicio += Date.now() - pausadoDesde;
  pausadoDesde = 0;
  $("pausa").hidden = true;
  tick(); reloj = setInterval(tick, 500);
  Sonido.play();
  if (respondida) espera = setTimeout(siguiente, 400);
}

function pintarToggles() {
  document.querySelectorAll("[data-tg]").forEach(b => b.setAttribute("aria-pressed", Sonido[b.dataset.tg]));
}
document.querySelectorAll("[data-tg]").forEach(b => b.onclick = () => {
  if (b.dataset.tg === "musica") {
    Sonido.setMusica(!Sonido.musica);
    if (!Sonido.musica) Sonido.stop(); else if (!pausadoDesde) Sonido.play();
  }
  else { Sonido.setEfectos(!Sonido.efectos); if (Sonido.efectos) Sonido.bien(); }
  pintarToggles();
});

function pantalla(id) { for (const s of ["elegir", "menu", "quiz", "fin"]) $(s).hidden = s !== id; window.scrollTo(0, 0); }

function elegirVehiculo(v) {
  vehiculo = v;
  try { localStorage.setItem(VEHICULO, v); } catch {}
  armarBancos();
  refrescarMenu();
  pantalla("menu");
}
document.querySelectorAll("[data-veh]").forEach(b => b.onclick = () => elegirVehiculo(b.dataset.veh));

function refrescarMenu() {
  document.querySelectorAll("[data-veh]").forEach(b => b.setAttribute("aria-pressed", b.dataset.veh === vehiculo));
  document.body.dataset.vehiculo = vehiculo || "auto";
  $("subMenu").textContent =`Practicá para el examen teórico de la licencia de ${vehiculo === "moto" ? "moto" : "auto"}.`;

  const n = [...errores].filter(id => porId.has(id)).length;
  $("nErrores").textContent = n ? `${n} pregunta${n > 1 ? "s" : ""} para repasar` : "Todavía no tenés errores guardados";
  $("cErrores").textContent = n;
  $("cErrores").hidden = !n;
  $("btnErrores").disabled = !n;

  const ds = bancoSenales.filter(x => dominadas.has(x.id)).length;
  const dt = bancoTeoria.filter(x => dominadas.has(x.id)).length;
  $("nSenales").textContent = `${ds}/${bancoSenales.length}`;
  $("progSenales").style.width = (ds / bancoSenales.length * 100) + "%";
  $("nTeoria").textContent = `${dt}/${bancoTeoria.length}`;
  $("progTeoria").style.width = (dt / bancoTeoria.length * 100) + "%";
  const ex = perfil.examen[vehiculo || "auto"];
  $("mejorExamen").textContent = ex.total ? `MEJOR: ${ex.mejor}/${ex.total}` : "TODAVÍA SIN JUGAR";

  $("nivelNum").textContent = nivel(perfil.xp);
  $("nivelNombre").textContent = nombreNivel(perfil.xp);
  const dentro = perfil.xp % XP_NIVEL;
  $("xpTxt").textContent = `${dentro} / ${XP_NIVEL} XP`;
  $("xpBar").style.width = (dentro / XP_NIVEL * 100) + "%";
}

function empezar(modo, lista) {
  ultimoModo = modo;
  let items;
  const tomar = (arr, n) => n ? shuffle(arr).slice(0, n) : shuffle(arr);
  if (lista) items = shuffle(lista);
  else if (modo === "senales") items = tomar(bancoSenales, cantidad);
  else if (modo === "teoria") items = tomar(bancoTeoria, cantidad);
  else if (modo === "mixto") {
    const n = cantidad || bancoSenales.length + bancoTeoria.length;
    const t = Math.min(Math.floor(n / 2), bancoTeoria.length);
    items = shuffle([...tomar(bancoTeoria, t), ...tomar(bancoSenales, n - t)]);
  } else items = shuffle([...errores].map(id => porId.get(id)).filter(Boolean)).slice(0, cantidad || undefined);
  if (!items.length) return;

  ronda = items.map(it => ({ it, ...armar(it) }));
  idx = 0; aciertos = 0; falladas = [];
  puntos = 0; combo = 0; comboMax = 0; racha = 0; rachaMax = 0;
  conVidas = modo === "mixto"; vidas = VIDAS;
  parar();
  $("stage").className = "card stage";
  pintarVidas(); pintarCombo();

  // Con rondas largas una casilla por pregunta no se vería: ahí va una barra común
  const cortas = ronda.length <= 30;
  $("segs").hidden = !cortas;
  $("barWrap").hidden = cortas;
  if (cortas) {
    $("segs").innerHTML = "";
    for (let i = 0; i < ronda.length; i++) $("segs").appendChild(document.createElement("i"));
  }

  pantalla("quiz"); mostrar();
  inicio = Date.now(); tick(); reloj = setInterval(tick, 500);
  Sonido.play();
}

function pintarAvance() {
  if ($("segs").hidden) $("barra").style.width = (idx / ronda.length * 100) + "%";
  else {
    const casillas = $("segs").children;
    for (const c of casillas) if (c.className === "now") c.className = "";
    if (casillas[idx]) casillas[idx].className = "now";
  }
}

function mostrar() {
  const r = ronda[idx];
  respondida = false;
  $("prog").textContent = `Pregunta ${idx + 1} / ${ronda.length}`;
  $("pts").textContent = puntos;
  pintarAvance();
  $("sign").hidden = !r.img;
  $("tag").hidden = !!r.img;
  if (r.img) { $("img").src = r.img; $("tagSign").textContent = r.it.tag; }
  else $("tag").textContent = r.it.tag;
  $("preg").textContent = r.q;
  $("banda").hidden = true;
  $("auto").classList.remove("run");
  const prox = ronda[idx + 1];
  if (prox && prox.img) new Image().src = prox.img;
  const box = $("opts"); box.innerHTML = "";
  r.o.forEach((txt, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.innerHTML = '<span class="k"></span><span class="t"></span>';
    b.firstChild.textContent = "ABCD"[i];
    b.lastChild.textContent = txt;
    b.onclick = () => responder(i);
    box.appendChild(b);
  });
}

function responder(i) {
  if (respondida || pausadoDesde) return;
  respondida = true;
  const r = ronda[idx], botones = [...$("opts").children];
  const bien = r.o[i] === r.correcta;
  const casilla = $("segs").hidden ? null : $("segs").children[idx];

  botones.forEach((b, j) => {
    b.disabled = true;
    if (r.o[j] === r.correcta) b.classList.add("ok");
    else if (j !== i) b.classList.add("off");
  });

  if (bien) {
    aciertos++; combo++; racha++;
    comboMax = Math.max(comboMax, combo); rachaMax = Math.max(rachaMax, racha);
    const gana = BASE + Math.min(combo - 1, 5) * 10;
    puntos += gana;
    errores.delete(r.it.id); dominadas.add(r.it.id);
    Sonido.bien();
    if (casilla) casilla.className = "ok";
    $("banda").className = "banda ok";
    $("bandaTitulo").textContent = "¡CORRECTO!";
    $("bandaDet").textContent = `+${gana} puntos` + (combo > 1 ? ` · combo x${combo}` : "");
  } else {
    combo = 0; racha = 0;
    botones[i].classList.add("bad");
    errores.add(r.it.id); dominadas.delete(r.it.id);
    falladas.push({ r, elegida: r.o[i] });
    if (conVidas) vidas--;
    Sonido.mal();
    if (casilla) casilla.className = "bad";
    $("banda").className = "banda bad";
    $("bandaTitulo").textContent = conVidas && !vidas ? "SIN VIDAS" : "INCORRECTO";
    $("bandaDet").textContent = (conVidas ? "−1 vida · " : "") + "la correcta está en verde";
  }

  pintarVidas(); pintarCombo();
  guardar(); guardarPerfil();
  $("pts").textContent = puntos;
  $("banda").hidden = false;

  const pausa = bien ? PAUSA_BIEN : PAUSA_MAL;
  const auto = $("auto");
  auto.style.setProperty("--dur", pausa + "ms");
  void auto.offsetWidth;
  auto.classList.add("run");
  espera = setTimeout(siguiente, pausa);
}

function siguiente() {
  clearTimeout(espera);
  if (conVidas && !vidas) return terminar();
  const st = $("stage");
  st.classList.add("out");
  $("banda").hidden = true;
  espera = setTimeout(() => {
    st.classList.remove("out");
    if (++idx >= ronda.length) return terminar();
    st.classList.add("pre");
    mostrar();
    window.scrollTo(0, 0);
    void st.offsetWidth;
    st.classList.remove("pre");
  }, ANIM);
}

function estrellas(pct) { return pct >= 95 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0; }

function pintarEstrellas(n) {
  const box = $("stars"); box.innerHTML = "";
  box.setAttribute("aria-label", `${n} estrellas de 3`);
  for (let i = 0; i < 3; i++) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "31"); svg.setAttribute("height", "31");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", "M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z");
    if (i < n) { svg.setAttribute("fill", "currentColor"); }
    else { svg.setAttribute("class", "off"); svg.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "2"); }
    svg.appendChild(p); box.appendChild(svg);
  }
}

function terminar() {
  const ms = Date.now() - inicio;
  parar();
  const hechas = respondida ? idx + 1 : idx;
  const total = conVidas && !vidas ? hechas : ronda.length;
  const pct = total ? Math.round(aciertos / total * 100) : 0;
  const aprobado = conVidas && !vidas ? false : pct >= 70;
  const estr = conVidas && !vidas ? 0 : estrellas(pct);

  // XP: una parte de los puntos de la ronda
  const xpGana = Math.round(puntos / 5);
  const xpAntes = perfil.xp;
  perfil.xp += xpGana;
  const ex = perfil.examen[vehiculo || "auto"];
  if (conVidas && aciertos > ex.mejor) { ex.mejor = aciertos; ex.total = ronda.length; }
  guardarPerfil();

  $("barra").style.width = "100%";
  $("rank").className = aprobado ? "rank" : "rank bad";
  $("rankBadge").textContent = conVidas && !vidas ? "SIN VIDAS" : aprobado ? "APROBADO" : "NO APROBADO";
  $("rankSello").setAttribute("d", aprobado ? "M138 86.5 144 92.5 155 80.5" : "M139 79 153 93 M153 79 139 93");
  pintarEstrellas(estr);
  $("score").innerHTML = '<span class="n"></span><span class="d"></span>';
  $("score").firstChild.textContent = aciertos;
  $("score").lastChild.textContent = " / " + total;
  $("pct").textContent = `${pct}% correctas · ${puntos} puntos en ${fmt(ms)}` + (pct === 100 ? " — ¡perfecto!" : "");

  $("tTotal").textContent = fmt(ms);
  $("tProm").textContent = (ms / Math.max(total, 1) / 1000).toFixed(1).replace(".", ",") + " s";
  $("sCombo").textContent = "x" + Math.max(comboMax, 1);
  $("sRacha").textContent = rachaMax;

  $("xpGanado").textContent = `+${xpGana} XP`;
  $("xpNivelTxt").textContent = `Nivel ${nivel(perfil.xp)} · ${perfil.xp % XP_NIVEL} / ${XP_NIVEL}`;
  const antes = nivel(xpAntes) === nivel(perfil.xp) ? xpAntes % XP_NIVEL : 0;
  $("xpBarPrev").style.width = (antes / XP_NIVEL * 100) + "%";
  $("xpBarNew").style.width = ((perfil.xp % XP_NIVEL - antes) / XP_NIVEL * 100) + "%";
  const falta = XP_NIVEL - perfil.xp % XP_NIVEL;
  $("xpFalta").textContent = `${falta} XP más y subís a Nivel ${nivel(perfil.xp) + 1} · ${nombreNivel(perfil.xp + XP_NIVEL)}`;

  $("repErr").hidden = !falladas.length;
  $("revCard").hidden = !falladas.length;
  $("repErrTxt").textContent = `Repasar ${falladas.length === 1 ? "la que fallé" : "las " + falladas.length + " que fallé"}`;
  $("revTitulo").textContent = `Para repasar · ${falladas.length}`;
  const ul = $("rev"); ul.innerHTML = "";
  for (const { r, elegida } of falladas) {
    const li = document.createElement("li");
    if (r.img) { const im = document.createElement("img"); im.src = r.img; im.alt = ""; li.appendChild(im); }
    const d = document.createElement("div");
    d.innerHTML = '<small></small><div class="ok"></div><small class="bad"></small>';
    d.children[0].textContent = r.img ? "Señal · " + r.it.tag : r.q;
    d.children[1].textContent = r.correcta;
    d.children[2].textContent = "Respondiste: " + elegida;
    li.appendChild(d); ul.appendChild(li);
  }

  Sonido.fin(aprobado);
  refrescarMenu();
  pantalla("fin");
}

document.querySelectorAll(".mode").forEach(b => b.onclick = () => empezar(b.dataset.mode));
$("salir").onclick = () => { parar(); $("stage").className = "card stage"; refrescarMenu(); pantalla("menu"); };
$("reiniciar").onclick = () => { parar(); empezar(ultimoModo); };
$("menuBtn").onclick = () => pantalla("menu");
$("otraVez").onclick = () => empezar(ultimoModo);
$("repErr").onclick = () => empezar("repaso", falladas.map(f => f.r.it));
$("btnPausa").onclick = pausar;
$("continuar").onclick = continuar;
$("btnSigue").onclick = () => { if (respondida && !pausadoDesde) siguiente(); };

// Si se sale de la app o se bloquea el celular, se pausa solo y se corta el sonido
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { if (reloj) pausar(); Sonido.dormir(); }
  else if (!pausadoDesde) Sonido.play();
});
window.addEventListener("pagehide", () => Sonido.dormir());

// La música arranca al entrar; si el navegador la bloquea, arranca con el primer toque
function activarSonido() {
  if (!pausadoDesde) Sonido.play();
  setTimeout(() => {
    if (Sonido.bloqueado) return;
    $("avisoSonido").hidden = true;
    for (const ev of ["pointerdown", "keydown", "touchend"]) document.removeEventListener(ev, activarSonido, true);
  }, 150);
}
for (const ev of ["pointerdown", "keydown", "touchend"]) document.addEventListener(ev, activarSonido, true);
Sonido.play();
setTimeout(() => { $("avisoSonido").hidden = !Sonido.musica || !Sonido.bloqueado; }, 300);

document.addEventListener("keydown", e => {
  if ($("quiz").hidden) return;
  if (e.key === "Escape" || e.key === "p") return pausadoDesde ? continuar() : pausar();
  if (respondida && (e.key === "Enter" || e.key === " ")) return siguiente();
  if (respondida || pausadoDesde) return;
  const n = e.key >= "1" && e.key <= "4" ? +e.key - 1 : "abcd".indexOf(e.key.toLowerCase());
  if (n >= 0 && n < 4) responder(n);
});

pintarToggles();
refrescarMenu();
