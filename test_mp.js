const { MercadoPagoConfig, PreApproval } = require('mercadopago');
require('dotenv').config({ path: '.env.local' });
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const p = new PreApproval(client);
p.create({
  body: {
    reason: "Suscripción Mensual Reason",
    external_reference: "USER_ID_123",
    payer_email: "kevincolmanf@gmail.com",
    back_url: "https://www.mercadopago.com.ar",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 18000,
      currency_id: "ARS"
    }
  }
}).then(res => console.log('OK', res.id)).catch(err => console.error('ERR', err));
