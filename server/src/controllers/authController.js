const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { ensureUser, readStore } = require('../utils/demoFriendStore');
const loginAttempts = new Map();

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
const isValidPassword = (value) => typeof value === 'string' && value.length >= 8;
const attemptKey = (req, username) => `${req.ip}:${String(username || '').toLowerCase()}`;
const isRateLimited = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(key, { startedAt: now, failures: 0 });
    return false;
  }
  return entry.failures >= 5;
};
const recordFailedLogin = (key) => {
  const entry = loginAttempts.get(key) || { startedAt: Date.now(), failures: 0 };
  entry.failures += 1;
  loginAttempts.set(key, entry);
};
const clearLoginAttempts = (key) => loginAttempts.delete(key);

// @desc    Register a new user / Set initial PIN
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, password, pin, email, bio, firstName, lastName, phoneNumber, phoneE164 } = req.body;
    const safeUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhoneE164(phoneE164 || phoneNumber);
    const safeFirstName = typeof firstName === 'string' ? firstName.trim().slice(0, 80) : '';
    const safeLastName = typeof lastName === 'string' ? lastName.trim().slice(0, 80) : '';
    if (!safeUsername) {
      return res.status(400).json({ message: 'Username is required' });
    }
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if ((phoneNumber || phoneE164) && !normalizedPhone) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Support demo mode if database is not connected
    if (mongoose.connection.readyState !== 1) {
      console.warn(`Database not ready. Registering ${username} in demo mode.`);
      const state = await readStore();
      const existing = state.users.find(u => u.username === safeUsername);
      if (existing) {
        return res.status(400).json({ message: 'Username already taken in demo mode' });
      }

      // In demo mode, save password and pin hashes in the JSON store
      const user = ensureUser(state, safeUsername);
      user.bio = bio;
      user.email = normalizedEmail;
      user.firstName = safeFirstName;
      user.lastName = safeLastName;
      user.phoneE164 = normalizedPhone || '';
      user.passwordHash = await bcrypt.hash(password, 10);
      if (pin) {
        user.pin = await bcrypt.hash(pin, 10);
      }
      user.isEmailVerified = false;

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

      console.warn(`--- DEMO MODE VERIFICATION CODE for ${safeUsername}: ${verificationCode} (Status: ${emailStatus}) ---`);

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
    const duplicateChecks = [{ username: safeUsername }];
    if (normalizedEmail) duplicateChecks.push({ email: normalizedEmail });
    if (normalizedPhone) duplicateChecks.push({ phoneE164: normalizedPhone });

    let user = await User.findOne({ $or: duplicateChecks });
    if (user) {
      if (!user.isEmailVerified) {
        const usernameOwner = await User.findOne({ username: safeUsername });
        if (usernameOwner && usernameOwner._id.toString() !== user._id.toString() && usernameOwner.isEmailVerified) {
          return res.status(400).json({ message: 'Username already taken' });
        }

        if (normalizedEmail) {
          const emailOwner = await User.findOne({ email: normalizedEmail });
          if (emailOwner && emailOwner._id.toString() !== user._id.toString() && emailOwner.isEmailVerified) {
            return res.status(400).json({ message: 'Email already taken' });
          }
        }

        if (normalizedPhone) {
          const phoneOwner = await User.findOne({ phoneE164: normalizedPhone });
          if (phoneOwner && phoneOwner._id.toString() !== user._id.toString() && phoneOwner.isEmailVerified) {
            return res.status(400).json({ message: 'Phone already taken' });
          }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);
        const passwordHash = await bcrypt.hash(password, salt);
        const verificationCode = generateCode();

        user.username = safeUsername;
        user.firstName = safeFirstName;
        user.lastName = safeLastName;
        user.pin = hashedPin;
        user.passwordHash = passwordHash;
        user.email = normalizedEmail || undefined;
        user.phoneE164 = normalizedPhone || undefined;
        user.bio = typeof bio === 'string' ? bio.trim().slice(0, 500) : '';
        user.verificationCode = verificationCode;
        user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
        user.isEmailVerified = false;
        await user.save();

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

        return res.status(200).json({
          message: emailStatus === 'sent'
            ? 'Existing unverified account updated. Verification code sent to email.'
            : emailStatus === 'debug'
            ? 'Existing unverified account updated. (DEVELOPMENT: Check server console for code)'
            : 'Existing unverified account updated, but email failed. Check your SMTP settings and server logs.',
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneE164: user.phoneE164,
          emailSent: emailStatus === 'sent',
          debugMode: emailStatus === 'debug'
        });
      }

      return res.status(400).json({ message: 'Username, email, or phone already taken' });
    }

    // Hash PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);
    const passwordHash = await bcrypt.hash(password, salt);

    const verificationCode = generateCode();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user = new User({
      username: safeUsername,
      firstName: safeFirstName,
      lastName: safeLastName,
      pin: hashedPin,
      passwordHash,
      email: normalizedEmail,
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
    const safeUsername = typeof username === 'string' ? username.trim() : '';
    const safeCode = typeof code === 'string' ? code.trim() : '';

    // Support demo mode
    if (mongoose.connection.readyState !== 1) {
      console.warn(`Database not ready. Verifying ${safeUsername} in demo mode.`);
      const state = await readStore();
      const user = state.users.find(u =>
        u.username.toLowerCase() === safeUsername.toLowerCase() ||
        (u.email && u.email.toLowerCase() === safeUsername.toLowerCase())
      );

      if (!user) {
        return res.status(400).json({ message: 'User not found in demo mode' });
      }

      // In demo mode, we previously auto-verified, but to simulate real behavior,
      // we'll require the code that was logged to the console during registration.
      // If the user is stuck, we'll allow '000000' as a backdoor for demo mode ONLY.
      if (safeCode !== '000000' && safeCode !== user.verificationCode) {
        return res.status(400).json({ message: 'Invalid demo verification code. Use 000000 or see server console.' });
      }

      user.isEmailVerified = true;
      user.verificationCode = undefined;
      const fs = require('fs/promises');
      const path = require('path');
      await fs.writeFile(path.join(__dirname, '..', '..', 'data', 'demo-friends.json'), JSON.stringify(state, null, 2), 'utf8');

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

    const escapedIdentifier = safeUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalizedEmail = normalizeEmail(safeUsername);
    const lookupQueries = [
      { username: safeUsername },
      { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }
    ];
    if (normalizedEmail) {
      lookupQueries.push({ email: normalizedEmail });
    }

    const user = await User.findOne({
      $or: lookupQueries,
      verificationCode: safeCode,
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
    if (!user.email) {
      return res.status(400).json({ message: 'Cannot resend code: account has no email address.' });
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

// @desc    Authenticate user / Verify credentials
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password, pin } = req.body;
    const safeIdentifier = typeof username === 'string' ? username.trim() : '';
    if (!safeIdentifier) {
      return res.status(400).json({ message: 'Username or email is required' });
    }
    const key = attemptKey(req, safeIdentifier);
    if (isRateLimited(key)) {
      return res.status(429).json({ message: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    // Support demo mode if database is not connected
    if (mongoose.connection.readyState !== 1) {
       console.warn(`Database not ready. Logging in ${safeIdentifier} in demo mode.`);
       const state = await readStore();
       const user = state.users.find(u =>
         u.username.toLowerCase() === safeIdentifier.toLowerCase() ||
         (u.email && u.email.toLowerCase() === safeIdentifier.toLowerCase())
       );

       if (!user) {
         recordFailedLogin(key);
         return res.status(400).json({ message: 'Invalid username or password' });
       }
       const isLegacyDemo = !user.passwordHash;
       if (user.passwordHash) {
         const matches = await bcrypt.compare(password || '', user.passwordHash);
         if (!matches) {
           recordFailedLogin(key);
           return res.status(400).json({ message: 'Invalid username or password' });
         }
       } else if (!user.pin || !(await bcrypt.compare(pin || '', user.pin))) {
         recordFailedLogin(key);
         return res.status(400).json({ message: 'Legacy accounts must sign in with their PIN once.' });
       }
       clearLoginAttempts(key);

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
           email: user.email || '',
           bio: user.bio || '',
           subscriptionTier: user.subscriptionTier || 'Free',
           needsPasswordSetup: isLegacyDemo
         }
       });
    }

    const escapedIdentifier = safeIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalizedEmail = normalizeEmail(safeIdentifier);
    const lookupQueries = [
      { username: safeIdentifier },
      { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }
    ];
    if (normalizedEmail) {
      lookupQueries.push({ email: normalizedEmail });
    }

    const user = await User.findOne({ $or: lookupQueries });
    if (!user) {
      recordFailedLogin(key);
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    if (!user.isEmailVerified) {
       return res.status(401).json({ message: 'Please verify your email first', needsVerification: true });
    }

    const isLegacy = !user.passwordHash;
    const isMatch = isLegacy
      ? await bcrypt.compare(pin || '', user.pin)
      : await bcrypt.compare(password || '', user.passwordHash);
    if (!isMatch) {
      recordFailedLogin(key);
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    clearLoginAttempts(key);

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
        avatarUrl: user.avatarUrl,
        needsPasswordSetup: isLegacy
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Verify 4-digit Vault PIN
// @route   POST /api/auth/verify-pin
exports.verifyPin = async (req, res) => {
  try {
    const { pin, username } = req.body;
    const safePin = typeof pin === 'string' ? pin.trim() : '';
    if (!safePin || safePin.length !== 4) {
      return res.status(400).json({ message: 'Valid 4-digit PIN is required' });
    }

    let userIdentifier = req.user?.id || username;
    if (typeof userIdentifier === 'string') userIdentifier = userIdentifier.trim();

    if (!userIdentifier) {
      return res.status(400).json({ message: 'User identifier or token is required' });
    }

    // Support demo mode
    if (mongoose.connection.readyState !== 1 || req.user?.isDemo) {
      const state = await readStore();
      const user = state.users.find(u =>
        u.username.toLowerCase() === userIdentifier.toLowerCase() ||
        (u.email && u.email.toLowerCase() === userIdentifier.toLowerCase())
      );

      if (!user) {
        return res.status(400).json({ message: 'User not found in demo mode' });
      }

      if (user.pin) {
        const isMatch = await bcrypt.compare(safePin, user.pin);
        if (!isMatch) {
          return res.status(400).json({ message: 'Incorrect PIN' });
        }
      }
      return res.json({ success: true, message: 'PIN verified successfully' });
    }

    let user = null;
    if (mongoose.Types.ObjectId.isValid(userIdentifier)) {
      user = await User.findById(userIdentifier);
    }
    if (!user) {
      const escapedIdentifier = userIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedEmail = normalizeEmail(userIdentifier);
      const lookupQueries = [
        { username: userIdentifier },
        { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }
      ];
      if (normalizedEmail) {
        lookupQueries.push({ email: normalizedEmail });
      }
      user = await User.findOne({ $or: lookupQueries });
    }

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(safePin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect PIN' });
    }

    res.json({ success: true, message: 'PIN verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const identifier = typeof req.body.usernameOrEmail === 'string'
      ? req.body.usernameOrEmail.trim()
      : '';
    if (!identifier) return res.status(400).json({ message: 'Username or email is required.' });

    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'If that account exists, a reset code has been sent.' });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: normalizeEmail(identifier) }]
    });
    if (user?.email) {
      const code = generateCode();
      user.passwordResetCode = code;
      user.passwordResetCodeExpires = Date.now() + 10 * 60 * 1000;
      await user.save();
      await sendEmail({
        email: user.email,
        subject: 'Dexii Password Reset Code',
        message: `Your password reset code is: ${code}. It expires in 10 minutes.`,
        html: `<p>Your password reset code is: <strong>${code}</strong></p>`
      });
    }
    return res.json({ message: 'If that account exists, a reset code has been sent.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Unable to request password reset.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { usernameOrEmail, code, password } = req.body;
    if (!usernameOrEmail || !code || !isValidPassword(password)) {
      return res.status(400).json({ message: 'Account, reset code, and an 8+ character password are required.' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(400).json({ message: 'Password reset is unavailable in demo mode.' });
    }
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: normalizeEmail(usernameOrEmail) }],
      passwordResetCode: code,
      passwordResetCodeExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset code.' });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpires = undefined;
    await user.save();
    return res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Unable to reset password.' });
  }
};

exports.setPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (mongoose.connection.readyState !== 1) {
      const state = await readStore();
      const user = state.users.find((entry) => entry.username === req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found in demo mode.' });
      user.passwordHash = await bcrypt.hash(password, 12);
      const fs = require('fs/promises');
      const path = require('path');
      await fs.writeFile(path.join(__dirname, '..', '..', 'data', 'demo-friends.json'), JSON.stringify(state, null, 2), 'utf8');
      return res.json({ message: 'Password created successfully.' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    return res.json({ message: 'Password created successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Unable to create password.' });
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
