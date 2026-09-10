const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { register, login, verifyPin, verifyEmail, resendCode, getProfile, requestPasswordReset, resetPassword, setPassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Optional auth middleware for verify-pin
const optionalAuth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore invalid token and continue
    }
  }
  next();
};

// @route   POST /api/auth/register
router.post('/register', register);

// @route   POST /api/auth/login
router.post('/login', login);
router.post('/verify-pin', optionalAuth, verifyPin);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/set-password', auth, setPassword);

// @route   POST /api/auth/verify-email
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/resend-code
router.post('/resend-code', resendCode);

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', auth, getProfile);

module.exports = router;
