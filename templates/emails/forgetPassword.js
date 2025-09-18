module.exports = (fullName, resetLink) => {
  return `
      <p>Hello <b>${fullName}</b>,</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
    `;
};
