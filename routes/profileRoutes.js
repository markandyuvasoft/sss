const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount, 
  getUserById, 
  getUsersByPurpose,
  getAllUsers
} = require('../controllers/profileController');
const protect = require('../middlewares/authMiddleware');

const router = express.Router();

// Protected routes - require authentication
router.get('/me', protect(), getProfile);

// Update profile
router.put('/me', protect(), updateProfile);

// Update password
router.put('/change-password', protect(), changePassword);

// Delete account
router.delete('/me', protect(), deleteAccount);

// Admin routes - require authentication (you can add admin role check later)
router.get('/all-users', protect(), getAllUsers);

// Public routes - no authentication required
router.get('/user/:userId', getUserById);
router.get('/users/:purpose', getUsersByPurpose);

module.exports = router;