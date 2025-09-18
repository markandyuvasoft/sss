const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Portfolio = require("../models/Portfolio")

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: null, required: false },
  role: {
    type: String,
    enum: ['customer', 'event-agency', 'event-manager', 'volunteer', 'independent'],
    required: true
  },
  googleId: { type: String }, // For Google OAuth users
  purpose: {
    type: String,
    enum: ['host', 'planner'],
    required: true
  },
  experience: { type: String, default: "", required: false },
  portfolio: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', default: null },
  // Password reset fields
  resetPasswordToken: { type: String }, // Stores the reset token
  resetPasswordExpires: { type: Date }, // Expiry date of the reset token
  // Email verification fields
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next(); // Skip for Google users
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
