// templates/emails/newProposal.js
module.exports = (customerName, eventName, managerName, proposedBudget, currency, proposalDescription, proposalLink) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background-color: #f9f9f9;">
    <div style="text-align: center;">
      <h2 style="color: #FF4C18;"> New Proposal Received! </h2>
      <p style="font-size: 16px; color: #333;">Hey <strong>${customerName}</strong>, you’ve got a new proposal for your event "<strong>${eventName}</strong>"!</p>
    </div>

    <div style="background: #fff; padding: 15px; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
      <h3 style="color: #FF4C18;"> Proposal Details:</h3>
      <ul style="list-style: none; padding: 0;">
        <li><strong>From:</strong> ${managerName}</li>
        <li><strong>Proposed Budget:</strong> ${currency} ${proposedBudget}</li>
        <li><strong>Description:</strong> ${proposalDescription || 'N/A'}</li>
      </ul>
    </div>

    <div style="margin-top: 15px; text-align: center;">
      <p style="font-size: 16px;"> Check out the details and respond to this proposal!</p>
    </div>

    <div style="text-align: center; margin-top: 20px;">
      <a href="${proposalLink}" style="background-color: #FF4C18; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; font-weight: bold;">
        View Proposal
      </a>
    </div>

    <div style="margin-top: 20px; text-align: center; font-size: 14px; color: #555;">
      <p>Best regards,</p>
      <p><strong> Gopratle </strong></p>
    </div>
  </div>
`;