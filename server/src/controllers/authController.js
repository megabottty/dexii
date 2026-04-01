const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { ensureUser, readStore } = require('../utils/demoFriendStore');

// Generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Register a new user / Set initial PIN
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, pin, email, bio } = req.body;

    // Support demo mode if database is not connected
    if (mongoose.connection.readyState !== 1) {
      console.warn(`Database not ready. Registering ${username} in demo mode.`);
      const state = await readStore();
      const existing = state.users.find(u => u.username === username);
      if (existing) {
        return res.status(400).json({ message: 'Username already taken in demo mode' });
      }

      // In demo mode, we don't strictly hash/save pins in the JSON store for this simple implementation,
      // but we'll allow the user to proceed as a "demo user".
      const user = ensureUser(state, username);
      user.bio = bio;
      // Note: demoFriendStore.ensureUser already pushes to state.users
      const fs = require('fs/promises');
      const path = require('path');
      await fs.writeFile(path.join(__dirname, '..', '..', 'data', 'demo-friends.json'), JSON.stringify(state, null, 2), 'utf8');

      return res.status(201).json({
        message: 'Registration successful (Demo Mode).',
        username: user.username,
        email: email,
        isDemo: true
      });
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) {
      return res.status(400).json({ message: 'Username or Email already taken' });
    }

    // Hash PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const verificationCode = generateCode();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user = new User({
      username,
      pin: hashedPin,
      email,
      bio: typeof bio === 'string' ? bio.trim().slice(0, 500) : '',
      verificationCode,
      verificationCodeExpires,
      isEmailVerified: false
    });

    await user.save();

    // Send Verification Email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Dexii Verification Code',
        message: `Your verification code is: ${verificationCode}. It expires in 10 minutes.`,
        html: `<h1>Welcome to Dexii</h1><p>Your verification code is: <strong>${verificationCode}</strong></p><p>It expires in 10 minutes.</p>`
      });
    } catch (err) {
      console.error('Email error:', err);
      // We still registered them, but they'll need to resend
    }

    res.status(201).json({
      message: 'Registration successful. Verification code sent to email.',
      username: user.username,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Verify email code
// @route   POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
  try {
    const { username, code } = req.body;

    // Support demo mode
    if (mongoose.connection.readyState !== 1) {
      console.warn(`Database not ready. Verifying ${username} in demo mode.`);
      const state = await readStore();
      const user = state.users.find(u => u.username === username);

      if (!user) {
        return res.status(400).json({ message: 'User not found in demo mode' });
      }

      // In demo mode, we just auto-verify
      const token = jwt.sign({ id: user.username, isDemo: true }, process.env.JWT_SECRET, {
        expiresIn: '30d'
      });

      return res.json({
        token,
        isDemo: true,
        user: {
          id: user.username,
          username: user.username,
          bio: user.bio || '',
          subscriptionTier: user.subscriptionTier || 'Free'
        }
      });
    }

    const user = await User.findOne({
      username,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Create Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        bio: user.bio,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-code
exports.resendCode = async (req, res) => {
  try {
    const { username } = req.body;

    // Support demo mode
    if (mongoose.connection.readyState !== 1) {
      console.warn(`Database not ready. Resending code for ${username} in demo mode (skipped).`);
      return res.json({ message: 'Demo Mode: Verification skipped, you can just log in or use any code.' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verificationCode = generateCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'New Dexii Verification Code',
      message: `Your new verification code is: ${verificationCode}`,
      html: `<p>Your new verification code is: <strong>${verificationCode}</strong></p>`
    });

    res.json({ message: 'New code sent to email' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Authenticate user / Verify PIN
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, pin } = req.body;

    // Support demo mode if database is not connected
    if (mongoose.connection.readyState !== 1) {
       console.warn(`Database not ready. Logging in ${username} in demo mode.`);
       const state = await readStore();
       const user = state.users.find(u => u.username === username);

       if (!user) {
         return res.status(400).json({ message: 'User not found in demo mode' });
       }

       // In demo mode, we'll allow any PIN to facilitate testing when DB is down
       const token = jwt.sign({ id: user.username, isDemo: true }, process.env.JWT_SECRET, {
         expiresIn: '30d'
       });

       return res.json({
         token,
         isDemo: true,
         user: {
           id: user.username,
           username: user.username,
           bio: user.bio || '',
           subscriptionTier: user.subscriptionTier || 'Free'
         }
       });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
       return res.status(401).json({ message: 'Please verify your email first', needsVerification: true });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        bio: user.bio,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
