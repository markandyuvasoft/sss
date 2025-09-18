const mongoose = require("mongoose")

const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: [
      'Wedding',
      'Corporate Event',
      'Community Event',
      'Private Event',
      'Holidays',
      'Theme Party',
      'Birthdays & Anniversaries',
      'Cultural Events',
      'Religious Events',
      'School Events',
      'Sporting Events',
      'Others'
    ]
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
    type: Date,
    required: [false, 'End date is not required']
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
    // phone: {
    //   type: String,
    //   required: [true, 'Phone number is required'],
    //   trim: true
    // },
    organization: {
      type: String,
      trim: true
    }
  },
  isProposalSent: { type: Boolean, default: false },
  // Add 
  purpose: { type: String, default: 'plan' },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  // Add customer field to associate the event with a customer
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  isPrivate: { type: Boolean, default: false }, // New: Flag for private events
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },


  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add validation for end date to ensure it's after start date
eventSchema.pre('save', function (next) {
  if (this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});


// Indexing for performance
eventSchema.index({ customer: 1 });


module.exports = mongoose.model('Event', eventSchema);
