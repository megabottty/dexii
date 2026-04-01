const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, resendCode } = require('../controllers/authController');

// @route   POST /api/auth/register
router.post('/register', register);

// @route   POST /api/auth/login
router.post('/login', login);

// @route   POST /api/auth/verify-email
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/resend-code
router.post('/resend-code', resendCode);

module.exports = router;
