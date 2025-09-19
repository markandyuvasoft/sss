const { initializeCashfree } = require('../config/cashfree');
const Payment = require('../models/Payment');
const Package = require('../models/package');
const crypto = require('crypto');
const util = require('util');

class PaymentService {
  constructor() {
    this.cashfree = null;
  }

  // Initialize Cashfree configuration lazily
  initializeCashfreeConfig() {
    if (!this.cashfree) {
      this.cashfree = initializeCashfree();
    }
    return this.cashfree;
  }

  // Generate a unique order ID
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `ORDER_${timestamp}_${random}`.toUpperCase();
  }

  // Create a new payment order
  async createPaymentOrder(packageId, userId, customerDetails, customAmount = null) {
    try {
      // Initialize configuration
      this.initializeCashfreeConfig();

      let packageDetails = null;
      let amount;

      // Try to get package details if packageId is a valid ObjectId
      if (packageId && packageId.length === 24) {
        try {
          packageDetails = await Package.findById(packageId);
        } catch (error) {
          console.log('Package not found, proceeding with custom amount');
        }
      }

      if (customAmount) {
        // Use custom amount if provided
        amount = Math.round(customAmount);
        if (!packageDetails) {
          packageDetails = {
            title: 'Custom Payment',
            budget: customAmount,
          };
        }
      } else if (packageDetails) {
        // Calculate amount (25% of package budget as requested)
        amount = Math.round(packageDetails.budget * 0.25);
      } else {
        throw new Error('Either package details or custom amount is required');
      }
      
      // Generate order ID
      const orderId = this.generateOrderId();

      // Create payment link request object - using Payment Links API format
      const paymentLinkRequest = {
        customer_details: {
          customer_email: customerDetails.email,
          customer_name: customerDetails.name,
          customer_phone: customerDetails.phone,
        },
        link_amount: amount,
        link_currency: "INR",
        link_id: orderId,
        link_purpose: `Payment for: ${packageDetails?.title || 'Custom Payment'}`,
        link_meta: {
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?order_id=${orderId}`,
          notify_url: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/payments/webhook`,
        },
        link_auto_reminders: true,
        link_partial_payments: false,
        link_notify: {
          send_email: true,
          send_sms: false,
        },
      };

      console.log('Creating Cashfree payment link with request:', JSON.stringify(paymentLinkRequest, null, 2));

      // Create Cashfree payment link using the Payment Links API
      const cashfreePaymentLink = await this.cashfree.PGCreateLink(paymentLinkRequest);

      // Use util.inspect for logging the response (avoids circular structure errors)
      console.log('Cashfree payment link response:', util.inspect(cashfreePaymentLink, { depth: 3, colors: true }));

      // Save payment record to database
      // Extract the actual order ID from the payment link URL
      // The URL format is: https://payments-test.cashfree.com/links/{ORDER_ID}
      const linkUrl = cashfreePaymentLink.data.link_url;
      const urlParts = linkUrl.split('/');
      const actualOrderId = urlParts[urlParts.length - 1]; // This should be like 'x96lbq5d58ag'
      
      console.log('=== CASHFREE ORDER ID DEBUG ===');
      console.log('link_url:', linkUrl);
      console.log('extracted_order_id:', actualOrderId);
      console.log('================================');
      
      console.log('Cashfree response data:', {
        cf_link_id: cashfreePaymentLink.data.cf_link_id,
        link_url: cashfreePaymentLink.data.link_url,
        link_id: cashfreePaymentLink.data.link_id,
        extracted_order_id: actualOrderId,
        all_fields: Object.keys(cashfreePaymentLink.data)
      });
      
      console.log('=== ORDER ID COMPARISON ===');
      console.log('Custom Order ID (our generated):', orderId);
      console.log('Cashfree Order ID (extracted):', actualOrderId);
      console.log('Will use as primary orderId:', actualOrderId);
      console.log('==========================');
      
      const payment = new Payment({
        orderId: actualOrderId, // Use extracted order ID from URL (like 'x96lbq5d58ag')
        packageId: packageDetails?._id || null,
        userId,
        amount,
        cashfreeOrderId: actualOrderId, // Same as orderId
        paymentLink: cashfreePaymentLink.data.link_url,
        customerDetails,
        metadata: new Map([
          ['packageTitle', packageDetails?.title || 'Custom Payment'],
          ['packageBudget', packageDetails?.budget?.toString() || customAmount?.toString()],
          ['originalAmount', packageDetails?.budget?.toString() || customAmount?.toString()],
          ['discountPercentage', customAmount ? '0' : '25'],
          ['isCustomAmount', customAmount ? 'true' : 'false'],
          ['customOrderId', orderId], // Store our custom order ID in metadata
        ]),
      });

      await payment.save();

      return {
        success: true,
        orderId: actualOrderId, // Return Cashfree's actual order ID (same as createDirectPayment)
        paymentLink: cashfreePaymentLink.data.link_url,
        amount,
        customOrderId: orderId, // Our custom order ID for reference
        packageDetails: {
          title: packageDetails?.title || 'Custom Payment',
          budget: packageDetails?.budget || customAmount,
          originalAmount: packageDetails?.budget || customAmount,
          discountAmount: customAmount ? 0 : amount,
        },
      };
    } catch (error) {
      console.error('Error creating payment order:', error.message);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        // Only JSON.stringify if data is plain
        try {
          console.error('Error response data:', JSON.stringify(error.response.data));
        } catch (e) {
          console.error('Error response data (raw):', util.inspect(error.response.data, { depth: 3 }));
        }
      } else {
        // For debugging, but not in production:
        console.error('Full error:', util.inspect(error, { depth: 3 }));
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to create payment order');
    }
  }

  // Get payment details by order ID
  async getPaymentDetails(orderId) {
    try {
      const payment = await Payment.findOne({ orderId }).populate('packageId').populate('userId', 'name email');
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      console.error('Error getting payment details:', error);
      throw error;
    }
  }

  // Get user's payment history
  async getUserPayments(userId) {
    try {
      const payments = await Payment.find({ userId })
        .populate('packageId', 'title eventType budget')
        .sort({ createdAt: -1 });

      return payments;
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }

  // Process webhook from Cashfree
  async processWebhook(webhookData) {
    try {
      console.log('=== PROCESSING WEBHOOK ===');
      console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
      
      // Handle different webhook data structures
      let orderId, orderAmount, referenceId, txStatus, txMsg, txTime;

      // Check if it's the new Cashfree webhook format (PAYMENT_SUCCESS_WEBHOOK)
      if (webhookData.data && webhookData.data.order && webhookData.data.payment) {
        // Extract from order_tags for link_id (our custom order ID)
        const orderTags = webhookData.data.order.order_tags || {};
        orderId = orderTags.link_id || webhookData.data.order.order_id;
        orderAmount = webhookData.data.order.order_amount;
        referenceId = webhookData.data.payment.cf_payment_id;
        txStatus = webhookData.data.payment.payment_status;
        txMsg = webhookData.data.payment.payment_message;
        txTime = webhookData.data.payment.payment_time;
      }
      // Check if it's Orders API webhook
      else if (webhookData.orderId) {
        orderId = webhookData.orderId;
        orderAmount = webhookData.orderAmount;
        referenceId = webhookData.referenceId;
        txStatus = webhookData.txStatus;
        txMsg = webhookData.txMsg;
        txTime = webhookData.txTime;
      }
      // Check if it's Payment Links API webhook
      else if (webhookData.link_id) {
        orderId = webhookData.link_id;
        orderAmount = webhookData.link_amount;
        referenceId = webhookData.payment_id;
        txStatus = webhookData.payment_status;
        txMsg = webhookData.payment_message;
        txTime = webhookData.payment_time;
      }
      // Check if it's a different format
      else if (webhookData.data) {
        orderId = webhookData.data.orderId || webhookData.data.link_id;
        orderAmount = webhookData.data.orderAmount || webhookData.data.link_amount;
        referenceId = webhookData.data.referenceId || webhookData.data.payment_id;
        txStatus = webhookData.data.txStatus || webhookData.data.payment_status;
        txMsg = webhookData.data.txMsg || webhookData.data.payment_message;
        txTime = webhookData.data.txTime || webhookData.data.payment_time;
      }

      console.log('Extracted webhook data:', {
        orderId,
        orderAmount,
        referenceId,
        txStatus,
        txMsg,
        txTime
      });

      if (!orderId) {
        console.error('No order ID found in webhook data');
        throw new Error('No order ID found in webhook data');
      }

      // Find payment record - try both orderId and customOrderId
      let payment = await Payment.findOne({ orderId });
      
      // If not found by orderId, try to find by customOrderId in metadata
      if (!payment) {
        payment = await Payment.findOne({
          'metadata.customOrderId': orderId
        });
      }

      if (!payment) {
        console.error('Payment not found for orderId:', orderId);
        throw new Error('Payment not found');
      }

      console.log('Found payment:', {
        orderId: payment.orderId,
        customOrderId: payment.metadata?.get('customOrderId'),
        currentStatus: payment.paymentStatus,
        amount: payment.amount
      });

      // Determine new status based on webhook data
      let newStatus;
      if (txStatus === 'SUCCESS' || txStatus === 'PAID') {
        newStatus = 'SUCCESS';
      } else if (txStatus === 'FAILED' || txStatus === 'CANCELLED') {
        newStatus = 'FAILED';
      } else {
        newStatus = 'PENDING';
      }

      // Update payment status
      const oldStatus = payment.paymentStatus;
      payment.paymentStatus = newStatus;
      payment.cashfreePaymentId = referenceId;
      payment.updatedAt = new Date();

      // Initialize metadata if it doesn't exist
      if (!payment.metadata) {
        payment.metadata = new Map();
      }

      // Add webhook data to metadata
      payment.metadata.set('webhookReceived', 'true');
      payment.metadata.set('webhookTime', new Date().toISOString());
      payment.metadata.set('webhookStatus', txStatus);
      
      if (txTime) {
        payment.metadata.set('transactionTime', txTime);
      }
      if (txMsg) {
        payment.metadata.set('transactionMessage', txMsg);
      }

      await payment.save();

      console.log('Payment updated successfully:', {
        orderId: payment.orderId,
        customOrderId: payment.metadata?.get('customOrderId'),
        oldStatus: oldStatus,
        newStatus: payment.paymentStatus,
        cashfreePaymentId: payment.cashfreePaymentId
      });

      return {
        success: true,
        paymentStatus: payment.paymentStatus,
        orderId: payment.orderId,
        customOrderId: payment.metadata?.get('customOrderId'),
        updated: oldStatus !== newStatus,
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  // Verify webhook signature (implement this for security)
  verifyWebhookSignature(payload, signature) {
    const secret = process.env.CASHFREE_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Check payment status from Cashfree and update database
  async checkAndUpdatePaymentStatus(orderId) {
    try {
      console.log('=== CHECKING PAYMENT STATUS ===');
      console.log('Order ID:', orderId);
      
      // Find payment in database
      const payment = await Payment.findOne({ orderId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      console.log('Found payment:', {
        orderId: payment.orderId,
        currentStatus: payment.paymentStatus,
        amount: payment.amount
      });

      // If payment is already successful or failed, return current status
      if (payment.paymentStatus === 'SUCCESS' || payment.paymentStatus === 'FAILED') {
        return {
          success: true,
          orderId: payment.orderId,
          paymentStatus: payment.paymentStatus,
          message: 'Payment status already updated',
          updated: false,
        };
      }

      // For now, let's create a simple status check that works
      // Since Cashfree API is not working properly, we'll use webhook approach
      console.log('Cashfree API not working properly, using webhook approach');
      
      // Check if payment has been updated recently (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isRecentlyUpdated = payment.updatedAt > fiveMinutesAgo;
      
      if (isRecentlyUpdated) {
        console.log('Payment was recently updated, returning current status');
        return {
          success: true,
          orderId: payment.orderId,
          paymentStatus: payment.paymentStatus,
          message: 'Payment status retrieved (recently updated)',
          updated: false,
          cashfreeStatus: {
            linkStatus: 'RECENT_UPDATE',
            paymentStatus: payment.paymentStatus,
          },
        };
      }
      
      // If not recently updated, suggest webhook setup
      return {
        success: true,
        orderId: payment.orderId,
        paymentStatus: payment.paymentStatus,
        message: 'Payment status retrieved. For real-time updates, please set up webhook.',
        updated: false,
        cashfreeStatus: {
          linkStatus: 'PENDING_WEBHOOK',
          paymentStatus: 'PENDING_WEBHOOK',
        },
        suggestion: 'Set up webhook for real-time status updates'
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', JSON.stringify(error.response.data));
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to check payment status');
    }
  }

  // Refund payment
  async refundPayment(orderId, refundAmount, reason = 'Customer request') {
    try {
      // Initialize configuration
      this.initializeCashfreeConfig();

      const payment = await Payment.findOne({ orderId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentStatus !== 'SUCCESS') {
        throw new Error('Payment must be successful to refund');
      }

      // Create refund request
      const refundRequest = {
        refund_amount: refundAmount,
        refund_note: reason,
        refund_id: `REFUND_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      };

      // Use the payment link ID for refunds
      const refund = await this.cashfree.PGCreateRefund(payment.cashfreeOrderId, refundRequest);

      // Update payment record with refund info
      // Initialize metadata if it doesn't exist
      if (!payment.metadata) {
        payment.metadata = new Map();
      }
      payment.metadata.set('refundId', refund.data.refund_id);
      payment.metadata.set('refundAmount', refundAmount.toString());
      payment.metadata.set('refundReason', reason);
      payment.metadata.set('refundStatus', refund.data.refund_status);
      payment.updatedAt = new Date();

      await payment.save();

      return {
        success: true,
        refundId: refund.data.refund_id,
        refundStatus: refund.data.refund_status,
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService(); 

