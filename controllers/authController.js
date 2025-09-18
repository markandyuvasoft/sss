const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const joi = require("joi");
const crypto = require("crypto");
const Portfolio = require("../models/Portfolio");
const tempelate = require("../templates/index");
const path = require("path");
const fs = require("fs");

const { sendNotification } = require("../services/notificationService");
const Notification = require("../models/Notification");

// Register Controller
// exports.registerUser = async (req, res) => {
//   try {
//     const { fullName, email, password, purpose } = req.body;

//     // Validate required fields
//     if (!fullName || !email || !password || !purpose) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Validate purpose
//     if (!["host", "planner"].includes(purpose)) {
//       return res.status(400).json({ message: "Invalid purpose" });
//     }

//     // Assign role based on purpose
//     const role = purpose === "host" ? "customer" : "event-manager";

//     // Check if user already exists
//     const existingUser = await User.findOne({ email: email.toLowerCase() });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email already in use" });
//     }

//     // Generate verification token
//     const verificationToken = crypto.randomBytes(32).toString("hex");
//     const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

//     // Create user
//     const user = new User({
//       fullName,
//       email: email.toLowerCase(),
//       password,
//       purpose,
//       role,
//       verificationToken,
//       verificationTokenExpires,
//     });
//     await user.save();

//     // Send verification email
//     const verificationLink = `http://localhost:${process.env.PORT}/api/auth/verify-email?token=${verificationToken}&email=${user.email}`;
//     console.log("Generated verification link:", verificationLink);
//     await sendNotification(
//       user.email, 
//       "Verify Your Email Address - Gopratle", 
//       "", // Empty message since we're using template
//       "email",
//       { isVerification: true, verificationLink }
//     );
//     console.log("Verification email sent successfully");

