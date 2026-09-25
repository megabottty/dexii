const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.use(auth);

// @route   GET /api/notifications/unread-count
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/journal-prompt', notificationController.createJournalPrompt);

// Web Push (browsers and the installed PWA).
router.get('/web-push/public-key', notificationController.getWebPushPublicKey);
router.post('/web-push/subscribe', notificationController.subscribeWebPush);
router.delete('/web-push/subscribe', notificationController.unsubscribeWebPush);

// Native app device tokens (Capacitor push).
router.post('/push-token', notificationController.registerPushToken);
router.delete('/push-token', notificationController.removePushToken);

// @route   GET /api/notifications
router.get('/', notificationController.listNotifications);

// @route   PUT /api/notifications/read-all
router.put('/read-all', notificationController.markAllRead);

// @route   PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markRead);

// @route   PUT /api/notifications/:id/unread
router.put('/:id/unread', notificationController.markUnread);

module.exports = router;
