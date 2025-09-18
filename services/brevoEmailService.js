// services/brevoEmailService.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

// configure Brevo client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendEmail(to, subject, message) {
  // Validate config
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
    throw new Error('Brevo config missing. Check .env for BREVO_API_KEY and BREVO_FROM_EMAIL.');
  }

  const emailPayload = {
    sender: {
      name: process.env.BREVO_FROM_NAME || 'Gopratle',
      email: process.env.BREVO_FROM_EMAIL,       // e.g. mailing@gopratle.com
    },
    to: [{ email: to }],
    subject,
    textContent: message,
    htmlContent: `<p>${message}</p>`,
  };

  try {
    await apiInstance.sendTransacEmail(emailPayload);
    return true;
  } catch (err) {
    // Brevo errors carry a `response.body` with details
    console.error(`Failed to send email to ${to}:`,
      err.response && err.response.body
        ? err.response.body
        : err.message
    );
    return false;
  }
}

module.exports = { sendEmail };
