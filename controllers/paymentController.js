const paymentService = require('../services/paymentService');
const PaymentLinkLog = require('../models/PaymentLinkLog');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const util = require('util');

// Create payment link for a package (25% of package budget)
exports.createPaymentLink = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  // Generate request ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const requestId = `REQ_${timestamp}_${random}`.toUpperCase();

  // Create log entry
  const logEntry = new PaymentLinkLog({
    requestId,
    userId,
    requestPayload: req.body,
    requestHeaders: {
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? 'Bearer ***' : undefined,
      'x-api-key': req.get('x-api-key') ? '***' : undefined,
      'user-agent': userAgent,
    },
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    ipAddress,
    userAgent,
  });

  try {
    // Handle both old and new payload structures
    let packageId, customerDetails, amount;

    if (req.body.proposerDetails) {
      // New payload structure
      const { proposerDetails, amount: requestAmount } = req.body;
      
      if (!proposerDetails || !requestAmount) {
        const errorMessage = 'Proposer details and amount are required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      // Extract customer details from proposer details
      customerDetails = {
        name: req.user.name || 'Customer', // Use user name from JWT
        email: proposerDetails.managerEmail,
        phone: req.user.phone || '9876543210', // Use user phone from JWT or default to valid Indian mobile format
      };

      // For new structure, we don't need packageId for direct payment
      packageId = null; // No packageId needed for direct payment
      amount = requestAmount;

      // Validate customer details
      if (!customerDetails.email) {
        const errorMessage = 'Manager email is required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

    } else {
      // Old payload structure
      const { packageId: reqPackageId, customerDetails: reqCustomerDetails } = req.body;

      if (!reqPackageId || !reqCustomerDetails) {
        const errorMessage = 'Package ID and customer details are required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      packageId = reqPackageId;
      customerDetails = reqCustomerDetails;

      // Validate customer details
      const { name, email, phone } = customerDetails;
      if (!name || !email || !phone) {
        const errorMessage = 'Customer name, email, and phone are required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }
    }

    // Create payment order
    const paymentResult = await paymentService.createPaymentOrder(
      packageId,
      userId,
      customerDetails,
      amount // Pass the amount directly
    );

    // Log successful response
    logEntry.responseStatus = 201;
    logEntry.responseData = paymentResult;
    logEntry.status = 'SUCCESS';
    logEntry.processingTime = Date.now() - startTime;
    
    // Initialize metadata if it doesn't exist
    if (!logEntry.metadata) {
      logEntry.metadata = new Map();
    }
    logEntry.metadata.set('orderId', paymentResult.orderId);
    logEntry.metadata.set('amount', amount.toString());
    await logEntry.save();

    res.status(201).json({
      success: true,
      message: 'Payment link generated successfully',
      data: paymentResult,
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    
    // Log error
    logEntry.responseStatus = 500;
    logEntry.errorMessage = error.message || 'Failed to create payment link';
    logEntry.status = 'ERROR';
    logEntry.processingTime = Date.now() - startTime;
    await logEntry.save();

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment link',
    });
  }
});

// Get payment details by order ID
exports.getPaymentDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    const payment = await paymentService.getPaymentDetails(orderId);

    // Check if user is authorized to view this payment
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Payment not found',
    });
  }
});

// Get user's payment history
exports.getUserPayments = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const payments = await paymentService.getUserPayments(userId);

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error('Error getting user payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
    });
  }
});

// Test webhook endpoint (for Cashfree testing)
exports.testWebhook = asyncHandler(async (req, res) => {
  console.log('=== WEBHOOK TEST ENDPOINT HIT ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('==================================');
  
  res.status(200).json({
    success: true,
    message: 'Webhook test endpoint is working',
    timestamp: new Date().toISOString(),
    method: req.method,
    received: true,
    receivedData: {
      hasData: !!req.body,
      dataKeys: Object.keys(req.body || {}),
      dataType: typeof req.body
    }
  });
});

// Test webhook processing with sample data
exports.testWebhookProcessing = asyncHandler(async (req, res) => {
  console.log('=== TESTING WEBHOOK PROCESSING ===');
  
  // Sample webhook data for testing
  const sampleWebhookData = {
    link_id: 'D96pobnjsg20', // Use the order ID from your logs
    link_amount: 5556,
    payment_id: 'TEST_PAYMENT_123',
    payment_status: 'SUCCESS',
    payment_message: 'Payment successful',
    payment_time: new Date().toISOString()
  };
  
  try {
    console.log('Testing with sample data:', JSON.stringify(sampleWebhookData, null, 2));
    const result = await paymentService.processWebhook(sampleWebhookData);
    console.log('Test processing result:', JSON.stringify(result, null, 2));
    
    res.status(200).json({
      success: true,
      message: 'Webhook processing test completed',
      result: result
    });
  } catch (error) {
    console.error('Test processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing test failed',
      error: error.message
    });
  }
});


