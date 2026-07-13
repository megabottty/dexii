const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { ensureUser, readStore } = require('../utils/demoFriendStore');

// Generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const normalizePhoneE164 = (value) => {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (hasPlus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
};

// @desc    Register a new user / Set initial PIN
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, pin, email, bio, firstName, lastName, phoneNumber, phoneE164 } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhoneE164(phoneE164 || phoneNumber);
    const safeFirstName = typeof firstName === 'string' ? firstName.trim().slice(0, 80) : '';
    const safeLastName = typeof lastName === 'string' ? lastName.trim().slice(0, 80) : '';
    if ((phoneNumber || phoneE164) && !normalizedPhone) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

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
      user.email = normalizedEmail || '';
      user.firstName = safeFirstName;
      user.lastName = safeLastName;
      user.phoneE164 = normalizedPhone || '';

      const verificationCode = generateCode();
      user.verificationCode = verificationCode;

      // Send Verification Email even in Demo Mode
      let emailStatus = 'sent';
      try {
        const result = await sendEmail({
          email: normalizedEmail,
          subject: 'Dexii Verification Code (Demo Mode)',
          message: `Your verification code is: ${verificationCode}.`,
          html: `<h1>Welcome to Dexii (Demo Mode)</h1><p>Your verification code is: <strong>${verificationCode}</strong></p>`
        });
        if (result && result.debug) emailStatus = 'debug';
      } catch (err) {
        console.error('Demo email error:', err);
        emailStatus = 'failed';
      }

      console.warn(`--- DEMO MODE VERIFICATION CODE for ${username}: ${verificationCode} (Status: ${emailStatus}) ---`);

      // Note: demoFriendStore.ensureUser already pushes to state.users
      const fs = require('fs/promises');
      const path = require('path');
      await fs.writeFile(path.join(__dirname, '..', '..', 'data', 'demo-friends.json'), JSON.stringify(state, null, 2), 'utf8');

      return res.status(201).json({
        message: emailStatus === 'sent'
          ? 'Registration successful (Demo Mode). Verification code sent to email.'
          : emailStatus === 'debug'
          ? 'Registration successful (Demo Mode). (DEVELOPMENT: Check server console for code)'
          : 'Registration successful (Demo Mode), but email failed. Check your SMTP settings and server logs.',
        username: user.username,
        email: normalizedEmail,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneE164: user.phoneE164 || '',
        isDemo: true,
        emailSent: emailStatus === 'sent',
        debugMode: emailStatus === 'debug'
      });
    }

    // Check if user exists
    const duplicateChecks = [{ username }];
    if (normalizedEmail) duplicateChecks.push({ email: normalizedEmail });
    if (normalizedPhone) duplicateChecks.push({ phoneE164: normalizedPhone });

    let user = await User.findOne({ $or: duplicateChecks });
    if (user) {
      return res.status(400).json({ message: 'Username, email, or phone already taken' });
    }

    // Hash PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const verificationCode = generateCode();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user = new User({
      username,
      firstName: safeFirstName,
      lastName: safeLastName,
      pin: hashedPin,
      email: normalizedEmail || undefined,
      phoneE164: normalizedPhone || undefined,
      bio: typeof bio === 'string' ? bio.trim().slice(0, 500) : '',
      verificationCode,
      verificationCodeExpires,
      isEmailVerified: false
    });

    await user.save();

    // Send Verification Email
    let emailStatus = 'sent';
    try {
      const result = await sendEmail({
        email: user.email,
        subject: 'Dexii Verification Code',
        message: `Your verification code is: ${verificationCode}. It expires in 10 minutes.`,
        html: `<h1>Welcome to Dexii</h1><p>Your verification code is: <strong>${verificationCode}</strong></p><p>It expires in 10 minutes.</p>`
      });
      if (result && result.debug) emailStatus = 'debug';
    } catch (err) {
      console.error('Email error:', err);
      emailStatus = 'failed';
    }

    res.status(201).json({
      message: emailStatus === 'sent'
        ? 'Registration successful. Verification code sent to email.'
        : emailStatus === 'debug'
        ? 'Registration successful. (DEVELOPMENT: Check server console for code)'
        : 'Registration successful, but email failed. Check your SMTP settings and server logs.',
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneE164: user.phoneE164,
      emailSent: emailStatus === 'sent',
      debugMode: emailStatus === 'debug'
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

      // In demo mode, we previously auto-verified, but to simulate real behavior,
      // we'll require the code that was logged to the console during registration.
      // If the user is stuck, we'll allow '000000' as a backdoor for demo mode ONLY.
      if (code !== '000000' && code !== user.verificationCode) {
        return res.status(400).json({ message: 'Invalid demo verification code. Use 000000 or see server console.' });
      }

      const token = jwt.sign({ id: user.username, isDemo: true }, process.env.JWT_SECRET, {
        expiresIn: '30d'
      });

      return res.json({
        token,
        isDemo: true,
        user: {
          id: user.username,
          username: user.username,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phoneE164: user.phoneE164 || '',
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
        firstName: user.firstName,
        lastName: user.lastName,
        phoneE164: user.phoneE164,
        email: user.email,
        bio: user.bio,
        subscriptionTier: user.subscriptionTier,
        avatarUrl: user.avatarUrl
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
      console.warn(`Database not ready. Resending code for ${username} in demo mode.`);
      const state = await readStore();
      const user = state.users.find(u => u.username === username);

      if (!user) {
        return res.status(404).json({ message: 'User not found in demo mode' });
      }

      const verificationCode = generateCode();
      user.verificationCode = verificationCode;

      // Send Verification Email even in Demo Mode
      let emailStatus = 'sent';
      try {
        await sendEmail({
          email: user.email || 'no-email@example.com',
          subject: 'Dexii Verification Code (Demo Mode)',
          message: `Your NEW verification code is: ${verificationCode}.`,
          html: `<h1>Welcome back to Dexii (Demo Mode)</h1><p>Your NEW verification code is: <strong>${verificationCode}</strong></p>`
        });
      } catch (err) {
        console.error('Demo resend email error:', err);
        emailStatus = 'failed';
      }

      // Save to store
      const fs = require('fs/promises');
      const path = require('path');
      await fs.writeFile(path.join(__dirname, '..', '..', 'data', 'demo-friends.json'), JSON.stringify(state, null, 2), 'utf8');

      return res.json({
        message: emailStatus === 'sent'
          ? 'New verification code sent to email (Demo Mode).'
          : 'Failed to send code via email. Check server console for the code.'
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verificationCode = generateCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;

    if (mongoose.connection.readyState !== 1) {
       console.warn(`--- DEMO MODE NEW CODE for ${username}: ${verificationCode} ---`);
    }

    await user.save();

    let emailStatus = 'sent';
    try {
      const result = await sendEmail({
        email: user.email,
        subject: 'New Dexii Verification Code',
        message: `Your new verification code is: ${verificationCode}`,
        html: `<p>Your new verification code is: <strong>${verificationCode}</strong></p>`
      });
      if (result && result.debug) emailStatus = 'debug';
    } catch (err) {
      console.error('Email error:', err);
      emailStatus = 'failed';
    }

    res.json({
      message: emailStatus === 'sent'
        ? 'New code sent to email'
        : emailStatus === 'debug'
        ? 'New code generated (DEVELOPMENT: Check server console)'
        : 'New code generated, but email failed to send.'
    });
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
           firstName: user.firstName || '',
           lastName: user.lastName || '',
           phoneE164: user.phoneE164 || '',
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
        firstName: user.firstName,
        lastName: user.lastName,
        phoneE164: user.phoneE164,
        email: user.email,
        bio: user.bio,
        subscriptionTier: user.subscriptionTier,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getProfile = async (req, res) => {
  try {
    // Support demo mode
    if (mongoose.connection.readyState !== 1) {
      const state = await readStore();
      const user = state.users.find(u => u.username === req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found in demo mode' });
      return res.json({
        id: user.username,
        username: user.username,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneE164: user.phoneE164 || '',
        bio: user.bio || '',
        subscriptionTier: user.subscriptionTier || 'Free',
        avatarUrl: user.avatarUrl
      });
    }

    const user = await User.findById(req.user.id).select('-pin');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneE164: user.phoneE164,
      email: user.email,
      bio: user.bio,
      subscriptionTier: user.subscriptionTier,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
