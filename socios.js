'use strict';
/* ═════ SOCIOS ═════
   Cuentas por número de celular, código por WhatsApp y membresía mensual.

   Tres relojes distintos, que se confunden con facilidad:
     · el código     → diez minutos, cinco intentos, y muere al usarse
     · la sesión     → meses en ese móvil, hasta cerrarla o entrar en otro
     · la membresía  → se cobra cada mes

   El celular es mejor llave que el correo: la gente comparte una contraseña,
   pero no su teléfono. Y solo una sesión vive a la vez, así que dos personas
   no pueden jugar con la misma cuenta.

   Aquí no se cobra ni se envía nada. El cobro lo confirma la pasarela
   llamando a activar(); el código lo manda el canal (WhatsApp), que sin
   configurar solo escribe en el registro. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VIDA_CODIGO  = 10 * 60 * 1000;              // diez minutos
const INTENTOS     = 5;                           // luego hay que pedir otro
const ESPERA_CODIGO   = 60 * 1000;                   // uno por minuto como mucho
const VIDA_SESION  = 180 * 24 * 60 * 60 * 1000;   // seis meses
const GRACIA       = 3 * 24 * 60 * 60 * 1000;     // margen tras vencer
const MES          = 30 * 24 * 60 * 60 * 1000;

/* ═════ EL ALMACÉN ═════
   Con DATABASE_URL se usa Postgres, que sobrevive a los despliegues.
   Sin ella, un archivo: vale para probar en casa, NO para cobrar, porque
   el disco de Render se borra en cada despliegue. */

function almacenArchivo(ruta){
  let d = { cuentas:{}, codigos:{}, sesiones:{} };
  try { if (fs.existsSync(ruta)) d = JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch(e){}
  ['cuentas','codigos','sesiones'].forEach(k => { if (!d[k]) d[k] = {}; });
  const guardar = () => { try { fs.writeFileSync(ruta, JSON.stringify(d)); } catch(e){} };
  return {
    tipo: 'archivo',
    async preparar(){},
    async leer(tabla, clave){ return d[tabla][clave] || null; },
    async escribir(tabla, clave, valor){ d[tabla][clave] = valor; guardar(); },
    async borrar(tabla, clave){ delete d[tabla][clave]; guardar(); },
    async borrarDonde(tabla, campo, valor){
      Object.keys(d[tabla]).forEach(k => { if (d[tabla][k][campo] === valor) delete d[tabla][k]; });
      guardar();
    }
  };
}

function almacenPostgres(pool){
  // Una tabla por tipo, con la clave y el resto guardado como documento.
  // Así el esquema no cambia cada vez que se añade un dato.
  const TABLAS = ['cuentas','codigos','sesiones'];
  return {
    tipo: 'postgres',
    async preparar(){
      for (const t of TABLAS){
        await pool.query('CREATE TABLE IF NOT EXISTS ' + t +
          ' (clave TEXT PRIMARY KEY, datos JSONB NOT NULL)');
      }
    },
    async leer(tabla, clave){
      const r = await pool.query('SELECT datos FROM ' + tabla + ' WHERE clave = $1', [clave]);
      return r.rows.length ? r.rows[0].datos : null;
    },
    async escribir(tabla, clave, valor){
      await pool.query('INSERT INTO ' + tabla + ' (clave, datos) VALUES ($1, $2) ' +
        'ON CONFLICT (clave) DO UPDATE SET datos = EXCLUDED.datos', [clave, JSON.stringify(valor)]);
    },
    async borrar(tabla, clave){
      await pool.query('DELETE FROM ' + tabla + ' WHERE clave = $1', [clave]);
    },
    async borrarDonde(tabla, campo, valor){
      await pool.query('DELETE FROM ' + tabla + ' WHERE datos->>$1 = $2', [campo, valor]);
    }
  };
}

let almacen = null;

async function arrancar(opciones){
  opciones = opciones || {};
  if (opciones.pool){
    almacen = almacenPostgres(opciones.pool);
  } else if (process.env.DATABASE_URL){
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL,
                            ssl: { rejectUnauthorized: false } });
    almacen = almacenPostgres(pool);
  } else {
    almacen = almacenArchivo(opciones.archivo || path.join(__dirname, 'socios.json'));
  }
  await almacen.preparar();
  return almacen.tipo;
}

/* ═════ EL NÚMERO ═════
   Celular colombiano: diez dígitos que empiezan por 3. Se acepta escrito de
   cualquier forma —con +57, espacios, guiones— y se guarda siempre igual,
   para que "300 123 4567" y "+573001234567" sean la misma cuenta. */
function normalizar(numero){
  let n = String(numero || '').replace(/[^\d]/g, '');
  if (n.length === 12 && n.indexOf('57') === 0) n = n.slice(2);
  if (n.length !== 10 || n.charAt(0) !== '3') return null;
  return '+57' + n;
}

function claveNueva(n){ return crypto.randomBytes(n || 24).toString('base64url'); }

// El código se guarda resumido: si alguien se lleva la base, no se lleva
// códigos que todavía funcionen.
function resumen(texto){ return crypto.createHash('sha256').update(String(texto)).digest('hex'); }

/* ═════ EL CANAL ═════
   Por dónde llega el código. En producción, WhatsApp (ver whatsapp.js).
   Sin configurar, solo se escribe en el registro, para poder probar. */
