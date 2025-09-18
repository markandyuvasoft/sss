// controllers/customerProfileController.js
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const User       = require("../models/User");
const Portfolio  = require("../models/Portfolio");
const { Upload }       = require("@aws-sdk/lib-storage");
const s3 = require("../config/aws.js"); // Import the S3 client
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

// ─── Helper to upload to S3 ─────────────────────────────────────────────
async function uploadBufferToS3(buffer, mimetype, originalName, userId) {
  const timestamp = Date.now();
  const safeName  = originalName.replace(/\s+/g, "_");
  const key       = `customers/${userId}/${timestamp}_${safeName}`;
  const upload    = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    },
  });
  await upload.done();
  return { public_id: key, url: `https://${process.env.CLOUDFRONT_DOMAIN}/${key}` };
}

// ─── @desc Get customer profile ──────────────────────────────────────────
const getCustomerProfile = asyncHandler(async (req, res) => {
  // 1) Load user
  const user = await User.findById(req.user.id).select("fullName email");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // 2) Load (or empty) portfolio
  let portfolio = await Portfolio.findOne({ user: req.user.id });
  if (!portfolio) {
    portfolio = {
      contact: { email: "", phone: "" },
      profilePicture: { url: null }
    };
  }

  res.json({
    fullName: user.fullName,
    email:    user.email,
    phone:    portfolio.contact.phone,
    profilePicture: portfolio.profilePicture.url,
  });
});

// ─── @desc Update customer profile ───────────────────────────────────────
const updateCustomerProfile = asyncHandler(async (req, res) => {
  const { fullName, email, phone } = req.body;

  // 1) Update User
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (email && email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error("Email already in use");
    }
    user.email = email;
  }
  if (fullName) user.fullName = fullName;
  await user.save();

  // 2) Find or create Portfolio
  let portfolio = await Portfolio.findOne({ user: req.user.id });
  if (!portfolio) {
    portfolio = new Portfolio({ user: req.user.id });
  }

  // 3) Update contact info
  portfolio.contact.email = email || portfolio.contact.email;
  portfolio.contact.phone = phone || portfolio.contact.phone;

  // 4) Handle profile picture upload
  if (req.file) {
    // delete old
    if (portfolio.profilePicture?.public_id) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: portfolio.profilePicture.public_id,
      }));
    }
    // upload new
    const { public_id, url } = await uploadBufferToS3(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user.id
    );
    portfolio.profilePicture = { public_id, url };
  }

  // 5) Save portfolio
  await portfolio.save();

  res.json({
    success: true,
    message: "Profile updated",
    profile: {
      fullName: user.fullName,
      email:    user.email,
      phone:    portfolio.contact.phone,
      profilePicture: portfolio.profilePicture.url,
    },
  });
});

// ─── @desc Change customer password ─────────────────────────────────────
const changeCustomerPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    res.status(400);
    throw new Error("All password fields are required");
  }
  if (newPassword !== confirmPassword) {
    res.status(400);
    throw new Error("New & confirm password do not match");
  }

  const user = await User.findById(req.user.id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) {
    res.status(401);
    throw new Error("Old password is incorrect");
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password changed" });
});

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
};