//     // Generate JWT
//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.status(201).json({
//       // message: "User registered successfully",
//       message: "Account created successfully. Please check your email to verify your account and get started!",
//       user: {
//         fullName: user.fullName,
//         email: user.email,
//         purpose: user.purpose,
//         role: user.role,
//       },
//       token,
//     });
//   } catch (err) {
//     console.error("Registration Error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, password, purpose, role } = req.body;

    // Validate base required fields
    if (!fullName || !email || !password || !purpose) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate purpose
    if (!["host", "planner"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid purpose" });
    }

    // Handle role assignment
    let finalRole;
    if (purpose === "host") {
      finalRole = "customer";
    } else if (purpose === "planner") {
      // For event planners, the frontend must provide a role
      const allowedPlannerRoles = ["event-manager", "event-agency", "volunteer", "independent"];
      if (!role || !allowedPlannerRoles.includes(role)) {
        return res.status(400).json({
          message: "Please select a valid planner type: event-manager, event-agency, volunteer, or independent."
        });
      }
      finalRole = role; // Use the planner-specific role
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user (note: additional info for planners can be added in a later step/profile update)
    const user = new User({
      fullName,
      email: email.toLowerCase(),
      password,
      purpose,
      role: finalRole,
      verificationToken,
      verificationTokenExpires,
    });
    await user.save();

    // Determine base URL (from env or fallback)
    const baseUrl = process.env.BASE_URL;

    // Protect against bad config in production
    // if (baseUrl.includes("localhost") && process.env.NODE_ENV === "production") {
    //   console.error("Invalid BASE_URL for production. Please set BASE_URL to your live domain.");
    //   return res.status(500).json({ message: "Server misconfiguration: invalid BASE_URL" });
    // }

    // Create verification link
    const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    console.log("Generated verification link:", verificationLink);

    // Send verification email
    await sendNotification(
      user.email,
      "Verify Your Email Address - Gopratle",
      "", // Empty message, assuming email template handles content
      "email",
      { isVerification: true, verificationLink }
    );
    console.log("Verification email sent successfully");

    // Send verification email
    // const verificationLink = `http://localhost:${process.env.PORT}/api/auth/verify-email?token=${verificationToken}&email=${user.email}`;
    // console.log("Generated verification link:", verificationLink);

    // await sendNotification(
    //   user.email, 
    //   "Verify Your Email Address - Gopratle", 
    //   "", // Empty message if using templates
    //   "email",
    //   { isVerification: true, verificationLink }
    // );
    // console.log("Verification email sent successfully");

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Account created successfully. Please check your email to verify your account and get started!",
      user: {
        fullName: user.fullName,
        email: user.email,
        purpose: user.purpose,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// Verify Email Controller - Always serves HTML page
exports.verifyEmail = async (req, res) => {
  // Always serve the HTML verification page
  // The JavaScript in the page will handle the verification logic
  try {
    const htmlPath = path.join(__dirname, '../views/verify-email.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (err) {
    console.error("Error serving verification page:", err);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Error</h1>
          <p>Unable to load verification page. Please try again later.</p>
        </body>
      </html>
    `);
  }
};

// API endpoint for verification logic (called by JavaScript)
exports.verifyEmailAPI = async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing token or email" 
    });
  }

  try {
    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired verification link" 
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    const notification = new Notification({
      recipient: user._id,
      message: `Email verified successfully! Welcome to GoPratle`,
      type: 'email',
      status: 'sent'
    });
    await notification.save();

    return res.status(200).json({ 
      success: true, 
      message: "Email verified successfully" 
    });
  } catch (err) {
    console.error("Email verification error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};

// Resend verification email controller
exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  console.log("Resending verification email to:", email);

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send verification email
    // const verificationLink = `http://localhost:${process.env.PORT}/api/auth/verify-email?token=${verificationToken}&email=${user.email}`;
    const verificationLink = `https://gopratle.com/api/auth/verify-email?token=${verificationToken}&email=${user.email}`;
    console.log("Generated verification link:", verificationLink);
    await sendNotification(
      user.email, 
      "Verify Your Email Address - Gopratle", 
      "", // Empty message since we're using template
      "email",
      { isVerification: true, verificationLink }
    );

    res.status(200).json({
      message: "Verification email sent successfully. Please check your inbox."
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Login Controller 
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Normalize email to lowercase
    const user = await User.findOne({ email: email.toLowerCase() }).populate(
      "portfolio",
      "profilePicture"
    );

    if (!user) {
      console.log("User not found or not registered Kindly Sign Up:", email);
      return res
        .status(404)
        .json({ message: "User not found or not registered Kindly Sign Up" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Your email is not verified. Please verify your account before logging in.",
      });
    }

    // Compare entered password with stored hashed password
    console.log("User found:", {
      email: user.email,
      storedPassword: user.password,
    });
    console.log("Login attempt with password:", password);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Ensure role and purpose are available
    if (!user.role || !user.purpose) {
      return res
        .status(400)
        .json({ message: "User role or purpose is missing" });
    }

    // Extract profile picture URL safely
    const profilePicture = user.portfolio?.profilePicture?.url || null;

    //Generate Token
    const token = jwt.sign(
      { id: user._id, purpose: user.purpose, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      message: "Login successful",
      token,
      user: {
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
        role: user.role,
        purpose: user.purpose,
        userId: user._id, // This should not be undefined
        profilePicture, // Ensure it handles cases where it's not set
      },
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("🔍 forgotPassword requested for email:", email);

  if (!email) {
    console.error("❌ No email provided");
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token and set expiration
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Token valid for 1 hour
    await user.save();

    // Construct reset link
    const resetLink = `${process.env.CLIENT_URL}/#/reset-password/${resetToken}`;
    console.log("Generated reset link:", resetLink);

    // 3) Send the email
    const message = tempelate.forgetPassword(user.fullName, resetLink);
    await sendNotification(user.email, "Reset your password", message);

    // Step 5: Respond to the user
    res
      .status(200)
      .json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // Hash the token and find user
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "This reset password link has been expired" });
    }
    console.log("👤 Found user:", user._id);

    // 3) Update password (bcrypt hash in pre‑save hook will run)
    user.password = newPassword;
    await user.save();
    console.log("🔄 Password successfully reset for user:", user._id);

    res
      .status(200)
      .json({
        message:
          "Password reset successful. You can now log in with your new password.",
      });
  } catch (error) {
    console.error("Error in reset password:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

