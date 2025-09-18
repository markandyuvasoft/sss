// templates/emails/volunteerRegistration.js
module.exports = (fullName, email, registrationLink) => {
    return `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Welcome to Gopratle, Volunteer ${fullName}!</title>
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
          <p>Thank you for joining Gopratle as a volunteer! We’re thrilled to have your support in making events unforgettable.</p>
          <p>Your registration details:</p>
          <div class="details">
            <ul>
              <li><b>Email:</b> ${email}</li>
              <li><b>Role:</b> Volunteer</li>
              <li><b>Purpose:</b> Organize</li>
            </ul>
          </div>
          <p>Please log in to <a href="${registrationLink}" style="color:#FF4C18; text-decoration:none;"><b>gopratle.com</b></a>, complete your profile with a picture and past experiences, and start collaborating with event organizers!</p>
        </div>
        <div class="cta">
          <a href="${registrationLink}">Get Started</a>
        </div>
        <div class="footer">
          <p>We can’t wait to see you in action!<br/>Gopratle </p>
        </div>
      </div>
    </body>
    </html>
    `;
  };