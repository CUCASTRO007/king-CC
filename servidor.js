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
const PAGINA = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="KING">\n<meta name="theme-color" content="#0d4f2c">\n<title>KING · en línea</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}\n:root{\n  --oro:#d8b45e; --rojo:#c62f2f; --tinta:#16202c;\n  --sombra:0 3px 10px rgba(0,0,0,.22);\n}\nhtml,body{height:100%;overflow:hidden;}\nbody{\n  font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,sans-serif;\n  background:\n    repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.05) 2px,rgba(0,0,0,.05) 3px),\n    repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(0,0,0,.05) 2px,rgba(0,0,0,.05) 3px),\n    radial-gradient(ellipse 70% 46% at 50% 40%,rgba(255,255,235,.13),transparent 70%),\n    radial-gradient(ellipse at 50% 40%,#1f8450,#0d4f2c 58%,#062b17);\n  color:#fff;display:flex;flex-direction:column;user-select:none;\n}\n.oculto{display:none!important;}\n\n/* ══ PANTALLAS DE ENTRADA ══ */\n.portada{\n  position:fixed;inset:0;z-index:200;display:flex;\n  align-items:center;justify-content:center;padding:20px;overflow:auto;\n}\n.panel{\n  background:rgba(6,32,18,.92);border:2px solid var(--oro);border-radius:24px;\n  padding:26px 22px;width:100%;max-width:420px;\n  box-shadow:0 16px 50px rgba(0,0,0,.45);\n}\n.palos-marca{font-size:26px;letter-spacing:8px;text-align:center;margin-bottom:6px;}\n.palos-marca .r{color:#e05a5a;}\n.panel h1{font-size:30px;font-weight:800;color:#f3dfae;letter-spacing:7px;text-align:center;}\n.panel h2{font-size:20px;font-weight:800;color:#f3dfae;text-align:center;}\n.panel .sub{font-size:13px;color:rgba(255,255,255,.6);text-align:center;margin:5px 0 20px;}\n.campo{margin-bottom:14px;}\n.campo label{\n  display:block;font-size:12px;font-weight:700;color:rgba(255,255,255,.55);\n  text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;\n}\n.campo input{\n  width:100%;padding:14px 16px;font-size:17px;font-family:inherit;font-weight:600;\n  border:2px solid rgba(255,255,255,.16);border-radius:14px;\n  background:rgba(255,255,255,.07);color:#fff;\n}\n.campo input:focus{outline:none;border-color:var(--oro);background:rgba(255,255,255,.12);}\n.campo input.codigo{\n  text-align:center;font-size:30px;letter-spacing:10px;font-weight:800;\n  text-transform:uppercase;padding:16px 10px 16px 20px;\n}\n.btn{\n  width:100%;padding:16px;font-size:17px;font-weight:800;font-family:inherit;\n  border:none;border-radius:15px;cursor:pointer;margin-top:10px;\n  background:linear-gradient(140deg,#177a45,#22a35b);color:#f7edd2;\n}\n.btn:active{transform:scale(.98);}\n.btn.gris{background:rgba(255,255,255,.12);color:#fff;}\n.btn.oro{background:linear-gradient(140deg,#c9a139,#e5c469);color:#3a2c08;}\n.btn:disabled{opacity:.45;}\n.aviso-error{\n  background:rgba(198,47,47,.3);border:1.5px solid #f08a8a;border-radius:12px;\n  padding:12px 14px;font-size:14px;margin-bottom:14px;color:#ffd9d9;\n}\n.separador{\n  display:flex;align-items:center;gap:12px;margin:20px 0 14px;\n  font-size:12px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:1px;\n}\n.separador::before,.separador::after{content:\'\';flex:1;height:1px;background:rgba(255,255,255,.15);}\n\n/* ══ SALA DE ESPERA ══ */\n.codigo-mesa{\n  background:rgba(216,180,94,.14);border:2px dashed var(--oro);border-radius:16px;\n  padding:16px;text-align:center;margin-bottom:18px;\n}\n.codigo-mesa .etiqueta{font-size:12px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;}\n.codigo-mesa .valor{font-size:42px;font-weight:800;color:#f3dfae;letter-spacing:10px;margin:4px 0 2px;}\n.codigo-mesa .pista{font-size:12px;color:rgba(255,255,255,.5);}\n.lista-espera{margin-bottom:16px;}\n.silla{\n  display:flex;align-items:center;gap:12px;padding:13px 14px;\n  background:rgba(255,255,255,.06);border-radius:14px;margin-bottom:8px;\n}\n.silla.vacia{background:rgba(255,255,255,.03);border:1.5px dashed rgba(255,255,255,.15);}\n.silla .num{\n  width:32px;height:32px;border-radius:50%;flex-shrink:0;\n  display:flex;align-items:center;justify-content:center;\n  font-size:12px;font-weight:800;color:#fff;\n  border:2px solid rgba(255,255,255,.25);\n}\n.silla .quien{flex:1;font-size:16px;font-weight:700;}\n.silla .marca{font-size:12px;color:var(--oro);font-weight:700;}\n.silla.vacia .quien{color:rgba(255,255,255,.35);font-weight:500;}\n\n/* ══ MESA ══ */\n.esquina{position:absolute;top:12px;left:12px;z-index:20;}\n.sello-mano{\n  width:64px;height:64px;border-radius:15px;cursor:pointer;\n  display:flex;align-items:center;justify-content:center;position:relative;\n  border:2.5px solid var(--oro);\n  box-shadow:0 5px 18px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.22);\n}\n.sello-mano.neg{background:linear-gradient(150deg,#8f1d1d,#5f1212);}\n.sello-mano.pos{background:linear-gradient(150deg,#177a45,#0e5c33);}\n.sello-mano svg{width:54px;height:54px;}\n.contador-mano{\n  margin-top:6px;background:rgba(245,247,244,.93);color:#16202c;\n  border-radius:9px;padding:3px 9px;font-size:13px;font-weight:600;text-align:center;\n}\n.contador-mano b{font-size:16px;font-weight:800;}\n\n.mesa{flex:1;position:relative;min-height:0;}\n.mesa::before{\n  content:\'\';position:absolute;inset:0;pointer-events:none;z-index:1;\n  box-shadow:inset 0 0 90px rgba(0,0,0,.42);\n}\n.puesto{position:absolute;display:flex;flex-direction:column;align-items:center;gap:5px;}\n.puesto.norte{top:8px;left:50%;transform:translateX(-50%);}\n.puesto.oeste{left:6px;top:40%;transform:translateY(-50%);align-items:flex-start;max-width:38%;}\n.puesto.este{right:6px;top:40%;transform:translateY(-50%);align-items:flex-end;max-width:38%;}\n.ficha{\n  display:flex;align-items:center;gap:8px;white-space:nowrap;\n  background:rgba(0,0,0,.34);border-radius:999px;padding:5px 12px 5px 5px;\n  border:1.5px solid transparent;transition:.2s;\n}\n@keyframes late{\n  0%,100%{box-shadow:0 0 0 0 rgba(216,180,94,.5);}\n  55%{box-shadow:0 0 0 7px rgba(216,180,94,0);}\n}\n.ficha.turno{border-color:var(--oro);background:rgba(216,180,94,.18);animation:late 1.5s ease-out infinite;}\n.ficha.caido{opacity:.45;}\n.avatar{\n  width:31px;height:31px;border-radius:50%;flex-shrink:0;\n  display:flex;align-items:center;justify-content:center;\n  font-size:12px;font-weight:800;color:#fff;\n  border:2px solid rgba(255,255,255,.28);\n  box-shadow:0 2px 6px rgba(0,0,0,.35),inset 0 2px 4px rgba(255,255,255,.3);\n}\n.ficha-txt{line-height:1.15;}\n.ficha-nom{font-size:13px;font-weight:700;}\n.ficha-pts{font-size:11px;color:rgba(255,255,255,.6);}\n.totem{width:22px;height:30px;flex-shrink:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));}\n.totem svg{width:100%;height:100%;}\n.dorsos{display:flex;}\n.dorso{\n  width:15px;height:21px;border-radius:3px;margin-left:-9px;\n  background:\n    radial-gradient(circle at 50% 50%,#e8cf92 0 22%,transparent 23%),\n    repeating-linear-gradient(45deg,rgba(190,60,45,.5) 0 2px,transparent 2px 4px),\n    linear-gradient(150deg,#d8bd83,#c9a765);\n  border:1.5px solid #fff;\n}\n.dorso:first-child{margin-left:0;}\n\n.centro{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:250px;height:236px;}\n.jugada{position:absolute;}\n.jugada.sur{bottom:0;left:50%;transform:translateX(-50%) rotate(1.5deg);}\n.jugada.norte{top:0;left:50%;transform:translateX(-50%) rotate(-2deg);}\n.jugada.oeste{left:0;top:50%;transform:translateY(-50%) rotate(-3deg);}\n.jugada.este{right:0;top:50%;transform:translateY(-50%) rotate(2.5deg);}\n@keyframes destello{\n  35%{box-shadow:0 0 0 5px #ffe9a8,0 0 30px rgba(255,222,140,.9);}\n}\n.jugada.ganadora .carta{transform:scale(1.1);animation:destello .55s ease-out;}\n.jugada.ganadora{z-index:6;}\n.marca-pts{\n  position:absolute;top:-14px;left:50%;transform:translateX(-50%);\n  font-size:15px;font-weight:800;padding:3px 10px;border-radius:999px;white-space:nowrap;\n  box-shadow:0 3px 10px rgba(0,0,0,.35);\n}\n.marca-pts.menos{background:#c62f2f;color:#fff;}\n.marca-pts.mas{background:#1c9c56;color:#fff;}\n\n/* ══ CARTAS ══ */\n.carta,.carta-mano{\n  background:linear-gradient(170deg,#fff 0%,#fdfdfc 60%,#f7f8f6 100%);\n  border:1px solid rgba(20,25,30,.16);\n  position:relative;color:#111;font-weight:600;line-height:1;\n  display:flex;align-items:center;justify-content:center;overflow:hidden;\n}\n.carta{width:72px;height:101px;border-radius:9px;box-shadow:0 5px 13px rgba(0,0,0,.4);}\n.carta.roja,.carta-mano.roja{color:#d81f26;}\n.esq{\n  position:absolute;display:flex;flex-direction:column;align-items:center;\n  line-height:.86;z-index:2;\n}\n.esq.ai{top:5px;left:6px;}\n.esq.bd{bottom:5px;right:6px;transform:rotate(180deg);}\n.esq b{font-size:1.75em;letter-spacing:-1px;font-weight:700;line-height:.8;}\n.esq i{font-style:normal;font-size:1.15em;margin-top:2px;line-height:.9;}\n.carta .esq{font-size:12px;}\n.carta-mano .esq{font-size:13px;}\n.medallon{width:50%;height:56%;}\n.medallon.pips{width:52%;height:60%;}\n.medallon.as{width:50%;height:56%;}\n.medallon.figura{width:52%;height:60%;}\n\n.zona-mano{flex-shrink:0;padding:14px 8px 10px;position:relative;}\n.zona-mano::before{\n  content:\'\';position:absolute;top:-26px;left:-14%;right:-14%;height:70px;\n  border-radius:50%;pointer-events:none;\n  border-top:2.5px solid rgba(216,180,94,.6);\n  box-shadow:0 -3px 16px rgba(0,0,0,.32);\n  background:linear-gradient(180deg,transparent 46%,rgba(6,40,22,.5));\n}\n.mano{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 4px 2px;\n  --ancho:74px;--alto:105px;--solape:-34px;}\n.mano.dos-filas{gap:0;}\n.mano.dos-filas .fila:last-child{margin-top:calc(var(--alto) * -0.38);z-index:3;}\n.fila{display:flex;justify-content:center;align-items:flex-start;}\n.carta-mano{\n  width:var(--ancho);height:var(--alto);border-radius:10px;\n  box-shadow:0 4px 11px rgba(0,0,0,.34);margin-left:var(--solape);flex-shrink:0;\n  transition:margin-left .24s ease,transform .18s ease,opacity .18s,box-shadow .18s;\n}\n.fila .carta-mano:first-child{margin-left:0;}\n.carta-mano.nuevo-palo{margin-left:calc(var(--solape) + 13px);}\n.fila .carta-mano.nuevo-palo:first-child{margin-left:0;}\n.carta-mano.jugable{box-shadow:0 4px 11px rgba(0,0,0,.34),0 0 0 2px rgba(52,196,111,.85);cursor:pointer;}\n.carta-mano.jugable:active{transform:translateY(-18px) scale(1.05)!important;z-index:9;}\n.carta-mano.vetada{opacity:.62;}\n.tu-ficha{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;position:relative;}\n\n/* ══ MENSAJES ══ */\n.puntos-mano{\n  position:absolute;left:50%;top:-18px;\n  padding:7px 16px;border-radius:999px;\n  font-size:21px;font-weight:800;white-space:nowrap;z-index:45;\n  border:2px solid rgba(255,255,255,.55);\n  box-shadow:0 5px 18px rgba(0,0,0,.45);\n  animation:brota 1.9s ease-out both;\n}\n@keyframes brota{\n  0%{opacity:0;transform:translate(-50%,10px) scale(.7);}\n  20%{opacity:1;transform:translate(-50%,-4px) scale(1.06);}\n  30%{transform:translate(-50%,0) scale(1);}\n  82%{opacity:1;transform:translate(-50%,0) scale(1);}\n  100%{opacity:0;transform:translate(-50%,-14px) scale(.95);}\n}\n.puntos-mano.suma{background:linear-gradient(165deg,#5fd07a,#218b45);color:#fff;}\n.puntos-mano.resta{background:linear-gradient(165deg,#e8544c,#a81d1d);color:#fff;}\n.puntos-mano.cero{background:linear-gradient(165deg,#eef1f3,#c9d0d6);color:#26313c;}\n\n.cartel{\n  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);\n  background:rgba(8,32,20,.94);border:2px solid var(--oro);border-radius:16px;\n  padding:16px 22px;text-align:center;z-index:60;max-width:82%;\n}\n.cartel h3{font-size:17px;font-weight:800;color:var(--oro);}\n.cartel p{font-size:14px;margin-top:5px;color:rgba(255,255,255,.85);}\n\n.palos-elegir{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0;}\n.palo-op{\n  padding:18px 6px;border-radius:14px;border:2px solid rgba(255,255,255,.16);\n  background:rgba(255,255,255,.07);cursor:pointer;text-align:center;font-family:inherit;\n}\n.palo-op b{display:block;font-size:32px;line-height:1;color:#fff;}\n.palo-op.roja b{color:#ff8080;}\n.palo-op span{display:block;font-size:11px;color:rgba(255,255,255,.6);margin-top:6px;}\n.palo-op.mejor{border-color:var(--oro);background:rgba(216,180,94,.16);}\n\n.tabla{width:100%;border-collapse:collapse;font-size:15px;margin-bottom:16px;}\n.tabla td{padding:11px 10px;border-top:1px solid rgba(255,255,255,.1);}\n.tabla td:last-child{text-align:right;font-weight:800;}\n.tabla tr:first-child td{border-top:none;}\n.pos{color:#4ade80;} .neg{color:#f87171;}\n.estado-red{\n  position:fixed;top:0;left:0;right:0;z-index:300;\n  background:#b3202a;color:#fff;text-align:center;\n  padding:9px;font-size:13px;font-weight:700;\n}\n\n@media(max-width:400px){\n  .centro{width:210px;height:200px;}\n  .carta{width:62px;height:88px;}\n  .panel{padding:22px 18px;}\n  .campo input.codigo{font-size:26px;letter-spacing:8px;}\n}\n</style>\n</head>\n<body>\n\n<div class="estado-red oculto" id="estado-red">Reconectando…</div>\n\n<!-- ══ ENTRADA ══ -->\n<div class="portada" id="portada">\n  <div class="panel">\n    <div class="palos-marca">&#9824;<span class="r">&#9829;</span>&#9827;<span class="r">&#9830;</span></div>\n    <h1>KING</h1>\n    <p class="sub">Cuatro jugadores, cada uno en su teléfono</p>\n\n    <div id="error-entrada"></div>\n\n    <div class="campo">\n      <label>Tu nombre</label>\n      <input type="text" id="mi-nombre" maxlength="12" placeholder="¿Cómo te llamas?">\n    </div>\n\n    <button class="btn" onclick="crearMesa()">Crear una mesa</button>\n\n    <div class="separador">o entra a una</div>\n\n    <div class="campo">\n      <label>Código de la mesa</label>\n      <input type="text" id="codigo-entrada" class="codigo" maxlength="4" placeholder="····"\n             autocapitalize="characters" autocomplete="off">\n    </div>\n    <button class="btn gris" onclick="entrarMesa()">Entrar</button>\n  </div>\n</div>\n\n<!-- ══ SALA DE ESPERA ══ -->\n<div class="portada oculto" id="espera">\n  <div class="panel">\n    <h2>Mesa lista</h2>\n    <p class="sub">Comparte el código con los demás</p>\n\n    <div class="codigo-mesa">\n      <div class="etiqueta">Código</div>\n      <div class="valor" id="codigo-mesa">····</div>\n      <div class="pista">Toca para copiarlo</div>\n    </div>\n\n    <div class="lista-espera" id="lista-espera"></div>\n\n    <button class="btn oculto" id="btn-empezar" onclick="empezar()">Empezar la partida</button>\n    <p class="sub oculto" id="aviso-espera">Esperando a que el anfitrión empiece…</p>\n  </div>\n</div>\n\n<!-- ══ MESA DE JUEGO ══ -->\n<div class="esquina oculto" id="esquina">\n  <div class="sello-mano neg" id="sello" onclick="verMarcador()"></div>\n  <div class="contador-mano" id="contador"><b>1</b>/10</div>\n</div>\n\n<div class="mesa oculto" id="mesa">\n  <div class="puesto norte" id="puesto-norte"></div>\n  <div class="puesto oeste" id="puesto-oeste"></div>\n  <div class="puesto este" id="puesto-este"></div>\n  <div class="centro" id="centro"></div>\n</div>\n\n<div class="zona-mano oculto" id="zona-mano">\n  <div class="mano" id="mi-mano"></div>\n  <div class="tu-ficha" id="tu-ficha"></div>\n</div>\n\n<script>\n\'use strict\';\n\n/* ═════ IDENTIDAD ═════ */\nvar MI_ID = localStorage.getItem(\'king_id\');\nif (!MI_ID) {\n  MI_ID = \'j\' + Date.now() + Math.random().toString(36).slice(2, 8);\n  try { localStorage.setItem(\'king_id\', MI_ID); } catch (e) {}\n}\n\nvar PALOS = [\'\\u2660\',\'\\u2665\',\'\\u2663\',\'\\u2666\'];\nvar COLORES = [\'#0ea5e9\',\'#ec4899\',\'#7c3aed\',\'#15a35b\'];\nvar PUESTOS = [\'sur\',\'oeste\',\'norte\',\'este\'];\n\nvar ws = null, estado = null, miSitio = -1, codigoActual = null;\nvar ultimaMesaVista = 0;\n\nfunction $(id){ return document.getElementById(id); }\nfunction esRoja(p){ return p === \'\\u2665\' || p === \'\\u2666\'; }\n\n/* ═════ CONEXIÓN ═════ */\nfunction conectar(alAbrir){\n  var protocolo = location.protocol === \'https:\' ? \'wss://\' : \'ws://\';\n  ws = new WebSocket(protocolo + location.host);\n\n  ws.onopen = function(){\n    $(\'estado-red\').classList.add(\'oculto\');\n    if (alAbrir) alAbrir();\n  };\n\n  ws.onmessage = function(ev){\n    var m = JSON.parse(ev.data);\n\n    if (m.tipo === \'error\'){\n      mostrarError(m.texto);\n      return;\n    }\n    if (m.tipo === \'sala\'){\n      codigoActual = m.codigo;\n      miSitio = m.yo;\n      try { localStorage.setItem(\'king_mesa\', m.codigo); } catch(e){}\n      return;\n    }\n    if (m.tipo === \'estado\'){\n      estado = m.estado;\n      miSitio = estado.yo;\n      pintar();\n      return;\n    }\n    if (m.tipo === \'finMano\'){\n      mostrarPuntosMano(m.puntos);\n      return;\n    }\n    if (m.tipo === \'finRonda\'){\n      mostrarFinRonda(m.marcador);\n      return;\n    }\n  };\n\n  ws.onclose = function(){\n    $(\'estado-red\').classList.remove(\'oculto\');\n    // Vuelve a entrar sola a la misma mesa\n    setTimeout(function(){\n      conectar(function(){\n        if (codigoActual) {\n          enviar({ tipo:\'entrar\', codigo: codigoActual, id: MI_ID, nombre: miNombre() });\n        }\n      });\n    }, 2000);\n  };\n}\n\nfunction enviar(obj){\n  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));\n}\n\nfunction miNombre(){\n  var v = ($(\'mi-nombre\').value || \'\').trim();\n  if (!v) v = localStorage.getItem(\'king_nombre\') || \'\';\n  return v || \'Jugador\';\n}\n\nfunction mostrarError(texto){\n  $(\'error-entrada\').innerHTML = \'<div class="aviso-error">\' + texto + \'</div>\';\n  setTimeout(function(){ $(\'error-entrada\').innerHTML = \'\'; }, 4000);\n}\n\n/* ═════ ENTRAR ═════ */\nfunction crearMesa(){\n  var n = ($(\'mi-nombre\').value || \'\').trim();\n  if (!n) { mostrarError(\'Escribe tu nombre antes de crear la mesa\'); return; }\n  try { localStorage.setItem(\'king_nombre\', n); } catch(e){}\n  conectar(function(){\n    enviar({ tipo:\'crear\', id: MI_ID, nombre: n });\n  });\n}\n\nfunction entrarMesa(){\n  var n = ($(\'mi-nombre\').value || \'\').trim();\n  var c = ($(\'codigo-entrada\').value || \'\').trim().toUpperCase();\n  if (!n) { mostrarError(\'Escribe tu nombre\'); return; }\n  if (c.length !== 4) { mostrarError(\'El código tiene cuatro letras\'); return; }\n  try { localStorage.setItem(\'king_nombre\', n); } catch(e){}\n  codigoActual = c;\n  conectar(function(){\n    enviar({ tipo:\'entrar\', codigo: c, id: MI_ID, nombre: n });\n  });\n}\n\nfunction empezar(){ enviar({ tipo:\'empezar\' }); }\n\n/* Recordar el nombre de la vez anterior */\n(function(){\n  var n = localStorage.getItem(\'king_nombre\');\n  if (n) $(\'mi-nombre\').value = n;\n  $(\'codigo-entrada\').addEventListener(\'input\', function(){\n    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g,\'\');\n  });\n  $(\'codigo-mesa\').addEventListener(\'click\', function(){\n    if (navigator.clipboard) navigator.clipboard.writeText(codigoActual || \'\');\n    var p = document.querySelector(\'.codigo-mesa .pista\');\n    p.textContent = \'Copiado\';\n    setTimeout(function(){ p.textContent = \'Toca para copiarlo\'; }, 1500);\n  });\n})();\n\n/* ═════ CARTAS ═════ */\nvar PIPS = {\n  \'2\':[[50,20],[50,80]],\n  \'3\':[[50,20],[50,50],[50,80]],\n  \'4\':[[32,20],[68,20],[32,80],[68,80]],\n  \'5\':[[32,20],[68,20],[50,50],[32,80],[68,80]],\n  \'6\':[[32,20],[68,20],[32,50],[68,50],[32,80],[68,80]],\n  \'7\':[[32,20],[68,20],[50,35],[32,50],[68,50],[32,80],[68,80]],\n  \'8\':[[32,20],[68,20],[50,35],[32,50],[68,50],[50,65],[32,80],[68,80]],\n  \'9\':[[32,18],[68,18],[32,39],[68,39],[50,50],[32,61],[68,61],[32,82],[68,82]],\n  \'10\':[[32,18],[68,18],[50,28],[32,39],[68,39],[32,61],[68,61],[50,72],[32,82],[68,82]]\n};\nfunction marcoCarta(col){\n  return \'<rect x="12" y="6" width="76" height="88" rx="1.5" fill="none" stroke="\'+col+\'" stroke-width="1.6"/>\';\n}\nfunction simbolos(valor,palo,col){\n  var lista = PIPS[valor] || [];\n  return marcoCarta(col) + lista.map(function(pt){\n    var inv = pt[1] > 52;\n    return \'<text x="\'+pt[0]+\'" y="\'+pt[1]+\'" font-size="21" fill="\'+col+\'" \'+\n      \'text-anchor="middle" dominant-baseline="central"\'+\n      (inv ? \' transform="rotate(180 \'+pt[0]+\' \'+pt[1]+\')"\' : \'\')+\'>\'+palo+\'</text>\';\n  }).join(\'\');\n}\nfunction asGrande(palo,col){\n  return marcoCarta(col) +\n    \'<text x="50" y="52" font-size="54" fill="\'+col+\'" text-anchor="middle" dominant-baseline="central">\'+palo+\'</text>\';\n}\nfunction medioRetrato(valor,palo,col,rojo){\n  var T=\'#1a1a1a\', R=\'#d81f26\', O=\'#e8b923\', P=\'#f6e0c8\', AZ=\'#2a4a7c\';\n  var manto = rojo ? R : T, forro = rojo ? \'#8f1218\' : \'#3a3a3a\';\n  var g = \'\';\n  g+=\'<path d="M20 50 L20 40 Q30 28 50 27 Q70 28 80 40 L80 50 Z" fill="\'+manto+\'" stroke="\'+T+\'" stroke-width=".7"/>\';\n  g+=\'<path d="M20 50 L20 44 Q30 33 50 32 Q70 33 80 44 L80 50" fill="none" stroke="\'+O+\'" stroke-width="1.6"/>\';\n  g+=\'<path d="M41 50 L41 36 Q50 32 59 36 L59 50 Z" fill="\'+forro+\'" stroke="\'+T+\'" stroke-width=".7"/>\';\n  g+=\'<path d="M50 33 L50 50" stroke="\'+O+\'" stroke-width="1.1"/>\';\n  g+=\'<path d="M40 36 Q50 42 60 36 Q57 40 50 41 Q43 40 40 36Z" fill="#fbf7ee" stroke="\'+T+\'" stroke-width=".6"/>\';\n  g+=\'<path d="M42 30 Q42 15 50 15 Q58 15 58 30 Q58 35 50 36 Q42 35 42 30Z" fill="\'+P+\'" stroke="\'+T+\'" stroke-width=".8"/>\';\n  g+=\'<path d="M41.5 24 Q39 18 42 13 Q44 19 43.5 24Z" fill="\'+T+\'"/>\';\n  g+=\'<path d="M58.5 24 Q61 18 58 13 Q56 19 56.5 24Z" fill="\'+T+\'"/>\';\n  g+=\'<circle cx="46.6" cy="23.2" r=".85" fill="\'+T+\'"/>\';\n  g+=\'<circle cx="53.4" cy="23.2" r=".85" fill="\'+T+\'"/>\';\n  g+=\'<path d="M50 23 L49 27.5 L50.8 27.8" stroke="\'+T+\'" stroke-width=".6" fill="none"/>\';\n  if (valor === \'K\'){\n    g+=\'<path d="M43 29 Q44 40 50 42 Q56 40 57 29 Q54 34 50 34 Q46 34 43 29Z" fill="#efe9dd" stroke="\'+T+\'" stroke-width=".7"/>\';\n    g+=\'<path d="M40 14 L41.5 4.5 L46 10.5 L50 2.5 L54 10.5 L58.5 4.5 L60 14 Z" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".8"/>\';\n    g+=\'<rect x="39.5" y="13" width="21" height="4.2" rx="1" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".8"/>\';\n    g+=\'<circle cx="50" cy="2" r="1.7" fill="\'+R+\'" stroke="\'+T+\'" stroke-width=".5"/>\';\n    g+=\'<circle cx="45" cy="15.2" r="1.1" fill="\'+AZ+\'"/>\';\n    g+=\'<circle cx="55" cy="15.2" r="1.1" fill="\'+AZ+\'"/>\';\n    g+=\'<rect x="74" y="16" width="1.8" height="30" fill="#d9d9d9" stroke="\'+T+\'" stroke-width=".5"/>\';\n    g+=\'<path d="M74.9 12.5 L76.6 16 L73.2 16 Z" fill="#d9d9d9" stroke="\'+T+\'" stroke-width=".5"/>\';\n  } else if (valor === \'Q\'){\n    g+=\'<path d="M41 26 Q36 34 39 45 Q43 36 43 28Z" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".7"/>\';\n    g+=\'<path d="M59 26 Q64 34 61 45 Q57 36 57 28Z" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".7"/>\';\n    g+=\'<path d="M41 14 L43 5.5 L47 11 L50 3.5 L53 11 L57 5.5 L59 14 Z" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".8"/>\';\n    g+=\'<rect x="40.5" y="13" width="19" height="3.8" rx="1" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".8"/>\';\n    g+=\'<circle cx="50" cy="3" r="1.5" fill="\'+R+\'" stroke="\'+T+\'" stroke-width=".5"/>\';\n    g+=\'<path d="M74 34 L74 47" stroke="#2e7d32" stroke-width="1.1"/>\';\n    g+=\'<g fill="#fff" stroke="\'+T+\'" stroke-width=".5">\';\n    [[74,30],[70.6,32.4],[77.4,32.4],[71.9,36.4],[76.1,36.4]].forEach(function(pt){\n      g+=\'<ellipse cx="\'+pt[0]+\'" cy="\'+pt[1]+\'" rx="2.3" ry="2.9"/>\';\n    });\n    g+=\'</g><circle cx="74" cy="33.4" r="1.7" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".5"/>\';\n  } else {\n    g+=\'<path d="M38 16 Q50 6 62 16 L60 19 Q50 12 40 19Z" fill="\'+manto+\'" stroke="\'+T+\'" stroke-width=".8"/>\';\n    g+=\'<path d="M36.5 16.5 Q50 11 63.5 16.5 Q50 20 36.5 16.5Z" fill="\'+forro+\'" stroke="\'+T+\'" stroke-width=".7"/>\';\n    g+=\'<path d="M60 13 Q72 4 71 -3 Q66 6 57 9Z" fill="\'+O+\'" stroke="\'+T+\'" stroke-width=".7"/>\';\n    g+=\'<rect x="74" y="20" width="1.6" height="26" fill="#a97b3c" stroke="\'+T+\'" stroke-width=".4"/>\';\n    g+=\'<path d="M74.8 11 L78.5 20 L71.1 20 Z" fill="#d9d9d9" stroke="\'+T+\'" stroke-width=".5"/>\';\n  }\n  g+=\'<text x="26" y="22" font-size="11" fill="\'+col+\'" text-anchor="middle">\'+palo+\'</text>\';\n  return g;\n}\nfunction figuraCarta(valor,palo,rojo){\n  var col = rojo ? \'#d81f26\' : \'#111\';\n  var mitad = medioRetrato(valor,palo,col,rojo);\n  return \'<svg class="medallon figura" viewBox="0 0 100 100">\'+\n    \'<rect x="12" y="6" width="76" height="88" rx="1.5" fill="#fff" stroke="\'+col+\'" stroke-width="1.6"/>\'+\n    \'<g>\'+mitad+\'</g><g transform="rotate(180 50 50)">\'+mitad+\'</g>\'+\n    \'<line x1="12" y1="50" x2="88" y2="50" stroke="\'+col+\'" stroke-width="1"/></svg>\';\n}\nfunction interiorCarta(c){\n  var rojo = esRoja(c.p);\n  var col = rojo ? \'#d81f26\' : \'#111\';\n  var esq = \'<span class="esq ai"><b>\'+c.v+\'</b><i>\'+c.p+\'</i></span>\'+\n            \'<span class="esq bd"><b>\'+c.v+\'</b><i>\'+c.p+\'</i></span>\';\n  var centro;\n  if (\'JQK\'.indexOf(c.v) >= 0 && c.v.length === 1) centro = figuraCarta(c.v,c.p,rojo);\n  else if (c.v === \'A\') centro = \'<svg class="medallon as" viewBox="0 0 100 100">\'+asGrande(c.p,col)+\'</svg>\';\n  else centro = \'<svg class="medallon pips" viewBox="0 0 100 100">\'+simbolos(c.v,c.p,col)+\'</svg>\';\n  return esq + centro;\n}\nfunction htmlCarta(c,clase){\n  return \'<div class="\'+clase+(esRoja(c.p)?\' roja\':\'\')+\'">\'+interiorCarta(c)+\'</div>\';\n}\n\n/* ═════ SELLO DE LA MANO ═════ */\nfunction selloDe(mano,triunfo){\n  var oro = \'#f7e6b8\', tachon = \'#b3202a\';\n  function svg(d){ return \'<svg viewBox="0 0 100 100">\'+d+\'</svg>\'; }\n  function tachado(){\n    return \'<line x1="13" y1="87" x2="87" y2="13" stroke="rgba(0,0,0,.55)" stroke-width="15" stroke-linecap="round"/>\'+\n           \'<line x1="13" y1="87" x2="87" y2="13" stroke="\'+tachon+\'" stroke-width="11" stroke-linecap="round"/>\'+\n           \'<line x1="13" y1="87" x2="87" y2="13" stroke="\'+oro+\'" stroke-width="4" stroke-linecap="round"/>\';\n  }\n  function texto(t,tam,y){\n    return \'<text x="50" y="\'+(y||53)+\'" font-size="\'+tam+\'" font-weight="700" fill="\'+oro+\'" \'+\n      \'text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" \'+\n      \'stroke="rgba(0,0,0,.45)" stroke-width="2" paint-order="stroke">\'+t+\'</text>\';\n  }\n  switch(mano.id){\n    case \'bazas\':\n      return svg(\'<g stroke="rgba(0,0,0,.4)" stroke-width="2">\'+\n        \'<rect x="18" y="26" width="26" height="38" rx="3" fill="\'+oro+\'" opacity=".6" transform="rotate(-18 31 45)"/>\'+\n        \'<rect x="37" y="24" width="26" height="40" rx="3" fill="\'+oro+\'" opacity=".8" transform="rotate(-2 50 44)"/>\'+\n        \'<rect x="55" y="26" width="26" height="38" rx="3" fill="\'+oro+\'" transform="rotate(16 68 45)"/>\'+\n        \'</g>\'+tachado());\n    case \'corazones\': return svg(texto(\'\\u2665\',62)+tachado());\n    case \'jk\':        return svg(texto(\'J\',48,38)+texto(\'K\',48,68)+tachado());\n    case \'qs\':        return svg(texto(\'Q\',62)+tachado());\n    case \'kh\':        return svg(texto(\'K\',52,42)+texto(\'\\u2665\',34,74)+tachado());\n    case \'ultimas\':   return svg(texto(\'2\',62)+tachado());\n    default:\n      if (triunfo){\n        var rojo = esRoja(triunfo);\n        return svg(\'<circle cx="50" cy="50" r="36" fill="rgba(255,255,255,.92)" stroke="\'+oro+\'" stroke-width="4"/>\'+\n          \'<text x="50" y="53" font-size="52" fill="\'+(rojo?\'#d81f26\':\'#141414\')+\'" \'+\n          \'text-anchor="middle" dominant-baseline="central">\'+triunfo+\'</text>\');\n      }\n      return svg(\'<circle cx="50" cy="50" r="34" fill="none" stroke="\'+oro+\'" stroke-width="4"/>\'+texto(\'\\u2605\',44));\n  }\n}\n\n/* Peonza que señala a quien abre la mano */\nfunction totem(){\n  return \'<span class="totem" title="Abre esta mano"><svg viewBox="0 0 24 34">\'+\n    \'<defs><linearGradient id="lat" x1="0" y1="0" x2="1" y2="0">\'+\n    \'<stop offset="0" stop-color="#8d6412"/><stop offset="30%" stop-color="#f0d48c"/>\'+\n    \'<stop offset="52%" stop-color="#fdf1cf"/><stop offset="72%" stop-color="#dfb457"/>\'+\n    \'<stop offset="100%" stop-color="#7d570f"/></linearGradient></defs>\'+\n    \'<ellipse cx="12" cy="32" rx="6" ry="1.6" fill="rgba(0,0,0,.3)"/>\'+\n    \'<rect x="9.4" y="3" width="5.2" height="5" rx="1.1" fill="url(#lat)"/>\'+\n    \'<path d="M4.8 11 Q12 7.4 19.2 11 L12 30 Z" fill="url(#lat)"/>\'+\n    \'<ellipse cx="12" cy="11" rx="7.2" ry="2.5" fill="#f6e3b4" stroke="#a37c22" stroke-width=".6"/>\'+\n    \'<path d="M11.2 27 L12.8 27 L12 31.4 Z" fill="#6b4a0c"/>\'+\n    \'</svg></span>\';\n}\n\n/* ═════ PINTAR ═════ */\nfunction iniciales(n){\n  n = String(n||\'\').trim();\n  if (!n) return \'?\';\n  var p = n.split(/\\s+/);\n  return (p.length > 1 ? p[0].charAt(0)+p[1].charAt(0) : n.slice(0,2)).toUpperCase();\n}\n\n// Cada jugador se ve a sí mismo abajo; los demás rotan alrededor\nfunction puestoDe(sitio){\n  return PUESTOS[((sitio - miSitio) % 4 + 4) % 4];\n}\n\nfunction pintar(){\n  if (!estado) return;\n\n  if (!estado.empezada){\n    $(\'portada\').classList.add(\'oculto\');\n    $(\'espera\').classList.remove(\'oculto\');\n    pintarEspera();\n    return;\n  }\n\n  $(\'portada\').classList.add(\'oculto\');\n  $(\'espera\').classList.add(\'oculto\');\n  $(\'esquina\').classList.remove(\'oculto\');\n  $(\'mesa\').classList.remove(\'oculto\');\n  $(\'zona-mano\').classList.remove(\'oculto\');\n\n  pintarSello();\n  pintarPuestos();\n  pintarCentro();\n  pintarMiMano();\n\n  if (estado.esperandoTriunfo === miSitio) pedirTriunfo();\n}\n\nfunction pintarEspera(){\n  $(\'codigo-mesa\').textContent = estado.codigo;\n  var html = \'\';\n  for (var i = 0; i < 4; i++){\n    var j = estado.jugadores[i];\n    if (j){\n      html += \'<div class="silla">\'+\n        \'<span class="num" style="background:\'+COLORES[i]+\'">\'+iniciales(j.nombre)+\'</span>\'+\n        \'<span class="quien">\'+j.nombre+\'</span>\'+\n        (i === 0 ? \'<span class="marca">anfitrión</span>\' : \'\')+\n        (i === miSitio ? \'<span class="marca">tú</span>\' : \'\')+\n        \'</div>\';\n    } else {\n      html += \'<div class="silla vacia"><span class="num" style="background:rgba(255,255,255,.1)">\'+(i+1)+\'</span>\'+\n        \'<span class="quien">Esperando…</span></div>\';\n    }\n  }\n  $(\'lista-espera\').innerHTML = html;\n\n  var completos = estado.jugadores.length === 4;\n  if (miSitio === 0){\n    $(\'btn-empezar\').classList.toggle(\'oculto\', !completos);\n    $(\'aviso-espera\').classList.toggle(\'oculto\', completos);\n    $(\'aviso-espera\').textContent = \'Faltan \' + (4 - estado.jugadores.length) + \' jugadores\';\n  } else {\n    $(\'btn-empezar\').classList.add(\'oculto\');\n    $(\'aviso-espera\').classList.remove(\'oculto\');\n    $(\'aviso-espera\').textContent = completos\n      ? \'Esperando a que el anfitrión empiece…\'\n      : \'Faltan \' + (4 - estado.jugadores.length) + \' jugadores\';\n  }\n}\n\nfunction pintarSello(){\n  var s = $(\'sello\');\n  s.className = \'sello-mano \' + estado.mano.tipo;\n  s.innerHTML = selloDe(estado.mano, estado.triunfo);\n  $(\'contador\').innerHTML = \'<b>\' + (estado.iMano + 1) + \'</b>/10\';\n}\n\nfunction fichaHtml(sitio, conTotem){\n  var j = estado.jugadores[sitio] || { nombre:\'?\', conectado:false };\n  return \'<div class="ficha\'+(estado.turno === sitio ? \' turno\':\'\')+(j.conectado ? \'\' : \' caido\')+\'">\'+\n    (conTotem ? totem() : \'\')+\n    \'<div class="avatar" style="background:\'+COLORES[sitio]+\'">\'+iniciales(j.nombre)+\'</div>\'+\n    \'<div class="ficha-txt"><div class="ficha-nom">\'+j.nombre+\'</div>\'+\n    \'<div class="ficha-pts">\'+estado.puntosMano[sitio]+\' · total \'+estado.marcador[sitio]+\'</div></div>\'+\n    \'</div>\';\n}\n\nfunction pintarPuestos(){\n  [\'norte\',\'oeste\',\'este\'].forEach(function(p){ $(\'puesto-\'+p).innerHTML = \'\'; });\n  for (var s = 0; s < 4; s++){\n    if (s === miSitio) continue;\n    var donde = puestoDe(s);\n    var dorsos = \'\';\n    var n = Math.min(estado.cartasDe[s], 7);\n    for (var k = 0; k < n; k++) dorsos += \'<div class="dorso"></div>\';\n    $(\'puesto-\'+donde).innerHTML = fichaHtml(s, s === estado.abre) +\n      \'<div class="dorsos">\'+dorsos+\'</div>\';\n  }\n  $(\'tu-ficha\').innerHTML = fichaHtml(miSitio, miSitio === estado.abre);\n}\n\nfunction pintarCentro(){\n  $(\'centro\').innerHTML = estado.mesa.map(function(x){\n    var gana = estado.ultimaBaza && estado.mesa.length === 4 &&\n               estado.ultimaBaza.ganador === x.jugador;\n    return \'<div class="jugada \'+puestoDe(x.jugador)+(gana ? \' ganadora\':\'\')+\'">\'+\n      htmlCarta(x.carta,\'carta\')+\n      (gana && estado.ultimaBaza.puntos ?\n        \'<span class="marca-pts \'+(estado.ultimaBaza.puntos > 0 ? \'mas\':\'menos\')+\'">\'+\n        (estado.ultimaBaza.puntos > 0 ? \'+\':\'\')+estado.ultimaBaza.puntos+\'</span>\' : \'\')+\n      \'</div>\';\n  }).join(\'\');\n}\n\nfunction medidasMano(n, huecos){\n  var disponible = Math.min(window.innerWidth - 16, 660) - (huecos || 0) * 13;\n  var alto = Math.min(Math.round(window.innerHeight * 0.145), 118);\n  var ancho = Math.round(alto * 0.705);\n  var minVisible = Math.round(ancho * 0.40);\n  function visibleCon(k){ return k > 1 ? (disponible - ancho) / (k - 1) : ancho; }\n  var filas = (n > 1 && visibleCon(n) < minVisible) ? 2 : 1;\n  var porFila = filas === 1 ? n : Math.ceil(n / 2);\n  var vis = porFila > 1 ? (disponible - ancho) / (porFila - 1) : ancho;\n  if (vis > ancho) vis = ancho;\n  return { filas:filas, porFila:porFila, ancho:ancho, alto:alto,\n           solape: Math.max(0, Math.round(ancho - vis)) };\n}\n\nfunction pintarMiMano(){\n  var cartas = estado.misCartas || [];\n  var puedo = estado.jugables || [];\n  function huecosEn(lista){\n    var h = 0;\n    for (var k = 1; k < lista.length; k++) if (lista[k-1].p !== lista[k].p) h++;\n    return h;\n  }\n  var m = medidasMano(cartas.length, huecosEn(cartas));\n  var cont = $(\'mi-mano\');\n  cont.style.setProperty(\'--ancho\', m.ancho+\'px\');\n  cont.style.setProperty(\'--alto\', m.alto+\'px\');\n  cont.style.setProperty(\'--solape\', \'-\'+m.solape+\'px\');\n\n  function unaCarta(c, i, pos, total, anterior){\n    var texto = c.p + c.v;\n    var permitida = puedo.indexOf(texto) >= 0;\n    var miTurno = puedo.length > 0;\n    var clase = permitida ? \' jugable\' : (miTurno ? \' vetada\' : \'\');\n    var cambio = anterior && anterior.p !== c.p;\n    var centro = (total - 1) / 2;\n    var desvio = total > 1 ? (pos - centro) / centro : 0;\n    var giro = (desvio * 4).toFixed(1);\n    var caida = Math.abs(desvio) * Math.min(total * 0.9, 7);\n    return \'<div class="carta-mano\'+(esRoja(c.p)?\' roja\':\'\')+clase+(cambio?\' nuevo-palo\':\'\')+\'"\'+\n      \' style="transform:rotate(\'+giro+\'deg) translateY(\'+caida.toFixed(1)+\'px)"\'+\n      (permitida ? \' onclick="jugar(\\\'\'+texto+\'\\\')"\' : \'\')+\'>\'+interiorCarta(c)+\'</div>\';\n  }\n\n  if (m.filas === 1){\n    cont.className = \'mano\';\n    cont.innerHTML = \'<div class="fila">\'+\n      cartas.map(function(c,i){ return unaCarta(c,i,i,cartas.length,cartas[i-1]); }).join(\'\')+\'</div>\';\n  } else {\n    cont.className = \'mano dos-filas\';\n    var corte = m.porFila;\n    for (var d = 1; d <= 2; d++){\n      var a = m.porFila - d, b = m.porFila + d;\n      if (a > 1 && cartas[a] && cartas[a-1].p !== cartas[a].p){ corte = a; break; }\n      if (b < cartas.length && cartas[b] && cartas[b-1].p !== cartas[b].p){ corte = b; break; }\n    }\n    var sup = cartas.slice(0, corte), inf = cartas.slice(corte);\n    var m2 = medidasMano(Math.max(sup.length, inf.length),\n                         Math.max(huecosEn(sup), huecosEn(inf)));\n    cont.style.setProperty(\'--solape\', \'-\'+m2.solape+\'px\');\n    cont.innerHTML =\n      \'<div class="fila">\'+sup.map(function(c,k){ return unaCarta(c,k,k,sup.length,sup[k-1]); }).join(\'\')+\'</div>\'+\n      \'<div class="fila">\'+inf.map(function(c,k){ return unaCarta(c,k+corte,k,inf.length,inf[k-1]); }).join(\'\')+\'</div>\';\n  }\n}\n\nfunction jugar(texto){\n  enviar({ tipo:\'jugar\', carta: texto });\n}\n\n/* ═════ ELEGIR TRIUNFO ═════ */\nvar pidiendoTriunfo = false;\nfunction pedirTriunfo(){\n  if (pidiendoTriunfo) return;\n  pidiendoTriunfo = true;\n  var cuenta = {};\n  PALOS.forEach(function(p){ cuenta[p] = 0; });\n  (estado.misCartas || []).forEach(function(c){ cuenta[c.p]++; });\n  var sugerido = PALOS.slice().sort(function(a,b){ return cuenta[b] - cuenta[a]; })[0];\n  capa(\n    \'<h2>Tu triunfo</h2><p class="sub">Elige el palo que mande en esta mano</p>\'+\n    \'<div class="palos-elegir">\'+PALOS.map(function(p){\n      return \'<button class="palo-op\'+(esRoja(p)?\' roja\':\'\')+(p===sugerido?\' mejor\':\'\')+\'" \'+\n        \'onclick="fijarTriunfo(\\\'\'+p+\'\\\')"><b>\'+p+\'</b><span>\'+cuenta[p]+\' cartas</span></button>\';\n    }).join(\'\')+\'</div>\'\n  );\n}\nfunction fijarTriunfo(p){\n  pidiendoTriunfo = false;\n  quitarCapa();\n  enviar({ tipo:\'triunfo\', palo: p });\n}\n\n/* ═════ MENSAJES DE MANO Y RONDA ═════ */\nfunction mostrarPuntosMano(puntos){\n  for (var s = 0; s < 4; s++){\n    (function(k){\n      setTimeout(function(){\n        var caja = (k === miSitio) ? $(\'tu-ficha\') : $(\'puesto-\'+puestoDe(k));\n        if (!caja) return;\n        var v = puntos[k];\n        caja.insertAdjacentHTML(\'beforeend\',\n          \'<div class="puntos-mano \'+(v>0?\'suma\':v<0?\'resta\':\'cero\')+\'">\'+\n          (v>0?\'+\':\'\')+v+\'</div>\');\n        setTimeout(function(){\n          var e = caja.querySelector(\'.puntos-mano\');\n          if (e) e.parentNode.removeChild(e);\n        }, 1900);\n      }, k * 140);\n    })(s);\n  }\n}\n\nfunction mostrarFinRonda(marcador){\n  var orden = [0,1,2,3].sort(function(a,b){ return marcador[b] - marcador[a]; });\n  var medallas = [\'\\u{1F947}\',\'\\u{1F948}\',\'\\u{1F949}\',\'\\u{1F3C5}\'];\n  capa(\n    \'<h2>Ronda terminada</h2><p class="sub">Las diez manos completas</p>\'+\n    \'<table class="tabla"><tbody>\'+orden.map(function(s,i){\n      var j = estado.jugadores[s] || {nombre:\'?\'};\n      return \'<tr><td>\'+medallas[i]+\' \'+j.nombre+\'</td>\'+\n        \'<td class="\'+(marcador[s]<0?\'neg\':\'pos\')+\'">\'+(marcador[s]>0?\'+\':\'\')+marcador[s]+\'</td></tr>\';\n    }).join(\'\')+\'</tbody></table>\'+\n    \'<button class="btn" onclick="quitarCapa()">Seguir jugando</button>\'\n  );\n}\n\nfunction verMarcador(){\n  if (!estado || !estado.empezada) return;\n  capa(\n    \'<h2>Marcador</h2><p class="sub">Ronda \'+estado.ronda+\' · mano \'+(estado.iMano+1)+\' de 10</p>\'+\n    \'<table class="tabla"><tbody>\'+[0,1,2,3].map(function(s){\n      var j = estado.jugadores[s] || {nombre:\'?\'};\n      return \'<tr><td>\'+j.nombre+\'</td>\'+\n        \'<td class="\'+(estado.marcador[s]<0?\'neg\':\'pos\')+\'">\'+\n        (estado.marcador[s]>0?\'+\':\'\')+estado.marcador[s]+\'</td></tr>\';\n    }).join(\'\')+\'</tbody></table>\'+\n    \'<p class="sub">Código de la mesa: <b>\'+estado.codigo+\'</b></p>\'+\n    \'<button class="btn" onclick="quitarCapa()">Seguir jugando</button>\'\n  );\n}\n\n/* ═════ CAPAS ═════ */\nfunction capa(html){\n  quitarCapa();\n  var el = document.createElement(\'div\');\n  el.className = \'portada\';\n  el.id = \'capa\';\n  el.innerHTML = \'<div class="panel">\'+html+\'</div>\';\n  document.body.appendChild(el);\n}\nfunction quitarCapa(){\n  var el = $(\'capa\');\n  if (el) el.parentNode.removeChild(el);\n}\n\nwindow.addEventListener(\'resize\', function(){ if (estado && estado.empezada) pintarMiMano(); });\n\n/* Si veníamos de una mesa, se vuelve a entrar sola */\n(function(){\n  var mesaPrevia = localStorage.getItem(\'king_mesa\');\n  var nombre = localStorage.getItem(\'king_nombre\');\n  if (mesaPrevia && nombre){\n    codigoActual = mesaPrevia;\n    conectar(function(){\n      enviar({ tipo:\'entrar\', codigo: mesaPrevia, id: MI_ID, nombre: nombre });\n    });\n  }\n})();\n</script>\n</body>\n</html>\n';
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
