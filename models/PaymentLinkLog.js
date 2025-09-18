const mongoose = require('mongoose');

const paymentLinkLogSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestPayload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  requestHeaders: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  requestMethod: {
    type: String,
    required: true,
    default: 'POST',
  },
  requestUrl: {
    type: String,
    required: true,
  },
  responseStatus: {
    type: Number,
    required: true,
  },
  responseData: {
    type: mongoose.Schema.Types.Mixed,
  },
  errorMessage: {
    type: String,
  },
  processingTime: {
    type: Number, // in milliseconds
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'ERROR'],
    default: 'SUCCESS',
  },
  metadata: {
    type: Map,
    of: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate unique request ID before saving
paymentLinkLogSchema.pre('save', function(next) {
  if (!this.requestId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    this.requestId = `REQ_${timestamp}_${random}`.toUpperCase();
  }
  next();
});

// Generate unique request ID before validation
paymentLinkLogSchema.pre('validate', function(next) {
  if (!this.requestId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    this.requestId = `REQ_${timestamp}_${random}`.toUpperCase();
  }
  next();
});

// Index for better query performance
paymentLinkLogSchema.index({ requestId: 1 });
paymentLinkLogSchema.index({ userId: 1 });
paymentLinkLogSchema.index({ status: 1 });
paymentLinkLogSchema.index({ createdAt: 1 });
paymentLinkLogSchema.index({ responseStatus: 1 });

const PaymentLinkLog = mongoose.model('PaymentLinkLog', paymentLinkLogSchema);

module.exports = PaymentLinkLog; 