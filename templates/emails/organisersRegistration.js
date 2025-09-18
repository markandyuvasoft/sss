// templates/emails/registrationSuccess.js
module.exports = (fullName, email, role, registrationLink) => {
    return `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Welcome to Gopratle, ${role === 'event-manager' ? 'Event Manager' : 'Event Agency'} ${fullName}!</title>
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { background-color: #ffffff; width: 90%; max-width: 600px; margin: 40px auto; padding: 20px 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; border-bottom: 1px solid #eeeeee; padding-bottom: 20px; }
        .header h1 { color: #333333; margin: 0; }
        .content { margin: 20px 0; color: #555555; line-height: 1.6; }
        .details { background-color: #fafafa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .details ul { list-style: none; padding: 0; margin: 0; }
        .details li { padding: 8px 0; border-bottom: 1px solid #eeeeee; }
        .details li:last-child { border-bottom: none; }
        .cta { text-align: center; margin: 30px 0; }
        .cta a { background-color: #FF4C18; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; font-size: 0.9em; color: #777777; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Hello <b>${fullName}</b>,</h1>
        </div>
        <div class="content">
          <p>Welcome to Gopratle! We’re excited to have you onboard as a ${role === 'event-manager' ? 'professional event manager' : 'top-tier event agency'}.</p>
          <p>Your registration details:</p>
          <div class="details">
            <ul>
              <li><b>Email:</b> ${email}</li>
              <li><b>Role:</b> ${role === 'event-manager' ? 'Event Manager' : 'Event Agency'}</li>
              <li><b>Purpose:</b> Organize</li>
            </ul>
          </div>
          <p>Log in to <a href="${registrationLink}" style="color:#FF4C18; text-decoration:none;"><b>gopratle.com</b></a>, build your portfolio with stunning images and past projects, and connect with customers looking for your expertise!</p>
        </div>
        <div class="cta">
          <a href="${registrationLink}">Create Your Portfolio</a>
        </div>
        <div class="footer">
          <p>Let’s make events extraordinary together!<br/>The Gopratle Team</p>
        </div>
      </div>
    </body>
    </html>
    `;
  };