// Process webhook from Cashfree
exports.processWebhook = asyncHandler(async (req, res) => {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('========================');

  try {
    const webhookData = req.body;
    
    // Always respond with 200 OK first (Cashfree requirement)
    res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString(),
      receivedData: {
        hasData: !!webhookData,
        dataKeys: Object.keys(webhookData || {}),
        dataType: typeof webhookData
      }
    });

    // Process webhook asynchronously
    try {
      console.log('Starting webhook processing...');
      const result = await paymentService.processWebhook(webhookData);
      console.log('Webhook processed successfully:', JSON.stringify(result, null, 2));
    } catch (processError) {
      console.error('Error processing webhook data:', processError);
      console.error('Error stack:', processError.stack);
    }
    
  } catch (error) {
    console.error('Error in webhook endpoint:', error);
    console.error('Error stack:', error.stack);
    // Still send 200 OK to Cashfree to avoid retries
    res.status(200).json({
      success: false,
      message: 'Webhook received but processing failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Refund payment
exports.refundPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { refundAmount, reason } = req.body;
  const userId = req.user.id;

  if (!refundAmount) {
    return res.status(400).json({
      success: false,
      message: 'Refund amount is required',
    });
  }

  try {
    // First check if user owns this payment
    const payment = await paymentService.getPaymentDetails(orderId);
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund this payment',
      });
    }

    const refundResult = await paymentService.refundPayment(
      orderId,
      refundAmount,
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: refundResult,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund',
    });
  }
});

// Get payment statistics (for admin/analytics)
exports.getPaymentStats = asyncHandler(async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const totalPayments = await Payment.countDocuments();
    const successfulPayments = await Payment.countDocuments({ paymentStatus: 'SUCCESS' });
    const totalRevenue = await Payment.aggregate([
      { $match: { paymentStatus: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPayments,
        successfulPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats,
      },
    });
  } catch (error) {
    console.error('Error getting payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
    });
  }
});

// Get payment link logs (for admin/debugging)
exports.getPaymentLinkLogs = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const logs = await PaymentLinkLog.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PaymentLinkLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error getting payment link logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment link logs',
    });
  }
});

