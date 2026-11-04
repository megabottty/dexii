const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const GroupChat = require('./models/GroupChat');
const Message = require('./models/Message');
const { relayChatMessage, relayReaction, relaySafetyAlert } = require('./services/socketRelays');
const { handleWebhook } = require('./controllers/billingController');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this for production
    methods: ["GET", "POST"]
  }
});

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Connect to Database (optional in demo mode)
const enableMongo = process.env.ENABLE_MONGO !== 'false';
if (enableMongo) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })
    .then(async () => {
      console.log('MongoDB Connected...');
      // One-time backfill: copy each account's chosen display name up to the top level.
      try {
        const User = require('./models/User');
        const result = await User.updateMany(
          { $or: [{ displayName: { $exists: false } }, { displayName: '' }], 'profileSettings.displayName': { $type: 'string', $ne: '' } },
          [{ $set: { displayName: { $trim: { input: '$profileSettings.displayName' } } } }],
          { updatePipeline: true }
        );
        if (result.modifiedCount) console.log(`Backfilled the display name on ${result.modifiedCount} account(s).`);
      } catch (err) {
        console.warn('Display name backfill skipped:', err.message);
      }
    })
    .catch((err) => {
      console.warn('MongoDB connection error:', err.message);
      if (err.message.includes('authentication failed')) {
        console.warn('HELPFUL TIP: Your MONGO_URI in Render Settings might have an incorrect username or password.');
        console.warn('1. Check that you did NOT include < and > symbols around your password.');
        console.warn('2. If your password has special characters like ! or @, try replacing them with URL-encoded versions (e.g., ! is %21).');
      }
      console.warn('Running in demo storage mode.');
    });
} else {
  console.log('MongoDB disabled via ENABLE_MONGO=false. Running in demo storage mode.');
}

// Middleware
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crushes', require('./routes/crushes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/activity', require('./routes/activity'));

// Expose io on the app so REST controllers (e.g. group messages) can emit realtime events.
app.set('io', io);

// Native push (APNs / FCM). Logs which providers are configured.
require('./services/pushService').init();

