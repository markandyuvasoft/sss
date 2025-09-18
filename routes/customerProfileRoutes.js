// routes/customerProfileRoutes.js
const express = require("express");
const router = express.Router();
const {
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
} = require("../controllers/customerProfileController");
const protect = require("../middlewares/authMiddleware");
const multer = require("multer");

// memory storage for profile picture
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// all routes here require a logged‑in “customer”
router.use(protect("customer"));

router
  .route("/")
  .get(getCustomerProfile)
  .put(upload.single("profilePicture"), updateCustomerProfile);

router.route("/password").put(changeCustomerPassword);

module.exports = router;