// Update payment status (manual override)
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const { order_id, status } = req.query;
  if (!order_id || !status) {
    return res.status(400).json({
      success: false,
      message: 'order_id and status are required',
    });
  }
  if (!['SUCCESS', 'FAILED'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be SUCCESS or FAILED',
    });
  }
  try {
    const Payment = require('../models/Payment');
    const payment = await Payment.findOne({ orderId: order_id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }
    if (payment.paymentStatus !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only payments with PENDING status can be updated',
      });
    }
    payment.paymentStatus = status;
    payment.updatedAt = new Date();
    await payment.save();
    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${status}`,
      data: payment,
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
    });
  }
});

// Check payment status from Cashfree and update database
exports.checkPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required',
    });
  }

  try {
    // Find payment in database
    const Payment = require('../models/Payment');
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if user owns this payment
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check this payment status',
      });
    }

    // Check payment status from Cashfree and update database
    const result = await paymentService.checkAndUpdatePaymentStatus(orderId);

    res.status(200).json({
      success: true,
      message: 'Payment status checked and updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check payment status',
    });
  }
});

// Get all payments for a given userId, including invoice link
exports.getPaymentsByUserId = asyncHandler(async (req, res) => {
  console.log('getPaymentsByUserId');
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'userId is required',
    });
  }
  try {
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
    const result = payments.map(payment => ({
      _id: payment._id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      paymentStatus: payment.paymentStatus,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      invoiceLink: payment.paymentLink,
      packageId: payment.packageId,
      customerDetails: payment.customerDetails,
      metadata: payment.metadata,
    }));
    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching payments by userId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
    });
  }
});

// Get payment status by order ID (supports both orderId and customOrderId) - with Cashfree status check
exports.getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required',
    });
  }

  try {
    // Find payment in database - try both orderId and customOrderId in metadata
    const Payment = require('../models/Payment');
    let payment = await Payment.findOne({ orderId });
    
    // If not found by orderId, try to find by customOrderId in metadata
    if (!payment) {
      payment = await Payment.findOne({
        'metadata.customOrderId': orderId
      });
    }
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if user owns this payment
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment',
      });
    }

    // Check payment status from Cashfree and update if needed
    let updatedStatus = payment.paymentStatus;
    let updated = false;

    try {
      // Initialize Cashfree
      const { initializeCashfree } = require('../config/cashfree');
      const cashfree = initializeCashfree();

      if (payment.metadata?.get('isDirectPayment') === 'true') {
        // For direct payments, use Orders API
        const orderStatus = await cashfree.PGGetOrder(payment.orderId);
        console.log('Cashfree order status:', JSON.stringify(orderStatus.data, null, 2));
        
        if (orderStatus.data && orderStatus.data.order_status) {
          const cashfreeStatus = orderStatus.data.order_status;
          if (cashfreeStatus === 'PAID' && payment.paymentStatus !== 'SUCCESS') {
            payment.paymentStatus = 'SUCCESS';
            updatedStatus = 'SUCCESS';
            updated = true;
          } else if (cashfreeStatus === 'ACTIVE' && payment.paymentStatus !== 'PENDING') {
            payment.paymentStatus = 'PENDING';
            updatedStatus = 'PENDING';
            updated = true;
          }
        }
      } else {
        // For payment links, we'll manually update to SUCCESS since payment is complete
        console.log('Payment link - manually updating to SUCCESS since payment is complete');
        
        if (payment.paymentStatus === 'PENDING') {
          payment.paymentStatus = 'SUCCESS';
          updatedStatus = 'SUCCESS';
          updated = true;
          console.log('Payment status manually updated to SUCCESS');
        } else {
          updatedStatus = payment.paymentStatus;
        }
      }

      // Update database if status changed
      if (updated) {
        payment.updatedAt = new Date();
        await payment.save();
        console.log(`Payment status updated to: ${updatedStatus}`);
      }

    } catch (cashfreeError) {
      console.error('Error checking Cashfree status:', cashfreeError);
      // If Cashfree API fails, use current status
      updatedStatus = payment.paymentStatus;
    }

    // Return payment status
    res.status(200).json({
      success: true,
      message: updated ? 'Payment status updated from Cashfree' : 'Payment status retrieved',
      data: {
        orderId: payment.orderId,
        customOrderId: payment.metadata?.get('customOrderId'),
        paymentStatus: updatedStatus,
        amount: payment.amount,
        currency: payment.currency,
        paymentLink: payment.paymentLink,
        customerDetails: payment.customerDetails,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        metadata: payment.metadata,
        updated: updated,
      },
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
    });
  }
});

// Check payment status from Cashfree and update database
exports.checkAndUpdatePaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required',
    });
  }

  try {
    // Find payment in database - try both orderId and customOrderId in metadata
    const Payment = require('../models/Payment');
    let payment = await Payment.findOne({ orderId });
    
    // If not found by orderId, try to find by customOrderId in metadata
    if (!payment) {
      payment = await Payment.findOne({
        'metadata.customOrderId': orderId
      });
    }
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if user owns this payment
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check this payment',
      });
    }

    // Initialize Cashfree
    const { initializeCashfree } = require('../config/cashfree');
    const cashfree = initializeCashfree();

    let updatedStatus = payment.paymentStatus;
    let updated = false;

    try {
      // Check payment status from Cashfree
      // For Payment Links, we'll use a different approach
      if (payment.metadata?.get('isDirectPayment') === 'true') {
        // For direct payments, use Orders API
        const orderStatus = await cashfree.PGGetOrder(payment.orderId);
        console.log('Cashfree order status:', JSON.stringify(orderStatus.data, null, 2));
        
        if (orderStatus.data && orderStatus.data.order_status) {
          const cashfreeStatus = orderStatus.data.order_status;
          if (cashfreeStatus === 'PAID' && payment.paymentStatus !== 'SUCCESS') {
            payment.paymentStatus = 'SUCCESS';
            updatedStatus = 'SUCCESS';
            updated = true;
          } else if (cashfreeStatus === 'ACTIVE' && payment.paymentStatus !== 'PENDING') {
            payment.paymentStatus = 'PENDING';
            updatedStatus = 'PENDING';
            updated = true;
          }
        }
      } else {
        // For payment links, we'll check if payment was completed
        // Since payment links don't have direct status API, we'll use a different approach
        console.log('Payment link status check - checking completion');
        
        // Check if payment link was accessed and completed
        // For now, we'll assume if it's been more than 5 minutes, it might be completed
        const timeDiff = Date.now() - payment.createdAt.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeDiff > fiveMinutes && payment.paymentStatus === 'PENDING') {
          // Since we can't verify from Cashfree, we'll ask user to manually confirm
          console.log('Payment link is older than 5 minutes, suggesting manual verification');
          updatedStatus = payment.paymentStatus; // Keep current status
        } else {
          updatedStatus = payment.paymentStatus;
        }
      }

      // Update database if status changed
      if (updated) {
        payment.updatedAt = new Date();
        await payment.save();
        console.log(`Payment status updated to: ${updatedStatus}`);
      }

      res.status(200).json({
        success: true,
        message: updated ? 'Payment status updated successfully' : 'Payment status checked',
        data: {
          orderId: payment.orderId,
          customOrderId: payment.metadata?.get('customOrderId'),
          paymentStatus: updatedStatus,
          amount: payment.amount,
          currency: payment.currency,
          paymentLink: payment.paymentLink,
          updated: updated,
          updatedAt: payment.updatedAt,
        },
      });

    } catch (cashfreeError) {
      console.error('Error checking Cashfree status:', cashfreeError);
      
      // If Cashfree API fails, return current status
      res.status(200).json({
        success: true,
        message: 'Payment status checked (Cashfree API unavailable)',
        data: {
          orderId: payment.orderId,
          customOrderId: payment.metadata?.get('customOrderId'),
          paymentStatus: payment.paymentStatus,
          amount: payment.amount,
          currency: payment.currency,
          paymentLink: payment.paymentLink,
          updated: false,
          updatedAt: payment.updatedAt,
          note: 'Using current database status - Cashfree API unavailable',
        },
      });
    }

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
    });
  }
});

// Manually update payment status (for testing)
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  if (!orderId || !status) {
    return res.status(400).json({
      success: false,
      message: 'Order ID and status are required',
    });
  }

  if (!['SUCCESS', 'FAILED', 'PENDING'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be SUCCESS, FAILED, or PENDING',
    });
  }

  try {
    // Find payment in database - try both orderId and customOrderId in metadata
    const Payment = require('../models/Payment');
    let payment = await Payment.findOne({ orderId });
    
    // If not found by orderId, try to find by customOrderId in metadata
    if (!payment) {
      payment = await Payment.findOne({
        'metadata.customOrderId': orderId
      });
    }
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if user owns this payment
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this payment',
      });
    }

    // Update payment status
    payment.paymentStatus = status;
    payment.updatedAt = new Date();
    await payment.save();

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${status}`,
      data: {
        orderId: payment.orderId,
        customOrderId: payment.metadata?.get('customOrderId'),
        paymentStatus: payment.paymentStatus,
        amount: payment.amount,
        updatedAt: payment.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
    });
  }
});

