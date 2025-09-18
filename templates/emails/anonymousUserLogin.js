// templates/emails/anonymousUserLogin.js
module.exports = (fullName, email, password, eventUrl) =>
  `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center;">
      <h2 style="color: #FF4C18;"> Welcome to Gopratle! </h2>
      <p style="font-size: 16px; color: #333;">Hey <strong>${fullName}</strong>, you’ve just posted an event with Gopratle.</p>
    </div>

    <div style="background: #fff; padding: 15px; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
      <h3 style="color: #FF4C18;"> Your Login Details:</h3>
      <p>We’ve created an account for you so you can manage your event. Here are your credentials:</p>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p style="font-size: 14px; color: #555;">Please log in to <a href="${eventUrl}" style="color: #FF4C18; text-decoration: none;">gopratle.com</a> with these details to view or edit your event.</p>
    </div>

    <div style="text-align: center; margin-top: 20px;">
      <a href="${eventUrl}" style="background-color: #FF4C18; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; font-weight: bold;">
        Log In Now
      </a>
    </div>

    <div style="margin-top: 20px; text-align: center; font-size: 14px; color: #555;">
      <p>Best regards,</p>
      <p><strong> Gopratle </strong></p>
    </div>
  </div>
`;
