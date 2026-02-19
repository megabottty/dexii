const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this for production
    methods: ["GET", "POST"]
  }
});

// Connect to Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crushes', require('./routes/crushes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/vault', require('./routes/vault'));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Dexii Private API - High Glamour, High Security.' });
});

// Start Server
const PORT = process.env.PORT || 5001;

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their private room.`);
  });

  socket.on('sendMessage', (data) => {
    // data: { senderId, recipientId, content, isSafetyAlert, crushId }
    io.to(data.recipientId).emit('receiveMessage', data);
  });

  socket.on('safetyAlert', (data) => {
    // data: { senderId, recipientId, status, location, crushId }
    io.to(data.recipientId).emit('safetyUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Dexii Backend running on port ${PORT}`);
});
