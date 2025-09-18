module.exports = (eventName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
    <h2 style="color: #FF4C18; text-align: center;">Event Deleted</h2>
    <p style="font-size: 16px; color: #333; text-align: center;">
      The event "<strong>${eventName}</strong>" has been deleted by the customer.
    </p>
    <div style="background: #fff; padding: 15px; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
      <p>All related proposals and activities have been removed.</p>
    </div>
    <p style="font-size: 14px; color: #555; text-align: center; margin-top: 20px;">
      Best regards,<br><strong>Gopratle Team</strong>
    </p>
  </div>
`;