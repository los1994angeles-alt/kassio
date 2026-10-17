// Уведомления Platega об оплате → Telegram-канал.
// Callback URL в кабинете Platega: https://kassio-pay.netlify.app/.netlify/functions/notify
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    // Проверяем, что запрос пришёл от Platega
    const h = event.headers || {};
    const merchant = h['x-merchantid'] || h['X-MerchantId'];
    const secret = h['x-secret'] || h['X-Secret'];
    if (merchant !== process.env.PLATEGA_MERCHANT_ID || secret !== process.env.PLATEGA_SECRET) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    const data = JSON.parse(event.body || '{}');
    if (data.status !== 'CONFIRMED') {
      return { statusCode: 200, body: '' };
    }

    const TELEGRAM_TOKEN = '8917345443:AAEBqf0ME589AmQhI6t3upPal6PPgOyovH8';
    const CHAT_ID = '-1004495632730';

    const paidAmount = parseFloat(data.amount) || 0;
    // Сумму заказа берём из payload (kassio_..._base3900)
    const m = String(data.payload || '').match(/_base(\d+)/);
    const baseAmount = m ? parseInt(m[1], 10) : null;
    const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    const lines = ['✅ Новая оплата · Kassio (Platega)'];
    if (baseAmount) lines.push(`💰 Сумма заказа: ${baseAmount} ₽`);
    lines.push(`🧾 Оплачено клиентом: ${paidAmount} ₽`);
    lines.push(`🆔 ID: ${data.id || '?'}`);
    lines.push(`🕐 ${now} (МСК)`);
    const text = lines.join('\n');

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });

    return { statusCode: 200, body: '' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
