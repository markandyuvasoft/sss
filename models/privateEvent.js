const mongoose = require('mongoose');

const privateEventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: ['Wedding', 'Birthday', 'Corporate', 'Other']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  guests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'Must have at least 1 guest'],
    max: [1000, 'Cannot exceed 1000 guests']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date
  },
  budget: {
    amount: {
      type: Number,
      required: [true, 'Budget amount is required']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: ['USD', 'EUR', 'GBP', 'INR', 'AED', 'Other']
    }
  },
  requirements: [{
    type: String,
    enum: [
      'Photo & Videography',
      'Music',
      'Food & Beverages',
      'Light & Sound',
      'Hospitality',
      'Decoration',
      'Stage',
      'Entertainment',
      'Artist'
    ]
  }],
  additionalInfo: {
    type: String,
    trim: true
  },
  contact: {
    fullName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    organization: {
      type: String,
      trim: true
    }
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned manager is required']
  },
  isProposalSent: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validate end date
privateEventSchema.pre('save', function(next) {
  if (this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Indexes for performance
privateEventSchema.index({ customer: 1 });
privateEventSchema.index({ assignedManager: 1 });

module.exports = mongoose.model('PrivateEvent', privateEventSchema);