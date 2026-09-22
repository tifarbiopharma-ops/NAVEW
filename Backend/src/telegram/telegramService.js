
import bot from './telegram.config.js';

const getChatIdDestino = () => process.env.TELEGRAM_SOLICITANTES_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

export const notificarLlegadaPedido = async (salida = {}) => {
  const chatId = getChatIdDestino();

  if (!chatId || !bot) {
    console.warn('⚠️ No hay Chat ID o token de Telegram configurado para la entrega del pedido.');
    return;
  }

  try {
    const mensaje = `
✅ <b>Ha llegado su pedido</b>
➖➖➖➖➖➖➖➖➖➖➖➖
👤 <b>Solicitante:</b> ${salida.solicitante_nombre || 'No disponible'}
📦 <b>Código:</b> <code>${salida.codigo || 'N/A'}</code>
📍 <b>Origen:</b> ${salida.area_origen || 'N/A'}
🏬 <b>Destino:</b> ${salida.destino || 'N/A'}
📌 <b>Departamento:</b> ${salida.departamento || 'N/A'}
🧾 <b>Motivo:</b> ${salida.motivo || 'N/A'}
📅 <b>Fecha salida:</b> ${salida.fecha_salida || 'N/A'}

<i>La salida fue validada por el guardia y ya llegó al destino.</i>
    `.trim();

    await bot.sendMessage(chatId, mensaje, { parse_mode: 'HTML' });
    console.log('📨 Notificación de entrega enviada por Telegram');
  } catch (error) {
    console.error('❌ Error enviando notificación de entrega por Telegram:', error.message);
  }
};

export const notificarResumenPorEstado = async () => {
  console.log('⚠️ Telegram de flujo legacy no está activo en este sistema.');
};