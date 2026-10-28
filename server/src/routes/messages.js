const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const moderate = require('../middleware/moderation');
const messageController = require('../controllers/messageController');

// @route   GET /api/messages/conversations
router.get('/conversations', auth, messageController.getConversations);

// @route   GET /api/messages/:friendId
router.get('/:friendId', auth, messageController.getMessages);

// @route   POST /api/messages
router.post('/', [auth, moderate], messageController.sendMessage);

// @route   PUT /api/messages/read/:friendId
router.put('/read/:friendId', auth, messageController.markAsRead);

// @route   PUT /api/messages/:messageId   (edit your own, within 15 minutes)
router.put('/:messageId', [auth, moderate], messageController.editMessage);

// @route   DELETE /api/messages/:messageId?for=everyone|me
router.delete('/:messageId', auth, messageController.deleteMessage);

// @route   POST /api/messages/:messageId/react
router.post('/:messageId/react', auth, messageController.reactToMessage);

module.exports = router;
