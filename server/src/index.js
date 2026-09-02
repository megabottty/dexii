const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this for production
    methods: ["GET", "POST"]
  }
});

// Connect to Database (optional in demo mode)
const enableMongo = process.env.ENABLE_MONGO !== 'false';
if (enableMongo) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })
    .then(() => console.log('MongoDB Connected...'))
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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crushes', require('./routes/crushes'));
app.use('/api/demo/crushes', require('./routes/demoCrushes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/vault', require('./routes/vault'));

// Serve Angular app when built (single-service hosting option).
const distPath = path.resolve(__dirname, '..', '..', 'dist', 'dexii', 'browser');
app.use(express.static(distPath));

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
  return res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 5001;

const areFriends = async (userId, otherId) => {
  if (!otherId || String(userId) === String(otherId)) return false;
  if (mongoose.connection.readyState !== 1) {
    console.warn('Socket relay dropped: database unavailable for friendship check.');
    return false;
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

  socket.on('sendMessage', async (data) => {
    // data: { senderId, recipientId, content, isSafetyAlert, crushId }
    try {
      if (!(await areFriends(socket.data.userId, data?.recipientId))) {
        console.warn(`Socket message dropped: ${socket.data.userId} is not friends with ${data?.recipientId}.`);
        return;
      }

      io.to(data.recipientId).emit('receiveMessage', {
        ...data,
        senderId: socket.data.userId
      });
    } catch (err) {
      console.warn('Socket message dropped:', err.message);
    }
  });

  socket.on('safetyAlert', async (data) => {
    // data: { senderId, recipientId, status, location, crushId }
    try {
      if (!(await areFriends(socket.data.userId, data?.recipientId))) {
        console.warn(`Socket safety alert dropped: ${socket.data.userId} is not friends with ${data?.recipientId}.`);
        return;
      }

      io.to(data.recipientId).emit('safetyUpdate', {
        ...data,
        senderId: socket.data.userId
      });
    } catch (err) {
      console.warn('Socket safety alert dropped:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Dexii Backend running on port ${PORT}`);
});
