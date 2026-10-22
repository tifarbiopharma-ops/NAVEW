
import bot from './telegram.config.js';

const getChatIdDestino = () => (
  process.env.TELEGRAM_NAVEW_CHAT_ID
);

const notificarLlegadaPedido = async (salida = {}) => {
  const chatId = getChatIdDestino();

  if (!chatId || !bot) {
    console.warn(' No hay Chat ID o token de Telegram configurado para la entrega del pedido.');
    return;
  }

  try {
    const fechaSalida = (() => {
      if (!salida.fecha_salida) return 'No disponible';

      if (salida.fecha_salida instanceof Date) {
        const dia = String(salida.fecha_salida.getUTCDate()).padStart(2, '0');
        const mes = String(salida.fecha_salida.getUTCMonth() + 1).padStart(2, '0');
        const anio = salida.fecha_salida.getUTCFullYear();
        return `${dia}/${mes}/${anio}`;
      }

      const [anio, mes, dia] = String(salida.fecha_salida).slice(0, 10).split('-');
      return anio && mes && dia ? `${dia}/${mes}/${anio}` : 'No disponible';
    })();

    const mensaje = `
📅 <b>Fecha:</b> ${fechaSalida}
    <b>------------------------------</b>
📦 <b>Tipo de contenido:</b> ${salida.tipo_contenido || 'No disponible'}
    <b>------------------------------</b>
🏭 <b>Planta de origen:</b> ${salida.planta_origen || 'No disponible'}
📍 <b>Área de origen:</b> ${salida.area_origen || 'No disponible'}
👤 <b>Responsable origen:</b> ${salida.responsable_origen || 'No disponible'}
    <b>------------------------------</b>
🏭 <b>Planta de destino:</b> ${salida.planta_destino || 'No disponible'}
📍 <b>Área de destino:</b> ${salida.area_destino || 'No disponible'}
👤 <b>Responsable destino:</b> ${salida.responsable_destino || 'No disponible'}
    <b>------------------------------</b>

<b>Su paquete se encuentra en garita!</b>
    `.trim();

    await bot.sendMessage(chatId, mensaje, { parse_mode: 'HTML' });
    console.log('Notificación de entrega enviada por Telegram');
  } catch (error) {
    console.error('Error enviando notificación de entrega por Telegram:', error.message);
  }
};

const notificarResumenPorEstado = async () => {
  console.log('Telegram de flujo legacy no está activo en este sistema.');
};



const notificarLlegadaCamion = async ({
  planta,
  supervisor
}) => {
  const chatId = getChatIdDestino();

  if (!chatId || !bot) {
    throw new Error("Telegram no está configurado.");
  }

  const escaparHTML = (valor) =>
    String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const fecha = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date());

  const mensaje = `
🚛 <b>AVISO DE LLEGADA DE CAMIÓN</b>
<b>------------------------------</b>
🏭 <b>Planta:</b> ${escaparHTML(planta)}
👤 <b>Supervisor:</b> ${escaparHTML(supervisor)}
📅 <b>Fecha y hora:</b> ${fecha}
<b>------------------------------</b>

✅ <b>Se informa que el camión ya se encuentra en la planta indicada.</b>
  `.trim();

  await bot.sendMessage(chatId, mensaje, {
    parse_mode: "HTML"
  });

  console.log("Aviso de llegada enviado a Telegram");
};

export {
  notificarLlegadaPedido,
  notificarResumenPorEstado,
  notificarLlegadaCamion
};