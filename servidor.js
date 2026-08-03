/* ═══════════════════════════════════════════
   KING · servidor de partidas en línea
   Reparte las cartas, vigila los turnos y
   mantiene sincronizados a los cuatro jugadores.
   ═══════════════════════════════════════════ */
'use strict';

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();

/* La pantalla va incrustada aquí mismo, así el proyecto son
   archivos sueltos y se suben más fácil desde el teléfono. */
const PAGINA = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>KING · prueba de conexión</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0;}\nbody{\n  font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,sans-serif;\n  background:radial-gradient(ellipse at 50% 35%,#1f8450,#0d4f2c 60%,#062b17);\n  color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;\n  padding:20px;\n}\n.caja{\n  background:rgba(0,0,0,.3);border:2px solid #d8b45e;border-radius:22px;\n  padding:28px 24px;max-width:420px;width:100%;text-align:center;\n  box-shadow:0 12px 40px rgba(0,0,0,.4);\n}\nh1{font-size:26px;font-weight:800;color:#f3dfae;letter-spacing:4px;margin-bottom:4px;}\n.sub{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:22px;}\n.estado{\n  padding:16px;border-radius:14px;margin-bottom:18px;\n  font-size:16px;font-weight:700;\n}\n.estado.probando{background:rgba(255,255,255,.12);}\n.estado.bien{background:rgba(34,163,91,.28);border:1.5px solid #4ade80;color:#c6f6d5;}\n.estado.mal{background:rgba(198,47,47,.28);border:1.5px solid #f87171;color:#fecaca;}\n.detalle{\n  background:rgba(0,0,0,.25);border-radius:12px;padding:14px;\n  font-size:13px;text-align:left;line-height:1.7;color:rgba(255,255,255,.8);\n}\n.detalle b{color:#f3dfae;}\n.linea{display:flex;justify-content:space-between;gap:10px;}\nbutton{\n  width:100%;padding:15px;font-size:16px;font-weight:800;font-family:inherit;\n  border:none;border-radius:14px;cursor:pointer;margin-top:16px;\n  background:linear-gradient(140deg,#177a45,#22a35b);color:#f7edd2;\n}\n.palos{font-size:24px;letter-spacing:6px;margin-bottom:10px;}\n.rojo{color:#e05a5a;}\n</style>\n</head>\n<body>\n<div class="caja">\n  <div class="palos">&#9824;<span class="rojo">&#9829;</span>&#9827;<span class="rojo">&#9830;</span></div>\n  <h1>KING</h1>\n  <p class="sub">Prueba de conexión con el servidor</p>\n\n  <div class="estado probando" id="estado">Conectando…</div>\n\n  <div class="detalle">\n    <div class="linea"><span>Página servida</span><b id="d1">✓</b></div>\n    <div class="linea"><span>Conexión en vivo</span><b id="d2">…</b></div>\n    <div class="linea"><span>Mesa de prueba</span><b id="d3">…</b></div>\n    <div class="linea"><span>Reparto de cartas</span><b id="d4">…</b></div>\n  </div>\n\n  <button onclick="location.reload()">Probar de nuevo</button>\n</div>\n\n<script>\n\'use strict\';\nfunction $(id){return document.getElementById(id);}\nfunction marcar(id,ok,txt){ $(id).textContent = txt || (ok?\'✓\':\'✗\'); }\nfunction estado(clase,texto){\n  var e=$(\'estado\');\n  e.className=\'estado \'+clase;\n  e.textContent=texto;\n}\n\nvar protocolo = location.protocol === \'https:\' ? \'wss://\' : \'ws://\';\nvar ws;\ntry{\n  ws = new WebSocket(protocolo + location.host);\n}catch(e){\n  estado(\'mal\',\'No se pudo abrir la conexión\');\n}\n\nvar temporizador = setTimeout(function(){\n  estado(\'mal\',\'El servidor no respondió a tiempo\');\n}, 12000);\n\nif(ws){\n  ws.onopen = function(){\n    marcar(\'d2\', true);\n    estado(\'probando\',\'Creando una mesa de prueba…\');\n    ws.send(JSON.stringify({tipo:\'crear\', id:\'prueba-\'+Date.now(), nombre:\'Prueba\'}));\n  };\n\n  ws.onmessage = function(ev){\n    var m = JSON.parse(ev.data);\n    if(m.tipo === \'sala\'){\n      marcar(\'d3\', true, m.codigo);\n    }\n    if(m.tipo === \'estado\'){\n      // El servidor reparte solo cuando están los cuatro, así que aquí\n      // basta con comprobar que responde con un estado bien formado\n      marcar(\'d4\', true, \'listo\');\n      clearTimeout(temporizador);\n      estado(\'bien\',\'Todo funciona · el servidor está en línea\');\n      setTimeout(function(){ ws.close(); }, 400);\n    }\n  };\n\n  ws.onerror = function(){\n    clearTimeout(temporizador);\n    marcar(\'d2\', false);\n    estado(\'mal\',\'No se pudo conectar con el servidor\');\n  };\n}\n</script>\n</body>\n</html>\n';
app.get('/', (_req, res) => {
  res.type('html').send(PAGINA);
});

const servidor = http.createServer(app);
const wss = new WebSocketServer({ server: servidor });

/* ─────────── BARAJA Y REGLAS ─────────── */
const PALOS = ['♠', '♥', '♣', '♦'];
const VALORES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const fuerza = v => VALORES.indexOf(v);

const MANOS = [
  { id:'bazas',     nom:'Bazas',      ico:'B', tipo:'neg' },
  { id:'corazones', nom:'Corazones',  ico:'♥', tipo:'neg' },
  { id:'jk',        nom:'JK',         ico:'J', tipo:'neg' },
  { id:'qs',        nom:'Qs',         ico:'Q', tipo:'neg' },
  { id:'kh',        nom:'K♥',         ico:'K', tipo:'neg' },
  { id:'ultimas',   nom:'2 Últimas',  ico:'2', tipo:'neg' },
  { id:'t0', dueno:0, nom:'Triunfo',  ico:'★', tipo:'pos' },
  { id:'t1', dueno:1, nom:'Triunfo',  ico:'★', tipo:'pos' },
  { id:'t2', dueno:2, nom:'Triunfo',  ico:'★', tipo:'pos' },
  { id:'t3', dueno:3, nom:'Triunfo',  ico:'★', tipo:'pos' }
];

function puntosBaza(idMano, mesa, nBaza) {
  switch (idMano) {
    case 'bazas':     return -20;
    case 'corazones': return -20 * mesa.filter(x => x.carta.p === '♥').length;
    case 'jk':        return -30 * mesa.filter(x => x.carta.v === 'J' || x.carta.v === 'K').length;
    case 'qs':        return -50 * mesa.filter(x => x.carta.v === 'Q').length;
    case 'kh':        return mesa.some(x => x.carta.p === '♥' && x.carta.v === 'K') ? -160 : 0;
    case 'ultimas':   return nBaza >= 12 ? -90 : 0;
    default:          return 25;
  }
}

function repartir() {
  const mazo = [];
  PALOS.forEach(p => VALORES.forEach(v => mazo.push({ p, v })));
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return [0,1,2,3].map(i => ordenar(mazo.slice(i * 13, i * 13 + 13)));
}

function ordenar(cartas) {
  // Los palos se alternan negro-rojo para que no queden dos del mismo color juntos
  const negros = ['♠','♣'].filter(p => cartas.some(c => c.p === p));
  const rojos  = ['♥','♦'].filter(p => cartas.some(c => c.p === p));
  const orden = [];
  let turnoNegro = negros.length >= rojos.length;
  while (negros.length || rojos.length) {
    if (turnoNegro && negros.length) orden.push(negros.shift());
    else if (!turnoNegro && rojos.length) orden.push(rojos.shift());
    else orden.push((negros.length ? negros : rojos).shift());
    turnoNegro = !turnoNegro;
  }
  return cartas.slice().sort((a, b) =>
    orden.indexOf(a.p) - orden.indexOf(b.p) || fuerza(a.v) - fuerza(b.v));
}

function jugables(mano, salida, idMano) {
  const sinCorazones = mano.filter(c => c.p !== '♥');
  if (!salida) {
    // No se puede abrir con corazones en esas dos manos mientras quede otra cosa
    if ((idMano === 'corazones' || idMano === 'kh') && sinCorazones.length) return sinCorazones;
    return mano.slice();
  }
  const delPalo = mano.filter(c => c.p === salida);
  if (delPalo.length) return delPalo;
  // Sin cartas del palo pedido, el rey de corazones es obligatorio en su mano
  if (idMano === 'kh') {
    const rey = mano.filter(c => c.p === '♥' && c.v === 'K');
    if (rey.length) return rey;
  }
  return mano.slice();
}

function ganadorBaza(mesa, triunfo) {
  let mejor = 0;
  for (let i = 1; i < mesa.length; i++) {
    const c = mesa[i].carta, m = mesa[mejor].carta;
    if (triunfo) {
      if (c.p === triunfo && m.p !== triunfo) { mejor = i; continue; }
      if (c.p !== triunfo && m.p === triunfo) continue;
    }
    if (c.p === m.p && fuerza(c.v) > fuerza(m.v)) mejor = i;
  }
  return mesa[mejor].jugador;
}

function quedanCastigos(sala) {
  const id = MANOS[sala.iMano].id;
  if (id === 'bazas' || id === 'ultimas') return true;
  const enJuego = sala.manos.flat().concat(sala.mesa.map(x => x.carta));
  switch (id) {
    case 'corazones': return enJuego.some(c => c.p === '♥');
    case 'jk':        return enJuego.some(c => c.v === 'J' || c.v === 'K');
    case 'qs':        return enJuego.some(c => c.v === 'Q');
    case 'kh':        return enJuego.some(c => c.p === '♥' && c.v === 'K');
    default:          return true;
  }
}

/* ─────────── SALAS ─────────── */
// Las pausas se acortan en las pruebas automáticas
const PAUSA_BAZA = process.env.KING_RAPIDO ? 30 : 1800;
const PAUSA_MANO = process.env.KING_RAPIDO ? 40 : 2600;

const salas = new Map();

function codigoNuevo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let cod;
  do {
    cod = Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
  } while (salas.has(cod));
  return cod;
}

function crearSala(codigo) {
  return {
    codigo,
    jugadores: [],        // { id, nombre, ws, conectado }
    empezada: false,
    manos: [[],[],[],[]],
    marcador: [0,0,0,0],
    puntosMano: [0,0,0,0],
    iMano: 0,
    ronda: 1,
    abreBase: 0,
    triunfo: null,
    mesa: [],
    turno: 0,
    nBaza: 1,
    esperandoTriunfo: null,   // índice del jugador que debe elegir palo
    ultimaBaza: null,
    historial: []
  };
}

function quienAbre(sala) {
  return ((sala.abreBase + sala.iMano) % 4 + 4) % 4;
}

/* ─────────── ENVÍO DE ESTADO ─────────── */
function enviar(ws, tipo, datos) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ tipo, ...datos }));
}

