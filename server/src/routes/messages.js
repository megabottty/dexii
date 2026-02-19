const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const moderate = require('../middleware/moderation');
const messageController = require('../controllers/messageController');

// @route   GET /api/messages/:friendId
router.get('/:friendId', auth, messageController.getMessages);

// @route   POST /api/messages
router.post('/', [auth, moderate], messageController.sendMessage);

// @route   PUT /api/messages/read/:friendId
router.put('/read/:friendId', auth, messageController.markAsRead);

module.exports = router;
