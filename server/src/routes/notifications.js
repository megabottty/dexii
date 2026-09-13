const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.use(auth);

// @route   GET /api/notifications/unread-count
router.get('/unread-count', notificationController.getUnreadCount);

// @route   GET /api/notifications
router.get('/', notificationController.listNotifications);

// @route   PUT /api/notifications/read-all
router.put('/read-all', notificationController.markAllRead);

// @route   PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markRead);

module.exports = router;
