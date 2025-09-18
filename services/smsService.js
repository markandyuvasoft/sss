const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS = async (recipient, message) => {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipient, // Recipient's phone number
    });
    return true;
  } catch (err) {
    console.error('SMS sending failed:', err.message);
    return false;
  }
};

module.exports = { sendSMS };
