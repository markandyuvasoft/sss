const express = require('express');
const { registerUser, login } = require('../controllers/authController');
const passport = require('passport')
const { forgotPassword, resetPassword } = require('../controllers/authController');
const { verifyEmail, verifyEmailAPI } = require('../controllers/authController');
const { resendVerificationEmail } = require('../controllers/authController');
const router = express.Router();

const User = require('../models/User');

router.post('/register', registerUser);
router.get('/verify-email', verifyEmail); // Always serves HTML page
router.get('/verify-email-api', verifyEmailAPI); // API endpoint for verification logic
router.post('/resend-verification', resendVerificationEmail);
router.post('/login', login);

// Route to initiate Google OAuth
// router.get(
//   '/google',
//   passport.authenticate('google', {
//     scope: ['profile', 'email'],
//   })
// );

router.post('/google', async (req, res) => {
  const { sub: auth0Id, name, email, picture } = req.body;

  if (!email || !auth0Id) {
    return res.status(400).json({ error: 'Invalid user data' });
  }

  try {
    let user = await User.findOne({ auth0Id });

    if (!user) {
      user = await User.create({ auth0Id, name, email, picture });
      console.log('User created:', user);
    } else {
      console.log('User exists:', user);
    }

    res.status(200).json({ message: 'User authenticated', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Callback route for Google OAuth
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard'); // Redirect to a dashboard or desired page after successful login
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Request password reset
router.post('/forgot-password', forgotPassword);

// Reset password
router.put('/reset-password/:token', resetPassword);

module.exports = router;
