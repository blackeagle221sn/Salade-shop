const axios = require('axios');

const IS_SANDBOX = process.env.WAVE_SANDBOX === 'true';

async function createCheckoutSession({ orderId, amount, clientPhone, description, successUrl, errorUrl }) {
  if (IS_SANDBOX || !process.env.WAVE_API_KEY?.startsWith('wave_sn_prod')) {
    console.log(`[WAVE SANDBOX] Commande ${orderId} — ${amount} FCFA`);
    const ref = `WAVE_SIM_${Date.now()}`;
    return {
      paymentUrl: `${process.env.BASE_URL}/paiement/simulation?provider=wave&ref=${ref}&orderId=${orderId}&amount=${amount}`,
      waveRef: ref,
      sandbox: true
    };
  }

  const response = await axios.post(
    `${process.env.WAVE_BASE_URL}/checkout/sessions`,
    {
      amount: Math.round(amount),
      currency: 'XOF',
      error_url: errorUrl,
      success_url: successUrl,
      client_reference: orderId,
      client_mobile_number: clientPhone,
      description,
    },
    {
      headers: { 'Authorization': `Bearer ${process.env.WAVE_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    }
  );

  return { paymentUrl: response.data.wave_launch_url, waveRef: response.data.id, sandbox: false };
}

module.exports = { createCheckoutSession };
