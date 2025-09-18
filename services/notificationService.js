const { sendEmail } = require('./emailService');

const sendNotification = async (recipient, subject, message, type = 'email', options = {}) => {
  let sendStatus = false;

  switch (type) {
    case 'email':
      const { isVerification = false, verificationLink = null } = options;
      sendStatus = await sendEmail(recipient, subject, message, isVerification, verificationLink);
      break;

    case 'sms':
      throw new Error('SMS notification service is not yet implemented.');

    case 'whatsapp':
      throw new Error('WhatsApp notification service is not yet implemented.');

    default:
      throw new Error('Invalid notification type.');
  }

  return sendStatus;
};

module.exports = { sendNotification };
