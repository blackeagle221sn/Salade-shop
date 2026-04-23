const axios = require('axios');

const IS_SANDBOX = process.env.WAVE_SANDBOX === 'true';

async function initiatePayment({ orderId, amount, clientPhone, description, notifUrl, returnUrl, cancelUrl }) {
  if (IS_SANDBOX || !process.env.ORANGE_API_LOGIN) {
    console.log(`[OM SANDBOX] Commande ${orderId} — ${amount} FCFA`);
    const ref = `OM_SIM_${Date.now()}`;
    return {
      paymentUrl: `${process.env.BASE_URL}/paiement/simulation?provider=orange_money&ref=${ref}&orderId=${orderId}&amount=${amount}`,
      omRef: ref,
      sandbox: true
    };
  }

  const credentials = Buffer.from(
    `${process.env.ORANGE_API_LOGIN}:${process.env.ORANGE_API_PASSWORD}`
  ).toString('base64');

  const tokenRes = await axios.post(
    'https://api.orange.com/oauth/v3/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
  );

  const token = tokenRes.data.access_token;
  const phone = clientPhone.startsWith('221') ? clientPhone : `221${clientPhone}`;

  const response = await axios.post(
    `${process.env.ORANGE_BASE_URL}/webpayment`,
    {
      merchant_key: process.env.ORANGE_MERCHANT_CODE,
      currency: 'OUV',
      order_id: orderId,
      amount: Math.round(amount),
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notif_url: notifUrl,
      lang: 'fr',
      reference: description,
    },
    {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );

  return { paymentUrl: response.data.payment_url, omRef: response.data.pay_token, sandbox: false };
}

module.exports = { initiatePayment };