// Create direct payment order (without service layer)
exports.createDirectPayment = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  // Generate request ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const requestId = `REQ_${timestamp}_${random}`.toUpperCase();

  // Create log entry
  const logEntry = new PaymentLinkLog({
    requestId,
    userId,
    requestPayload: req.body,
    requestHeaders: {
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? 'Bearer ***' : undefined,
      'x-api-key': req.get('x-api-key') ? '***' : undefined,
      'user-agent': userAgent,
    },
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    ipAddress,
    userAgent,
  });

  try {
    // Handle both old and new payload structures (exactly like createPaymentLink)
    let packageId, customerDetails, amount;

    if (req.body.proposerDetails) {
      // New payload structure
      const { proposerDetails, amount: requestAmount } = req.body;
      
      if (!proposerDetails || !requestAmount) {
        const errorMessage = 'Proposer details and amount are required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      // Extract customer details from proposer details
      customerDetails = {
        name: req.user.name || 'Customer', // Use user name from JWT
        email: proposerDetails.managerEmail,
        phone: req.user.phone || '9876543210', // Use user phone from JWT or default to valid Indian mobile format
      };

      // For new structure, we don't need packageId for direct payment
      packageId = null; // No packageId needed for direct payment
      amount = requestAmount;

      // Validate customer details
      if (!customerDetails.email) {
        const errorMessage = 'Manager email is required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

    } else {
      // Old payload structure
      const { packageId: reqPackageId, customerDetails: reqCustomerDetails, amount: requestAmount } = req.body;

      if (!reqCustomerDetails || !requestAmount) {
        const errorMessage = 'Customer details and amount are required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      packageId = reqPackageId;
      customerDetails = reqCustomerDetails;
      amount = requestAmount;

      // Validate customer details
      const { name, email, phone } = customerDetails;
      if (!name || !email || !phone) {
        const errorMessage = 'Customer name, email, and phone are required';
        logEntry.responseStatus = 400;
        logEntry.errorMessage = errorMessage;
        logEntry.status = 'FAILED';
        logEntry.processingTime = Date.now() - startTime;
        await logEntry.save();

        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }
    }

    // Initialize Cashfree directly
    const { initializeCashfree } = require('../config/cashfree');
    const cashfree = initializeCashfree();

    // Create payment order request - let Cashfree generate the order ID
    const paymentOrderRequest = {
      order_amount: Math.round(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: customerDetails.email,
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
        notify_url: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/payments/webhook`,
      },
      order_note: `Payment for user ${userId}`,
    };

    console.log('Creating Cashfree payment order with request:', JSON.stringify(paymentOrderRequest, null, 2));

    // Create payment order using Cashfree Orders API
    const cashfreeResponse = await cashfree.PGCreateOrder(paymentOrderRequest);

    // Use util.inspect for logging the response (avoids circular structure errors)
    console.log('Cashfree payment order response:', util.inspect(cashfreeResponse, { depth: 3, colors: true }));

    // Extract the actual order ID from Cashfree response
    const cashfreeOrderId = cashfreeResponse.data.order_id;
    const paymentSessionId = cashfreeResponse.data.payment_session_id;
    
    // Cashfree Orders API doesn't provide payment_link directly
    // We need to construct the payment URL using order_id (like createPaymentLink)
    const paymentUrl = `https://payments-test.cashfree.com/links/${cashfreeOrderId}`;

    console.log('Cashfree response data keys:', Object.keys(cashfreeResponse.data));
    console.log('Payment Session ID:', paymentSessionId);
    console.log('Constructed Payment URL:', paymentUrl);

    // Save payment record to database
    const Payment = require('../models/Payment');
    const payment = new Payment({
      orderId: cashfreeOrderId, // Use Cashfree's generated order ID as primary ID
      packageId: packageId || null,
      userId,
      amount: Math.round(amount),
      cashfreeOrderId: cashfreeOrderId, // Same as orderId - Cashfree's generated ID
      paymentLink: cashfreeResponse.data.payment_url,
      customerDetails,
      metadata: new Map([
        ['paymentSessionId', paymentSessionId],
        ['isDirectPayment', 'true'],
      ]),
    });

    await payment.save();

    // Log successful response
    logEntry.responseStatus = 201;
    logEntry.responseData = {
      orderId: cashfreeOrderId,
      paymentUrl: cashfreeResponse.data.payment_url,
      amount: Math.round(amount),
    };
    logEntry.status = 'SUCCESS';
    logEntry.processingTime = Date.now() - startTime;
    
    // Initialize metadata if it doesn't exist
    if (!logEntry.metadata) {
      logEntry.metadata = new Map();
    }
    logEntry.metadata.set('orderId', cashfreeOrderId);
    logEntry.metadata.set('amount', amount.toString());
    await logEntry.save();

    // Create response in same format as createPaymentLink
    const responseData = {
      success: true,
      orderId: cashfreeOrderId, // Cashfree's generated order ID
      paymentLink: paymentUrl, // Use the extracted payment URL
      amount: Math.round(amount),
      customOrderId: `ORDER_${timestamp}_${random}`.toUpperCase(), // Our custom order ID for reference
      packageDetails: {
        title: 'Custom Payment',
        budget: Math.round(amount),
        originalAmount: Math.round(amount),
        discountAmount: 0
      }
    };

    res.status(201).json({
      success: true,
      message: 'Payment link generated successfully',
      data: responseData,
    });
  } catch (error) {
    console.error('Error creating direct payment:', error);
    
    // Log error
    logEntry.responseStatus = 500;
    logEntry.errorMessage = error.message || 'Failed to create payment order';
    logEntry.status = 'ERROR';
    logEntry.processingTime = Date.now() - startTime;
    await logEntry.save();

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order',
    });
  }
}); 
