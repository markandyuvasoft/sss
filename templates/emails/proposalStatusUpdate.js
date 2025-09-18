// templates/emails/proposalStatusUpdate.js
module.exports = (recipientName, eventName, status, proposalLink) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center;">
      <h2 style="color: #FF4C18;"> Proposal Status Update</h2>
      <p style="font-size: 16px; color: #333;">Hey <strong>${recipientName}</strong>,</p>
    </div>
    <div style="background: #fff; padding: 15px; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
      <p>The proposal for "<strong>${eventName}</strong>" has been <strong>${status}</strong>.</p>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${proposalLink}" style="background-color: #FF4C18; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; font-weight: bold;">
        View Proposal
      </a>
    </div>
    <div style="margin-top: 20px; text-align: center; font-size: 14px; color: #555;">
      <p>Best regards,</p>
      <p><strong> Gopratle</strong></p>
    </div>
  </div>
`;