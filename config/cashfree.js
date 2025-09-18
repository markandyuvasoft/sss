const { Cashfree } = require('cashfree-pg');

// Initialize Cashfree SDK based on environment
const initializeCashfree = () => {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const environment = process.env.NODE_ENV === 'production' ? Cashfree.PRODUCTION : Cashfree.SANDBOX;

  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials not found in environment variables');
  }

  // Create Cashfree instance with environment, clientId, and clientSecret
  return new Cashfree(environment, clientId, clientSecret);
};

module.exports = { initializeCashfree }; 