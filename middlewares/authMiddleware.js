// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = (allowedRoles = [], allowedPurposes = []) => {
  return async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      console.log("No token provided, allowing unauthenticated access");
      // Proceed without a token, but add the email to check against users
      req.user = { id: null }; // Set a null id for unauthenticated users
      return next(); // Allow to proceed without authentication
    }

    try {
      // Decode and verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

      // Fetch user details using decoded ID or decoded.userId if necessary
      const user = await User.findById(decoded.id || decoded.userId).select(
        "-password"
      ); // Exclude password

      if (!user) {
        console.error("User not found for ID:", decoded.id);
        return res.status(401).json({ message: "User not found" });
      }

      //Check for undefined user properties
      if (!user.role || !user.purpose) {
        console.error("Missing role or purpose in the user object");
        return res.status(401).json({ message: "Missing role or purpose" });
      }

      // Attach the full user object to req.user
      req.user = user;

      // Check if the user's purpose is allowed
      if (
        allowedPurposes.length &&
        !allowedPurposes.includes(req.user.purpose)
      ) {
        console.error(
          "Forbidden: User purpose is not allowed. User purpose:",
          req.user.purpose
        );
        return res
          .status(403)
          .json({ message: "Forbidden: You do not have access" });
      }

      // Check if the user's role is allowed (Optional)
      if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
        console.error(
          "Forbidden: User role is not allowed. User role:",
          req.user.role
        );
        return res
          .status(403)
          .json({ message: "Forbidden: You do not have access" });
      }

      next(); // Proceed to the next middleware or route
    } catch (err) {
      console.error("Authentication error:", err.message);
      res.status(401).json({ message: "Unauthorized" });
    }
  };
};

module.exports = protect;