let enviarCodigo = async function(telefono, codigo){
  console.log('[codigo] ' + telefono + ' → ' + codigo);
};
function usarCanal(fn){ enviarCodigo = fn; }

/* ═════ CUENTAS ═════ */
async function cuentaDe(numero){
  const tel = normalizar(numero);
  if (!tel) return null;
  let c = await almacen.leer('cuentas', tel);
  if (!c){
    c = { telefono: tel, creada: Date.now(), hasta: 0, nombre: '' };
    await almacen.escribir('cuentas', tel, c);
  }
  return c;
}

/* ═════ EL CÓDIGO ═════
   Seis dígitos por WhatsApp. Es adivinable, así que va con tres frenos: dura
   diez minutos, admite cinco intentos, y no se puede pedir más de uno por
   minuto (cada mensaje cuesta dinero, y sin este freno alguien podría vaciar
   el saldo pidiendo códigos sin parar). */
async function pedirCodigo(numero){
  const tel = normalizar(numero);
  if (!tel) return { ok:false, motivo:'número no válido' };
  const previo = await almacen.leer('codigos', tel);
  if (previo && Date.now() - previo.pedido < ESPERA_CODIGO){
    const faltan = Math.ceil((ESPERA_CODIGO - (Date.now() - previo.pedido)) / 1000);
    return { ok:false, motivo:'espera', segundos: faltan };
  }
  await cuentaDe(tel);
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await almacen.escribir('codigos', tel, {
    telefono: tel, resumen: resumen(codigo),
    vence: Date.now() + VIDA_CODIGO, intentos: 0, pedido: Date.now()
  });
  try {
    await enviarCodigo(tel, codigo);
  } catch (e) {
    // Si no se pudo enviar, se borra: si no, habría que esperar un minuto
    // para pedir otro código que tampoco ha llegado.
    await almacen.borrar('codigos', tel);
    console.log('[codigo] no se pudo enviar a ' + tel + ': ' + e.message);
    return { ok:false, motivo:'no se pudo enviar el código, prueba otra vez' };
  }
  return { ok:true, telefono: tel, _codigo: codigo };   // _codigo solo para pruebas
}

/* Si el código es bueno se abre sesión en ese móvil y el código se quema */
async function usarCodigo(numero, codigo){
  const tel = normalizar(numero);
  if (!tel) return { ok:false, motivo:'número no válido' };
  const c = await almacen.leer('codigos', tel);
  if (!c) return { ok:false, motivo:'pide un código primero' };
  if (Date.now() > c.vence){
    await almacen.borrar('codigos', tel);
    return { ok:false, motivo:'el código venció' };
  }
  if (c.intentos >= INTENTOS){
    await almacen.borrar('codigos', tel);
    return { ok:false, motivo:'demasiados intentos, pide otro código' };
  }
  if (resumen(codigo) !== c.resumen){
    c.intentos++;
    await almacen.escribir('codigos', tel, c);
    return { ok:false, motivo:'código incorrecto', quedan: INTENTOS - c.intentos };
  }
  await almacen.borrar('codigos', tel);
  return { ok:true, sesion: await abrirSesion(tel) };
}

/* ═════ SESIONES ═════
   Una sola viva por cuenta: al entrar en otro móvil, el primero cae. */
async function abrirSesion(numero){
  const tel = normalizar(numero);
  await almacen.borrarDonde('sesiones', 'telefono', tel);
  const clave = claveNueva(32);
  await almacen.escribir('sesiones', clave,
    { telefono: tel, desde: Date.now(), vence: Date.now() + VIDA_SESION });
  return clave;
}

async function quienEs(clave){
  if (!clave) return null;
  const s = await almacen.leer('sesiones', clave);
  if (!s) return null;
  if (Date.now() > s.vence){ await almacen.borrar('sesiones', clave); return null; }
  return await almacen.leer('cuentas', s.telefono);
}

async function cerrarSesion(clave){ if (clave) await almacen.borrar('sesiones', clave); }

/* ═════ MEMBRESÍA ═════
   'hasta' es el instante en que vence. El margen evita que un cobro que se
   retrasa un día deje a nadie fuera de la mesa. */
function alDia(cuenta){
  if (!cuenta) return false;
  return Date.now() < (cuenta.hasta || 0) + GRACIA;
}

/* Lo que llamará la pasarela al confirmar el cobro. Se suma a lo que
   quede: pagar antes de tiempo no hace perder días. */
async function activar(numero, meses){
  const cuenta = await cuentaDe(numero);
  if (!cuenta) return null;
  const desde = Math.max(Date.now(), cuenta.hasta || 0);
  cuenta.hasta = desde + (meses || 1) * MES;
  await almacen.escribir('cuentas', cuenta.telefono, cuenta);
  return cuenta;
}

function situacion(cuenta){
  if (!cuenta) return { entra:false, motivo:'sin cuenta' };
  if (!alDia(cuenta)) return { entra:false, motivo:'membresía vencida',
                               telefono: cuenta.telefono, hasta: cuenta.hasta || 0 };
  return { entra:true, telefono: cuenta.telefono, hasta: cuenta.hasta };
}

module.exports = {
  arrancar, normalizar, usarCanal,
  cuentaDe, pedirCodigo, usarCodigo,
  abrirSesion, quienEs, cerrarSesion,
  alDia, activar, situacion,
  VIDA_CODIGO, INTENTOS, ESPERA_CODIGO, VIDA_SESION, GRACIA,
  _almacen: () => almacen
};
