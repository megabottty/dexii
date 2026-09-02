const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const friendController = require('../controllers/friendController');

// NOTE: specific paths must be registered before the '/:friendId' param routes,
// otherwise Express matches them as a friend id (this previously broke '/invite').

// @route   GET /api/friends/search
router.get('/search', auth, friendController.searchUsers);

// @route   GET /api/friends/requests
router.get('/requests', auth, friendController.getIncomingRequests);

// @route   GET /api/friends/requests/sent
router.get('/requests/sent', auth, friendController.getOutgoingRequests);

// @route   POST /api/friends/requests
router.post('/requests', auth, friendController.sendFriendRequest);

// @route   POST /api/friends/requests/:requestId/respond
router.post('/requests/:requestId/respond', auth, friendController.respondToRequest);

// @route   POST /api/friends/requests/:requestId/nudge
router.post('/requests/:requestId/nudge', auth, friendController.nudgeRequest);

// @route   DELETE /api/friends/requests/:requestId
router.delete('/requests/:requestId', auth, friendController.cancelRequest);

// @route   POST /api/friends/invite
router.post('/invite', auth, friendController.inviteUser);

// @route   GET /api/friends
router.get('/', auth, friendController.getFriends);

// @route   DELETE /api/friends/:friendId
router.delete('/:friendId', auth, friendController.removeFriend);

module.exports = router;
