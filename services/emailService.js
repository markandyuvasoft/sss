// const sgMail = require('@sendgrid/mail');

// sgMail.setApiKey(process.env.CLIENT_SECRET);

// async function sendEmail(to, subject, message) {
//   // Validate if email configuration exists
//   if (!process.env.CLIENT_SECRET || !process.env.EMAIL_USER) {
//     throw new Error('Email configuration is missing. Check .env file.');
//   }
//   try {
//     const mailOptions = {
//       to, // Recipient(s)
//       from: {
//         name: 'Gopratle', // Explicitly set sender name
//         email: process.env.EMAIL_USER // Verified sender (mailing@gopratle.com)
//       }, // Verified sender in SendGrid
//       subject,
//       text: message,
//       html: `<p>${message}</p>`,
//     };

//     await sgMail.send(mailOptions);
//     return true;
//   } catch (error) {
//     console.error(`Failed to send email to ${to}:`, error.response?.body || error.message);
//     return false;
//   }
// }

// module.exports = { sendEmail };



// Fallback Link
// <p style="font-size: 13px; margin: 0 0 5px;">Or paste this link into your browser:</p>
// <p style="word-break: break-word; background-color: #f2f2f2; padding: 10px; border-left: 4px solid #ff4e18; font-size: 13px; color: #444;">
//   ${verificationLink}
// </p>

// <p style="font-size: 12px; color: #777; margin-top: 20px;">
//   This link will expire in 24 hours.
// </p>


// const sgMail = require('@sendgrid/mail');

const { Resend } = require('resend');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);



console.log(resend)

// Minimal professional verification email template
function createVerificationEmailTemplate(verificationLink, userEmail) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 20px !important;
      }
      h1 {
        font-size: 22px !important;
      }
      p, a {
        font-size: 14px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a1a;">

  <div class="container" style="max-width: 540px; margin: 40px auto; background-color: #ffffff; border: 1px solid #eee; padding: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">

    <!-- Logo and Header -->
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <img src="https://res.cloudinary.com/de6aivvo3/image/upload/v1748882547/Logo_1_qy4auw.png" alt="Gopratle Logo" title="Gopratle" style="width: 50px; height: auto; margin-right: 12px;" />
      <h1 style="margin: 0; font-size: 24px; color: #ff4e18;">GoPratle</h1>
    </div>
    <p style="margin: 0 0 25px; color: #555; font-size: 14px;">Your Event Planning Partner</p>

    <!-- Main Content -->
    <h2 style="font-size: 18px; margin: 20px 0 10px;">Welcome!</h2>
    <p style="margin: 0 0 15px; font-size: 15px; line-height: 1.6;">
      Thanks for signing up. Please verify your email address by clicking the button below:
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" style="background-color: #ff4e18; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 15px;">
        Verify Email
      </a>
    </div>

    <!-- Footer -->
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999; text-align: center;">© 2025 Gopratle. All rights reserved.</p>
    <p style="font-size: 11px; color: #aaa; text-align: center;">Sent to <strong style="color: #ff4e18;">${userEmail}</strong></p>
    <p style="font-size: 11px; text-align: center;">
      Need help? <a href="mailto:support@gopratle.com" style="color: #ff4e18; text-decoration: none;">support@gopratle.com</a>
    </p>

  </div>

</body>
</html>
  `;
}

// Default email template (for general messages)
function createDefaultEmailTemplate(message, userEmail) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gopratle Message</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a1a;">

  <div style="max-width: 540px; margin: 40px auto; background-color: #ffffff; border: 1px solid #eee; padding: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">

    <!-- Header: Logo & Brand -->
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <img src="https://res.cloudinary.com/de6aivvo3/image/upload/v1748882547/Logo_1_qy4auw.png" alt="Gopratle Logo" title="Gopratle" style="width: 50px; height: auto; margin-right: 12px;" />
      <h1 style="margin: 0; font-size: 22px; color: #ff4e18;">GoPratle</h1>
    </div>

    <p style="margin: 0 0 25px; font-size: 14px; color: #555;">Your Event Planning Partner</p>

    <!-- Main Message -->
    <div style="margin-bottom: 30px; font-size: 15px; line-height: 1.6; color: #333;">
      ${message}
    </div>

    <!-- Divider -->
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

    <!-- Footer -->
    <p style="font-size: 12px; color: #999; text-align: center; margin: 0 0 5px;">© 2025 Gopratle. All rights reserved.</p>
    <p style="font-size: 11px; color: #aaa; text-align: center; margin: 0 0 5px;">
      Sent to <strong style="color: #ff4e18;">${userEmail}</strong>
    </p>
    <p style="font-size: 11px; text-align: center; margin: 0;">
      Need help? <a href="mailto:support@gopratle.com" style="color: #ff4e18; text-decoration: none;">support@gopratle.com</a>
    </p>

  </div>

</body>
</html>
  `;
}

// Email sender function
async function sendEmail(to, subject, message, isVerification = false, verificationLink = null) {
  try {
    console.log(`📧 Sending email to: ${to}`);
    let htmlContent = isVerification && verificationLink
      ? createVerificationEmailTemplate(verificationLink, to)
      : createDefaultEmailTemplate(message, to);

    const { data, error } = await resend.emails.send({
      // from: "Gopratle <business@gopratle.com>",
      from: "business@gopratle.com",
      to: [to],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }

    console.log('✅ Email sent:', data);
    return true;
  } catch (err) {
    console.error('❌ Email send failed:', err.message || err);
    return false;
  }
}

module.exports = { sendEmail };
