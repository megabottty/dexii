const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const moderate = require('../middleware/moderation');
const groupController = require('../controllers/groupController');

// @route   POST /api/groups
router.post('/', auth, groupController.createGroup);

// @route   GET /api/groups
router.get('/', auth, groupController.listGroups);

// @route   GET /api/groups/:groupId/messages
router.get('/:groupId/messages', auth, groupController.getGroupMessages);

// @route   POST /api/groups/:groupId/messages
router.post('/:groupId/messages', [auth, moderate], groupController.sendGroupMessage);

// @route   PUT /api/groups/:groupId/read
router.put('/:groupId/read', auth, groupController.markGroupRead);

// @route   POST /api/groups/:groupId/members
router.post('/:groupId/members', auth, groupController.addMember);

// @route   DELETE /api/groups/:groupId/members/me
router.delete('/:groupId/members/me', auth, groupController.leaveGroup);

module.exports = router;
