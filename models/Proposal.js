const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'eventModel', // Dynamic reference
    required: true
  },
  eventModel: {
    type: String,
    required: true,
    enum: ['Event', 'PrivateEvent'],
    default: 'Event' // Default to Event for existing behavior
  },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, enum: ['USD', 'EUR', 'INR', 'GBP'], default: 'INR' },
  proposedBudget: { type: Number, required: true },
  proposalDescription: { type: String, required: true },
  // Services Breakdown: array of line items
  servicesBreakdown: [
    {
      service: { type: String, trim: true, required: true },
      desc: { type: String, trim: true, default: '' },
      qty: { type: Number, min: 1, default: 1, required: true },
      unitPrice: { type: Number, min: 0, default: 0, required: true },
    },
  ],
  // Additional notes replacing previous servicesIncluded free-text
  additionalNotes: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);