// Serve Angular app when built (single-service hosting option).
const distPath = path.resolve(__dirname, '..', '..', 'dist', 'dexii', 'browser');
app.use(express.static(distPath, {
  index: false,
  setHeaders: (res, filePath) => {
    const base = path.basename(filePath);
    if (base === 'index.html' || base === 'ngsw.json' || base === 'ngsw-worker.js' || base === 'manifest.webmanifest') {
      // The app shell and service-worker manifest must always be revalidated
      // so deploys reach users promptly.
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/-[0-9A-Z]{8}\.(js|css)$/i.test(base)) {
      // Angular fingerprints these; the URL changes whenever the content does.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Build/deploy identity. Render sets RENDER_GIT_COMMIT / RENDER_GIT_BRANCH at
// build time; locally we fall back to asking git so the shape is the same.
const startedAt = new Date();
const buildInfo = (() => {
  const gitFallback = (args) => {
    try {
      return require('child_process').execSync(`git ${args}`, {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 2000
      }).toString().trim();
    } catch {
      return null;
    }
  };
  // `npm run build` writes server/build-info.json (scripts/build-info.js) with the
  // auto-bumped version the client was stamped with. Absent when the server was
  // started without a build, in which case we fall back to env/git/package.json.
  let fromBuild = null;
  try { fromBuild = require('../build-info.json'); } catch { /* no build yet */ }
  const commit = fromBuild?.commit || process.env.RENDER_GIT_COMMIT || gitFallback('rev-parse HEAD');
  const branch = fromBuild?.branch || process.env.RENDER_GIT_BRANCH || gitFallback('rev-parse --abbrev-ref HEAD');
  const subject = fromBuild?.commitMessage ?? (process.env.RENDER_GIT_COMMIT ? null : gitFallback('log -1 --pretty=%s'));
  return {
    version: fromBuild?.version || (() => { try { return require('../../package.json').version; } catch { return require('../package.json').version; } })(),
    buildNumberSource: fromBuild?.buildNumberSource || null,
    buildTime: fromBuild?.buildTime || null,
    serverVersion: require('../package.json').version,
    commit: commit || null,
    shortCommit: commit ? commit.slice(0, 7) : null,
    branch: branch || null,
    commitMessage: subject,
    service: process.env.RENDER_SERVICE_NAME || null,
    instance: process.env.RENDER_INSTANCE_ID || null,
    url: process.env.RENDER_EXTERNAL_URL || null,
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
    startedAt: startedAt.toISOString()
  };
})();

// Lightweight liveness probe for keep-alive pings. Deliberately does no
// database work so scheduled pings stay fast and cheap. Also reports which
// build is running so a deploy can be verified at a glance.
const healthPayload = () => ({
  status: 'ok',
  uptime: Math.round(process.uptime()),
  ...buildInfo,
  mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
});
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(healthPayload());
});
app.get('/api/version', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(healthPayload());
});

// Basic Route
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Welcome to the Dexii Private API - High Glamour, High Security.',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected (demo mode)',
    email: process.env.EMAIL_USER ? 'configured' : 'not configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  // A path that looks like a file (robots.txt, foo.png) that static didn't
  // find is a real 404, not a route for the SPA shell.
  if (/\.[a-z0-9]{1,8}$/i.test(req.path)) {
    return res.status(404).type('text').send('Not found');
  }
  res.setHeader('Cache-Control', 'no-cache');
  return res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 5001;

const areFriends = async (userId, otherId) => {
  if (!otherId || String(userId) === String(otherId)) return false;
  if (mongoose.connection.readyState !== 1) {
    try {
      const { readStore } = require('./utils/demoFriendStore');
      const state = await readStore();
      const user = state.users.find(u => u.username === userId || u.id === userId);
      const friendnames = state.friendships?.[user?.username] || [];
      return friendnames.includes(otherId);
    } catch {
      return false;
    }
  }

  try {
    const user = await User.findById(userId).select('friends').lean();
    return (user?.friends || []).some((id) => String(id) === String(otherId));
  } catch (err) {
    console.warn('Socket relay dropped: friendship check failed:', err.message);
    return false;
  }
};

// Socket.io connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Unauthorized'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.join(socket.data.userId);
  console.log(`User ${socket.data.userId} joined their private room.`);

  socket.on('join', (userId) => {
    socket.join(socket.data.userId);
    console.log(`User ${socket.data.userId} joined their private room.`);
  });

  // Live relays only announce messages already saved over REST, and read them back first
  // so nobody can push made-up messages or reactions to other people (services/socketRelays.js).
  socket.on('sendMessage', (data) => {
    relayChatMessage({ io, userId: socket.data.userId, data, Message })
      .catch((err) => console.warn('Socket message dropped:', err.message));
  });

  socket.on('safetyAlert', (data) => {
    relaySafetyAlert({ io, userId: socket.data.userId, data, areFriends })
      .catch((err) => console.warn('Socket safety alert dropped:', err.message));
  });

  socket.on('messageReaction', (data) => {
    relayReaction({ io, userId: socket.data.userId, data, Message, GroupChat })
      .catch((err) => console.warn('Socket reaction relay dropped:', err.message));
  });

  // "Ana is typing…": relayed only, never stored. Clients send it at most every few
  // seconds while someone types, and once with isTyping: false when they stop or send.
  socket.on('typing', async (data) => {
    try {
      const isTyping = data?.isTyping !== false;
      const me = String(socket.data.userId);
      if (data?.recipientId) {
        if (!(await areFriends(socket.data.userId, data.recipientId))) return;
        io.to(String(data.recipientId)).emit('typing', { senderId: me, isTyping });
        return;
      }
      if (data?.groupId && mongoose.isValidObjectId(data.groupId) && mongoose.connection.readyState === 1) {
        const group = await GroupChat.findById(data.groupId).select('members').lean();
        const memberIds = (group?.members || []).map(String);
        if (!memberIds.includes(me)) return;
        for (const memberId of memberIds) {
          if (memberId === me) continue;
          io.to(memberId).emit('typing', { senderId: me, groupId: String(data.groupId), isTyping });
        }
      }
    } catch (err) {
      console.warn('Typing relay dropped:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Dexii Backend running on port ${PORT}`);
});
