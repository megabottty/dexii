const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, resendCode, getProfile } = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
router.post('/register', register);

// @route   POST /api/auth/login
router.post('/login', login);

// @route   POST /api/auth/verify-email
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/resend-code
router.post('/resend-code', resendCode);

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', auth, getProfile);

module.exports = router;
