// models/Album.js
const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  planner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  eventDate: { type: Date, required: true },
  location: { type: String, default: '' },
  thumbnail: {
    // one item from the portfolio.portfolio array
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    required: false
  }],
}, { timestamps: true });

module.exports = mongoose.model('Album', albumSchema);
