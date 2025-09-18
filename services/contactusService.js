const { sendNotification } = require('./notificationService');

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendContactEmails({ name, email, message, ip }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const safeIp = escapeHtml(ip || '');

  // Email to Admin
  const adminRecipient = process.env.CONTACT_US_ADMIN_EMAIL || 'support@gopratle.com';
  const adminSubject = `New Contact Us message from ${safeName}`;
  const adminBody = `
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>IP:</strong> ${safeIp}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
    <p style="margin:0 0 6px;"><strong>Message:</strong></p>
    <div>${safeMessage}</div>
  `;

  // Acknowledgment to User
  const userSubject = 'We received your message – GoPratle';
  const userBody = `
    <p>Hi ${safeName},</p>
    <p>Thanks for reaching out to <strong>GoPratle</strong>! We’ve received your message and our team will get back to you within 24–48 hours.</p>
    <p style="margin:0 0 6px;"><strong>Your message:</strong></p>
    <blockquote style="border-left:3px solid #ff4e18;padding-left:10px;color:#555;">${safeMessage}</blockquote>
    <p style="margin-top:14px;">If this wasn’t you, you can ignore this email.</p>
  `;

  const adminStatus = await sendNotification(adminRecipient, adminSubject, adminBody, 'email');
  const userStatus = await sendNotification(email, userSubject, userBody, 'email');

  if (!adminStatus) throw new Error('Failed to send admin notification');
  if (!userStatus) throw new Error('Failed to send user acknowledgment');

  return true;
}

module.exports = { sendContactEmails };
