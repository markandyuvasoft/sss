// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload")
const {
  getPortfolio,
  updatePortfolio,
  getAllPortfolios,
  getPortfolioById,
  getAllVolunteerPortfolios,
} = require('../controllers/portfolioController');

// Route 1: Get the profile details of the logged-in user
router.get('/', protect(['event-manager', 'event-agency', 'volunteer', 'independent']), getPortfolio);

// Route 2: Update the entire portfolio details for the logged-in user
router.put('/', protect(['event-manager', 'event-agency', 'independent', 'volunteer']),
upload.fields([
  { name: "profilePicture", maxCount: 1 }, // Single profile picture
  { name: "portfolio", maxCount: 10 },
  { name: "certifications", maxCount: 5 }, // Multiple portfolio images/videos
]), updatePortfolio);

// Route 3: Get the profiles of all event managers and event agencies (universal route)
router.get('/all', getAllPortfolios);
router.get('/all/volunteer',protect(['event-manager', 'event-agency', 'independent', 'volunteer']), getAllVolunteerPortfolios);

// NEW: Get a portfolio by ID (for individual profile viewsadsdf)
router.get('/:id',  getPortfolioById);

module.exports = router;
