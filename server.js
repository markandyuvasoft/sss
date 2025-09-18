require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const bcrypt = require("bcrypt");
const crypto = require('crypto');

const passport = require("passport");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

// Connect to the database
connectDB();
const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Configure Helmet with CSP for verification page
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for verification page
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
})); // Security headers
app.use(morgan("dev")); // HTTP request logging

// Add global cache control middleware FIRST
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const allowedOrigins = [
  "https://gopratle.com",
  "https://www.gopratle.com",
  "gopratle.com",
  "https://dev.gopratle.com",
  "https://www.dev.gopratle.com",
  "dev.gopratle.com",
  "https://res.cloudinary.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://gopratle-sigma.vercel.app"
  // "https://localhost:3000",
  // "https://192.168.29.238:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps any or Postman test)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the specific origin
      } else {
        callback(new Error("Not allowed by CORS")); // Reject other origins
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true, // Allow cookies and credentials
    exposedHeaders: ["Authorization"],
  })
);


app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Log incoming requests
app.use((req, res, next) => {
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
});

// PBKDF2 configuration
const iterations = 100000;
const keyLength = 64;
const digest = 'sha512';

// Public endpoints that don't require API key validation
// Note: These paths are relative to /api since middleware is applied to /api routes
const publicEndpoints = [
  '/auth/verify-email',
  '/auth/verify-email-api',
  '/auth/register',
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/resend-verification',
  '/contactus'
];

//Middleware for API key validation using PBKDF2
const apiKeyValidation = (req, res, next) => {
  // Check if the current path is a public endpoint
  if (publicEndpoints.includes(req.path)) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: You are not authorized for this action.' });
  }
  try {
    // Expecting process.env.API_SECRET_ACCESS_KEY to be in "salt:hash" format.
    const stored = process.env.API_SECRET_ACCESS_KEY;
    if (!stored) {
      throw new Error('Stored API key hash not found in environment variables');
    }
    const [storedSalt, storedHash] = stored.split(':');
    crypto.pbkdf2(apiKey, storedSalt, iterations, keyLength, digest, (err, derivedKey) => {
      if (err) {
        console.error('Error during API key validation:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      const isMatch = storedHash === derivedKey.toString('hex');
      // console.log(`Provided API key: ${apiKey}`);
      // console.log(`Derived hash: ${derivedKey.toString('hex')}`);
      if (!isMatch) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
      }
      next();
    });
  } catch (err) {
    console.error('API key validation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply API key validation middleware to all /api routes
// app.use("/api", apiKeyValidation);

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/portfolio", require("./routes/portfolioRoutes"));
app.use("/api/proposals", require("./routes/proposalRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/packages", require("./routes/packageRoutes"));
app.use("/api/events", require("./routes/eventRt"));
app.use("/api/private-events", require("./routes/privateEventRoute"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/contactus", require("./routes/contactusRoutes"));
app.use("/api/customer/profile", require("./routes/customerProfileRoutes"));
app.use('/api/albums',  require("./routes/albumRoutes")); // Album routes

// Welcome route (unprotected)
app.get("/", (req, res) => {
  res.send("Welcome to the server!");
});

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
// process.on("SIGINT", async () => {
//   console.log("Shutting down gracefully...");
//   try {
//     await mongoose.connection.close();
//     console.log("MongoDB connection closed.");
//     process.exit(0);
//   } catch (err) {
//     console.error("Error closing MongoDB connection:", err);
//     process.exit(1);
//   }
// });

