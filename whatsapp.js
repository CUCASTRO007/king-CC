'use strict';
/* ═════ WHATSAPP ═════
   Envía el código de entrada por WhatsApp, con la API oficial de Meta
   (WhatsApp Cloud API).

   Meta no deja mandar texto libre a quien no te ha escrito antes: hay que
   usar una PLANTILLA aprobada de la categoría "Autenticación". Esa plantilla
   se crea en el administrador de WhatsApp de Meta, con un botón de
   "Copiar código". Su nombre va en WHATSAPP_PLANTILLA.

   Variables que hay que poner en Render:
     WHATSAPP_TOKEN       token de acceso permanente de la app de Meta
     WHATSAPP_NUMERO_ID   identificador del número de WhatsApp Business
     WHATSAPP_PLANTILLA   nombre de la plantilla aprobada (por defecto codigo_king)
     WHATSAPP_IDIOMA      idioma de la plantilla (por defecto es)
     WHATSAPP_VERSION     versión de la API (por defecto v21.0)

   Ojo: el número que se registre en la API deja de funcionar en la app de
   WhatsApp normal. Tiene que ser un número dedicado, no el personal. */

function configurado(){
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_NUMERO_ID);
}

/* El cuerpo del mensaje. Va aparte para poder comprobarlo sin enviar nada. */
function cuerpo(telefono, codigo, opciones){
  opciones = opciones || {};
  return {
    messaging_product: 'whatsapp',
    to: String(telefono).replace(/[^\d]/g, ''),     // Meta lo quiere sin el +
    type: 'template',
    template: {
      name: opciones.plantilla || process.env.WHATSAPP_PLANTILLA || 'codigo_king',
      language: { code: opciones.idioma || process.env.WHATSAPP_IDIOMA || 'es' },
      components: [
        // El código dentro del texto del mensaje
        { type: 'body', parameters: [{ type: 'text', text: codigo }] },
        // Y en el botón de copiar, para no tener que escribirlo
        { type: 'button', sub_type: 'url', index: '0',
          parameters: [{ type: 'text', text: codigo }] }
      ]
    }
  };
}

function direccion(){
  const v = process.env.WHATSAPP_VERSION || 'v21.0';
  return 'https://graph.facebook.com/' + v + '/' + process.env.WHATSAPP_NUMERO_ID + '/messages';
}

/* Envía el código. Si Meta lo rechaza, lanza un error con su explicación,
   para que quien lo pidió sepa que no le va a llegar. */
async function enviarCodigo(telefono, codigo, pedir){
  pedir = pedir || fetch;
  const r = await pedir(direccion(), {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.WHATSAPP_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cuerpo(telefono, codigo))
  });
  if (!r.ok){
    let detalle = '';
    try { const j = await r.json(); detalle = (j.error && j.error.message) || ''; } catch(e){}
    throw new Error('WhatsApp rechazó el envío (' + r.status + ')' + (detalle ? ': ' + detalle : ''));
  }
  return true;
}

module.exports = { configurado, cuerpo, direccion, enviarCodigo };
