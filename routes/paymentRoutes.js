const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const protect = require('../middlewares/authMiddleware');

// Create payment link for a package (25% of package budget)
// POST /api/payments/create-link
router.post('/create-link', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.createPaymentLink);

// Create direct payment order (without service layer)
// POST /api/payments/create-direct
router.post('/create-direct', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.createDirectPayment);

// Get payment details by order ID
// GET /api/payments/:orderId
router.get('/:orderId', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.getPaymentDetails);

// Get payment status by order ID
// GET /api/payments/status/:orderId
router.get('/status/:orderId', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.getPaymentStatus);

// Check payment status from Cashfree and update database
// GET /api/payments/check/:orderId
router.get('/check/:orderId', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.checkAndUpdatePaymentStatus);

// Manually update payment status (for testing)
// PUT /api/payments/status/:orderId
router.put('/status/:orderId', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.updatePaymentStatus);

// Check payment status from Cashfree and update database
// GET /api/payments/:orderId/check-status
router.get('/:orderId/check-status', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.checkPaymentStatus);

// Get user's payment history
// GET /api/payments/user/history
router.get('/user/history', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.getUserPayments);

// Test webhook endpoint (for Cashfree testing)
// GET /api/payments/webhook-test
router.get('/webhook-test', paymentController.testWebhook);

// Test webhook processing with sample data
// GET /api/payments/test-webhook-processing
router.get('/test-webhook-processing', paymentController.testWebhookProcessing);


// Process webhook from Cashfree (no authentication required)
// POST /api/payments/webhook
router.post('/webhook', paymentController.processWebhook);

// Refund payment
// POST /api/payments/:orderId/refund
router.post('/:orderId/refund', protect(['customer', 'event-manager', 'event-agency', 'independent']), paymentController.refundPayment);

// Get payment statistics (admin only)
// GET /api/payments/stats
router.get('/stats', protect(['admin']), paymentController.getPaymentStats);

// Get payment link logs (admin only)
// GET /api/payments/logs
router.get('/logs', protect(['admin']), paymentController.getPaymentLinkLogs);

// Update payment status (manual override)
router.post('/update-status', paymentController.updatePaymentStatus);

// Get all payments for a given userId, including invoice link
router.post('/by-userid', paymentController.getPaymentsByUserId);

module.exports = router; 