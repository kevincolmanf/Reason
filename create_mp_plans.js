const { MercadoPagoConfig, PreApprovalPlan } = require('mercadopago');
require('dotenv').config({ path: '.env.local' });

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const planClient = new PreApprovalPlan(client);

async function createPlans() {
  try {
    console.log('Creando plan mensual...');
    const monthlyPlan = await planClient.create({
      body: {
        reason: "Suscripción Mensual Reason",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 18000,
          currency_id: "ARS"
        },
        back_url: "https://www.reason.com.ar/account/subscription?status=success",
        status: "active"
      }
    });
    console.log('Plan mensual creado. ID:', monthlyPlan.id);

    console.log('Creando plan anual...');
    const annualPlan = await planClient.create({
      body: {
        reason: "Suscripción Anual Reason",
        auto_recurring: {
          frequency: 12,
          frequency_type: "months",
          transaction_amount: 150000,
          currency_id: "ARS"
        },
        back_url: "https://www.reason.com.ar/account/subscription?status=success",
        status: "active"
      }
    });
    console.log('Plan anual creado. ID:', annualPlan.id);

  } catch (error) {
    console.error('Error creando planes:', error);
  }
}

createPlans();
