const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const friendController = require('../controllers/friendController');

// @route   GET /api/friends
router.get('/', auth, friendController.getFriends);

// @route   POST /api/friends/:friendId
router.post('/:friendId', auth, friendController.addFriend);

// @route   DELETE /api/friends/:friendId
router.delete('/:friendId', auth, friendController.removeFriend);

// @route   GET /api/friends/search
router.get('/search', auth, friendController.searchUsers);

module.exports = router;
