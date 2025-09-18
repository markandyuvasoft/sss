const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, default: "" },
    location: { type: String, default: "" },
    profilePicture: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },
    about: { type: String, default: "" },
    additionalDetails: { type: String, default: "" },
    languages: { type: [String], default: [] },
    services: { type: [String], default: [] },
    expertise: { type: [String], default: [] },
    portfolio: [
      {
        title: { type: String, trim: true, maxlength: 100 },
        type: { type: String, required: true },
        url: { type: String, required: true },
        fileType: { type: String, enum: ["image", "video"], default: "image" },
        public_id: { type: String, required: true },
        actionUrl: {
          type: String,
          validate: {
            validator: function (v) {
              return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
            },
            message: "Invalid URL format!",
          },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    certifications: [
      {
        title: { type: String, trim: true, maxlength: 100 },
        type: { type: String, required: true },
        url: { type: String, required: true },
        fileType: { type: String, enum: ["image", "video"], default: "image" },
        public_id: { type: String, required: true },
        actionUrl: {
          type: String,
          validate: {
            validator: function (v) {
              return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
            },
            message: "Invalid URL format!",
          },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    contact: {
      email: { type: String },
      phone: { type: String },
      since: { type: String },
      website: { type: String, default: "" },
    },
    
  },
  { timestamps: true }
);

portfolioSchema.index({ user: 1 });

module.exports = mongoose.model("Portfolio", portfolioSchema);