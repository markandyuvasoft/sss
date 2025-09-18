const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const API_KEY = 'your_api_key_here'; // Replace with your actual API key
const JWT_TOKEN = 'your_jwt_token_here'; // Replace with actual JWT token

// Test data
const testPackageId = '64f8a1b2c3d4e5f6a7b8c9d0'; // Replace with actual package ID
const testCustomerDetails = {
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '9876543210'
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const testCreatePaymentLink = async () => {
  console.log('\n🧪 Testing Create Payment Link...');
  
  const requestData = {
    packageId: testPackageId,
    customerDetails: testCustomerDetails
  };

  try {
    const result = await makeRequest('POST', '/api/payments/create-link', requestData);
    console.log('✅ Payment link created successfully:', result);
    return result.data.orderId;
  } catch (error) {
    console.log('❌ Failed to create payment link');
    return null;
  }
};

const testGetPaymentDetails = async (orderId) => {
  console.log('\n🧪 Testing Get Payment Details...');
  
  try {
    const result = await makeRequest('GET', `/api/payments/${orderId}`);
    console.log('✅ Payment details retrieved successfully:', result);
    return result;
  } catch (error) {
    console.log('❌ Failed to get payment details');
    return null;
  }
};

const testGetUserPayments = async () => {
  console.log('\n🧪 Testing Get User Payment History...');
  
  try {
    const result = await makeRequest('GET', '/api/payments/user/history');
    console.log('✅ User payment history retrieved successfully:', result);
    return result;
  } catch (error) {
    console.log('❌ Failed to get user payment history');
    return null;
  }
};

const testRefundPayment = async (orderId) => {
  console.log('\n🧪 Testing Refund Payment...');
  
  const requestData = {
    refundAmount: 25000,
    reason: 'Test refund'
  };

  try {
    const result = await makeRequest('POST', `/api/payments/${orderId}/refund`, requestData);
    console.log('✅ Refund initiated successfully:', result);
    return result;
  } catch (error) {
    console.log('❌ Failed to refund payment');
    return null;
  }
};

const testGetPaymentStats = async () => {
  console.log('\n🧪 Testing Get Payment Statistics...');
  
  try {
    const result = await makeRequest('GET', '/api/payments/stats');
    console.log('✅ Payment statistics retrieved successfully:', result);
    return result;
  } catch (error) {
    console.log('❌ Failed to get payment statistics');
    return null;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Payment Integration Tests...\n');
  
  // Test 1: Create payment link
  const orderId = await testCreatePaymentLink();
  
  if (orderId) {
    // Test 2: Get payment details
    await testGetPaymentDetails(orderId);
    
    // Test 3: Get user payment history
    await testGetUserPayments();
    
    // Test 4: Test refund (this might fail if payment is not successful)
    await testRefundPayment(orderId);
  }
  
  // Test 5: Get payment statistics (admin only)
  await testGetPaymentStats();
  
  console.log('\n✨ Payment integration tests completed!');
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testCreatePaymentLink,
  testGetPaymentDetails,
  testGetUserPayments,
  testRefundPayment,
  testGetPaymentStats,
  runTests
}; 