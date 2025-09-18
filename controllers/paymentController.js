const paymentService = require('../services/paymentService');
const PaymentLinkLog = require('../models/PaymentLinkLog');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

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

      // For now, we'll use a default package ID since the new structure doesn't include it
      // You might want to create a package dynamically or use a different approach
      packageId = proposerDetails.proposalId; // Using proposalId as packageId for now
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
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('==================================');
  
  res.status(200).json({
    success: true,
    message: 'Webhook test endpoint is working',
    timestamp: new Date().toISOString(),
    method: req.method,
    received: true
  });
});

// Process webhook from Cashfree
exports.processWebhook = asyncHandler(async (req, res) => {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('========================');

  try {
    const webhookData = req.body;
    
    // Always respond with 200 OK first (Cashfree requirement)
    res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    });

    // Process webhook asynchronously
    try {
      const result = await paymentService.processWebhook(webhookData);
      console.log('Webhook processed successfully:', result);
    } catch (processError) {
      console.error('Error processing webhook data:', processError);
    }
    
  } catch (error) {
    console.error('Error in webhook endpoint:', error);
    // Still send 200 OK to Cashfree to avoid retries
    res.status(200).json({
      success: false,
      message: 'Webhook received but processing failed',
      timestamp: new Date().toISOString()
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
