# Cashfree Payment Integration for GoPratle

This document outlines the Cashfree payment integration implemented for the GoPratle event management platform.

## Overview

The payment system allows customers to pay 25% of the package budget as a booking amount using Cashfree's payment gateway. The integration includes:

- Payment link generation
- Webhook processing for payment status updates
- Payment history tracking
- Refund functionality
- Payment analytics

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Cashfree Configuration
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_WEBHOOK_SECRET=your_webhook_secret

# Application URLs
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
```

### 2. Cashfree Dashboard Setup

1. Log in to your Cashfree merchant dashboard
2. Navigate to Settings > API Keys
3. Generate API keys for your environment (Sandbox/Production)
4. Configure webhook URL: `https://your-backend-domain.com/api/payments/webhook`
5. Set webhook secret for signature verification

### 3. SDK Installation

The integration uses the official Cashfree Node.js SDK:

```bash
npm install cashfree-pg-sdk-nodejs
```

## API Endpoints

### 1. Create Payment Link

**Endpoint:** `POST /api/payments/create-link`

**Headers:**
```
x-api-key: your_api_key
Authorization: Bearer your_jwt_token
```

**Request Body:**
```json
{
  "packageId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "customerDetails": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment link generated successfully",
  "data": {
    "orderId": "ORDER_1699123456789_abc123",
    "paymentLink": "https://payments.cashfree.com/order/...",
    "amount": 25000,
    "packageDetails": {
      "title": "Premium Wedding Package",
      "budget": 100000,
      "originalAmount": 100000,
      "discountAmount": 25000
    }
  }
}
```

### 2. Get Payment Details

**Endpoint:** `GET /api/payments/:orderId`

**Headers:**
```
x-api-key: your_api_key
Authorization: Bearer your_jwt_token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "orderId": "ORDER_1699123456789_abc123",
    "packageId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Premium Wedding Package",
      "eventType": "Wedding",
      "budget": 100000
    },
    "userId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "amount": 25000,
    "currency": "INR",
    "paymentStatus": "SUCCESS",
    "cashfreeOrderId": "ORDER_1699123456789_abc123",
    "cashfreePaymentId": "PAY_123456789",
    "paymentLink": "https://payments.cashfree.com/order/...",
    "customerDetails": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "metadata": {
      "packageTitle": "Premium Wedding Package",
      "packageBudget": "100000",
      "originalAmount": "100000",
      "discountPercentage": "25",
      "transactionTime": "2023-11-03T10:30:00Z",
      "transactionMessage": "Payment successful"
    },
    "createdAt": "2023-11-03T10:00:00.000Z",
    "updatedAt": "2023-11-03T10:30:00.000Z"
  }
}
```

### 3. Get User Payment History

**Endpoint:** `GET /api/payments/user/history`

**Headers:**
```
x-api-key: your_api_key
Authorization: Bearer your_jwt_token
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "orderId": "ORDER_1699123456789_abc123",
      "packageId": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "Premium Wedding Package",
        "eventType": "Wedding",
        "budget": 100000
      },
      "amount": 25000,
      "paymentStatus": "SUCCESS",
      "createdAt": "2023-11-03T10:00:00.000Z"
    }
  ]
}
```

### 4. Process Webhook (Cashfree → Backend)

**Endpoint:** `POST /api/payments/webhook`

**Note:** This endpoint is called by Cashfree and doesn't require authentication.

**Request Body (from Cashfree):**
```json
{
  "orderId": "ORDER_1699123456789_abc123",
  "orderAmount": 25000,
  "referenceId": "PAY_123456789",
  "txStatus": "SUCCESS",
  "txMsg": "Payment successful",
  "txTime": "2023-11-03T10:30:00Z",
  "paymentMode": "UPI",
  "cardMask": null,
  "cardNetwork": null,
  "cardIssuer": null,
  "cardType": null,
  "cardCountryName": null,
  "cardCountryCode": null
}
```

### 5. Refund Payment

**Endpoint:** `POST /api/payments/:orderId/refund`

**Headers:**
```
x-api-key: your_api_key
Authorization: Bearer your_jwt_token
```

**Request Body:**
```json
{
  "refundAmount": 25000,
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund initiated successfully",
  "data": {
    "refundId": "REFUND_1699123456789_xyz789",
    "refundStatus": "SUCCESS"
  }
}
```

### 6. Get Payment Statistics (Admin Only)

**Endpoint:** `GET /api/payments/stats`

**Headers:**
```
x-api-key: your_api_key
Authorization: Bearer your_jwt_token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPayments": 50,
    "successfulPayments": 45,
    "totalRevenue": 1125000,
    "statusBreakdown": [
      {
        "_id": "SUCCESS",
        "count": 45,
        "totalAmount": 1125000
      },
      {
        "_id": "PENDING",
        "count": 3,
        "totalAmount": 75000
      },
      {
        "_id": "FAILED",
        "count": 2,
        "totalAmount": 50000
      }
    ]
  }
}
```

## Database Schema

### Payment Model

```javascript
{
  orderId: String,           // Unique order identifier
  packageId: ObjectId,       // Reference to Package
  userId: ObjectId,          // Reference to User
  amount: Number,            // Payment amount (25% of package budget)
  currency: String,          // Default: "INR"
  paymentStatus: String,     // PENDING, SUCCESS, FAILED, CANCELLED
  cashfreeOrderId: String,   // Cashfree's order ID
  cashfreePaymentId: String, // Cashfree's payment ID
  paymentLink: String,       // Cashfree payment link
  paymentMethod: String,     // Payment method used
  customerDetails: {
    name: String,
    email: String,
    phone: String
  },
  metadata: Map,             // Additional payment information
  createdAt: Date,
  updatedAt: Date
}
```

## Payment Flow

1. **Customer selects a package** and initiates payment
2. **Backend creates payment order** with 25% of package budget
3. **Cashfree generates payment link** and returns it
4. **Customer completes payment** using the payment link
5. **Cashfree sends webhook** to update payment status
6. **Backend processes webhook** and updates payment record
7. **Payment confirmation** is sent to customer

## Security Features

1. **API Key Authentication**: All payment endpoints require valid API key
2. **JWT Token Authorization**: User-specific operations require valid JWT
3. **Webhook Signature Verification**: Validates webhook authenticity (optional)
4. **Role-based Access Control**: Different endpoints for different user roles
5. **Input Validation**: Comprehensive validation for all inputs

## Error Handling

The payment system includes comprehensive error handling for:

- Invalid package IDs
- Missing customer details
- Cashfree API errors
- Database connection issues
- Webhook processing errors
- Refund validation errors

## Testing

### Sandbox Environment

1. Use Cashfree sandbox credentials
2. Test with sandbox payment methods
3. Verify webhook processing
4. Test refund functionality

### Production Environment

1. Use Cashfree production credentials
2. Enable webhook signature verification
3. Monitor payment logs
4. Set up error alerting

## Monitoring and Logging

- All payment operations are logged
- Webhook processing is monitored
- Failed payments are tracked
- Payment analytics are available

## Support

For issues related to:
- **Cashfree Integration**: Check Cashfree documentation
- **Backend API**: Review server logs
- **Database Issues**: Check MongoDB connection
- **Webhook Problems**: Verify webhook URL and signature

## Future Enhancements

1. **Multiple Payment Methods**: Support for cards, UPI, wallets
2. **Installment Payments**: Split payment into multiple installments
3. **Payment Analytics**: Advanced reporting and insights
4. **Automated Refunds**: Automatic refund processing
5. **Payment Reminders**: Automated payment reminders
6. **Multi-currency Support**: Support for different currencies 