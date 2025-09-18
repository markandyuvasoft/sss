// routes/albumRoutes.js
const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware'); // Use your middleware
const {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumById,
  getAlbumsByUser,
  getAlbumsByPortfolio
} = require('../controllers/albumController');

// Create, Update, Delete as before...
router.post('/', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), createAlbum);
router.put('/:id', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), updateAlbum);
router.delete('/:id', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), deleteAlbum);

// Fetch single album
router.get('/:id', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), getAlbumById);

// Fetch all for a planner (by userId)
router.get('/user/:userId', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), getAlbumsByUser);

// Fetch all for a portfolio
router.get('/portfolio/:portfolioId', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), getAlbumsByPortfolio);

module.exports = router;