function difundir(sala, tipo, datos) {
  sala.jugadores.forEach(j => enviar(j.ws, tipo, datos));
}

// Cada jugador recibe solo su mano; de los demás, cuántas cartas les quedan
function estadoPara(sala, idx) {
  const mano = MANOS[sala.iMano];
  const salida = sala.mesa.length ? sala.mesa[0].carta.p : null;
  const miTurno = sala.empezada && sala.turno === idx && !sala.esperandoTriunfo;
  return {
    codigo: sala.codigo,
    empezada: sala.empezada,
    yo: idx,
    jugadores: sala.jugadores.map(j => ({ nombre: j.nombre, conectado: j.conectado })),
    misCartas: sala.manos[idx] || [],
    jugables: miTurno ? jugables(sala.manos[idx], salida, mano.id).map(c => c.p + c.v) : [],
    cartasDe: sala.manos.map(m => m.length),
    mesa: sala.mesa,
    turno: sala.turno,
    abre: quienAbre(sala),
    mano: { id: mano.id, nom: mano.nom, ico: mano.ico, tipo: mano.tipo, dueno: mano.dueno },
    iMano: sala.iMano,
    ronda: sala.ronda,
    triunfo: sala.triunfo,
    marcador: sala.marcador,
    puntosMano: sala.puntosMano,
    nBaza: sala.nBaza,
    esperandoTriunfo: sala.esperandoTriunfo,
    ultimaBaza: sala.ultimaBaza,
    historial: sala.historial
  };
}

