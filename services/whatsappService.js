const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendWhatsApp = async (recipient, message) => {
  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${recipient}`,
    });
    return true;
  } catch (err) {
    console.error('WhatsApp sending failed:', err.message);
    return false;
  }
};

module.exports = { sendWhatsApp };
