module.exports = (managerName, eventName, eventType, location, guests, startDate, endDate, budget, currency, additionalInfo, eventLink) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background-color: #f9f9f9;">
  <div style="text-align: center;">
    <h2 style="color: #FF4C18;"> New Private Event Request! </h2>
    <p style="font-size: 16px; color: #333;">Dear <strong>${managerName}</strong>, you’ve received a private event request for "<strong>${eventName}</strong>"!</p>
  </div>

  <div style="background: #fff; padding: 15px; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <h3 style="color: #FF4C18;"> Event Details:</h3>
    <ul style="list-style: none; padding: 0;">
      <li> <strong>Type:</strong> ${eventType}</li>
      <li> <strong>Location:</strong> ${location}</li>
      <li> <strong>Guests:</strong> ${guests}</li>
      <li> <strong>Start Date:</strong> ${new Date(startDate).toDateString()}</li>
      <li> <strong>End Date:</strong> ${endDate ? new Date(endDate).toDateString() : "TBD"}</li>
      <li> <strong>Budget:</strong> ${currency} ${budget}</li>
      <li> <strong>Additional Info:</strong> ${additionalInfo || 'N/A'}</li>
    </ul>
  </div>

  <div style="margin-top: 15px; text-align: center;">
    <p style="font-size: 16px;"> This is a private request exclusively for you. Please review and submit your proposal soon!</p>
    <p style="font-size: 14px; color: #555;">(Check your dashboard for details!)</p>
  </div>

  <div style="text-align: center; margin-top: 20px;">
    <a href="${eventLink}" style="background-color: #FF4C18; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; font-weight: bold;">
      View Event Request
    </a>
  </div>

  <div style="margin-top: 20px; text-align: center; font-size: 14px; color: #555;">
    <p>Best regards,</p>
    <p><strong> Gopratle</strong></p>
  </div>
</div>
`;