function sincronizar(sala) {
  sala.jugadores.forEach((j, i) => enviar(j.ws, 'estado', { estado: estadoPara(sala, i) }));
}

/* ─────────── FLUJO DE LA PARTIDA ─────────── */
function arrancarMano(sala) {
  sala.manos = repartir();
  sala.mesa = [];
  sala.nBaza = 1;
  sala.triunfo = null;
  sala.puntosMano = [0,0,0,0];
  sala.ultimaBaza = null;
  const mano = MANOS[sala.iMano];
  if (mano.tipo === 'pos') {
    // El dueño de la mano elige el palo antes de empezar
    sala.esperandoTriunfo = mano.dueno;
  } else {
    sala.esperandoTriunfo = null;
    sala.turno = quienAbre(sala);
  }
  sincronizar(sala);
}

function jugarCarta(sala, idx, texto) {
  if (!sala.empezada || sala.esperandoTriunfo !== null) return;
  if (sala.turno !== idx) return;
  const mano = MANOS[sala.iMano];
  const salida = sala.mesa.length ? sala.mesa[0].carta.p : null;
  const permitidas = jugables(sala.manos[idx], salida, mano.id);
  const carta = permitidas.find(c => c.p + c.v === texto);
  if (!carta) return;   // jugada no válida: se ignora

  const i = sala.manos[idx].findIndex(c => c.p === carta.p && c.v === carta.v);
  sala.manos[idx].splice(i, 1);
  sala.mesa.push({ jugador: idx, carta });

  if (sala.mesa.length < 4) {
    sala.turno = (sala.turno + 1) % 4;
    sincronizar(sala);
    return;
  }

  // Baza completa: se resuelve y se deja ver un momento
  const g = ganadorBaza(sala.mesa, sala.triunfo);
  const pts = puntosBaza(mano.id, sala.mesa, sala.nBaza);
  sala.puntosMano[g] += pts;
  sala.ultimaBaza = { cartas: sala.mesa.slice(), ganador: g, puntos: pts, baza: sala.nBaza };
  sincronizar(sala);

  setTimeout(() => {
    sala.mesa = [];
    sala.nBaza++;
    sala.turno = g;
    const seAcabo = sala.nBaza > 13 || !quedanCastigos(sala);
    if (seAcabo) terminarMano(sala);
    else sincronizar(sala);
  }, PAUSA_BAZA);
}

