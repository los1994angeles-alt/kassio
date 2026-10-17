// Создание платежа Platega. Ключи берутся из переменных окружения Netlify:
// PLATEGA_MERCHANT_ID и PLATEGA_SECRET (Site configuration → Environment variables)
const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const baseAmount = parseFloat(body.amount);
    if (!baseAmount || baseAmount < 100) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Сумма должна быть от 100 ₽' }) };
    }

    // Комиссия для покупателя: до 8 500 ₽ +13%, от 8 500 ₽ +7%
    const feePercent = baseAmount >= 8500 ? 1.07 : 1.13;
    const chargedAmount = Math.ceil(baseAmount * feePercent);
    const site = 'https://' + (event.headers.host || 'kassio-pay.netlify.app');
    const orderId = 'kassio_' + Date.now();
    // В payload передаём сумму заказа, чтобы уведомление показало её точно
    const payload = orderId + '_base' + Math.round(baseAmount);

    const response = await fetch('https://app.platega.io/v2/transaction/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MerchantId': process.env.PLATEGA_MERCHANT_ID,
        'X-Secret': process.env.PLATEGA_SECRET,
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        paymentDetails: { amount: chargedAmount, currency: 'RUB' },
        description: 'Оплата заказа ' + orderId,
        return: site + '/?payment=success',
        failedUrl: site + '/?payment=fail',
        payload: payload,
      }),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ message: e.message }) };
  }
};
