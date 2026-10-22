
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_TOKEN;

// El bot solo enviará notificaciones.
// No necesitamos polling para usar sendMessage().
const bot = token
  ? new TelegramBot(token, {
      polling: false
    })
  : null;

if (bot) {
  console.log('🤖 Bot de Telegram configurado correctamente');
  console.log('📨 Modo: envío de notificaciones');
  console.log('✅ Polling desactivado');
} else {
  console.warn(
    '⚠️ TELEGRAM_TOKEN no está configurado en las variables de entorno.'
  );
}

export default bot;