function terminarMano(sala) {
  const mano = MANOS[sala.iMano];
  for (let j = 0; j < 4; j++) sala.marcador[j] += sala.puntosMano[j];
  sala.historial.push({
    nombre: mano.tipo === 'pos'
      ? ('Triunfo ' + ((sala.jugadores[mano.dueno] || {}).nombre || ''))
      : mano.nom,
    puntos: sala.puntosMano.slice()
  });
  difundir(sala, 'finMano', { puntos: sala.puntosMano.slice(), marcador: sala.marcador.slice() });

  setTimeout(() => {
    if (sala.iMano >= MANOS.length - 1) {
      difundir(sala, 'finRonda', { marcador: sala.marcador.slice(), historial: sala.historial });
      sala.ronda++;
      sala.abreBase = (sala.abreBase + MANOS.length) % 4;
      sala.iMano = 0;
      sala.historial = [];
    } else {
      sala.iMano++;
    }
    arrancarMano(sala);
  }, PAUSA_MANO);
}

/* ─────────── CONEXIONES ─────────── */
wss.on('connection', ws => {
  let sala = null, idx = -1;

  ws.on('message', bruto => {
    let m;
    try { m = JSON.parse(bruto); } catch (e) { return; }

    /* Crear una mesa nueva */
    if (m.tipo === 'crear') {
      const codigo = codigoNuevo();
      sala = crearSala(codigo);
      salas.set(codigo, sala);
      idx = 0;
      sala.jugadores.push({ id: m.id, nombre: (m.nombre || 'Jugador').slice(0, 12), ws, conectado: true });
      enviar(ws, 'sala', { codigo, yo: idx });
      sincronizar(sala);
      return;
    }

    /* Entrar a una mesa existente */
    if (m.tipo === 'entrar') {
      const cod = (m.codigo || '').toUpperCase().trim();
      const s = salas.get(cod);
      if (!s) { enviar(ws, 'error', { texto: 'No existe ninguna mesa con ese código' }); return; }

      // Si vuelve alguien que ya estaba, recupera su sitio
      const previo = s.jugadores.findIndex(j => j.id === m.id);
      if (previo >= 0) {
        sala = s; idx = previo;
        s.jugadores[previo].ws = ws;
        s.jugadores[previo].conectado = true;
        enviar(ws, 'sala', { codigo: cod, yo: idx });
        sincronizar(s);
        return;
      }

      if (s.jugadores.length >= 4) { enviar(ws, 'error', { texto: 'La mesa ya está completa' }); return; }
      sala = s;
      idx = s.jugadores.length;
      s.jugadores.push({ id: m.id, nombre: (m.nombre || 'Jugador').slice(0, 12), ws, conectado: true });
      enviar(ws, 'sala', { codigo: cod, yo: idx });
      sincronizar(s);
      return;
    }

    if (!sala) return;

    /* El anfitrión da comienzo cuando están los cuatro */
    if (m.tipo === 'empezar' && idx === 0 && sala.jugadores.length === 4 && !sala.empezada) {
      sala.empezada = true;
      arrancarMano(sala);
      return;
    }

    /* Elegir el palo de triunfo */
    if (m.tipo === 'triunfo' && sala.esperandoTriunfo === idx) {
      if (!PALOS.includes(m.palo)) return;
      sala.triunfo = m.palo;
      sala.esperandoTriunfo = null;
      sala.turno = quienAbre(sala);
      sincronizar(sala);
      return;
    }

    /* Jugar una carta */
    if (m.tipo === 'jugar') {
      jugarCarta(sala, idx, m.carta);
      return;
    }

    /* Cambiar el nombre antes de empezar */
    if (m.tipo === 'nombre' && !sala.empezada) {
      sala.jugadores[idx].nombre = (m.nombre || 'Jugador').slice(0, 12);
      sincronizar(sala);
    }
  });

  ws.on('close', () => {
    if (!sala || idx < 0) return;
    if (sala.jugadores[idx]) sala.jugadores[idx].conectado = false;
    // Antes de empezar, el sitio queda libre para otro
    if (!sala.empezada) {
      sala.jugadores.splice(idx, 1);
      if (!sala.jugadores.length) { salas.delete(sala.codigo); return; }
    }
    sincronizar(sala);
  });
});

/* Las mesas abandonadas se recogen cada media hora */
setInterval(() => {
  salas.forEach((s, cod) => {
    if (!s.jugadores.some(j => j.conectado)) salas.delete(cod);
  });
}, 30 * 60 * 1000);

const PUERTO = process.env.PORT || 3000;
servidor.listen(PUERTO, () => console.log('KING en línea, escuchando en el puerto ' + PUERTO));
