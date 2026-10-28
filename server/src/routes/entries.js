const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const entryController = require('../controllers/entryController');
const updateActivity = require('../controllers/updateActivityController');
const requireFeature = require('../middleware/requireFeature');

router.use(auth);

router.get('/shared', entryController.getSharedEntries);
router.get('/', entryController.getEntries);
// Safety Check entries are a Premium feature; other entry types are not gated.
router.post('/', requireFeature('safetyCheck', (req) => req.body?.type === 'SafetyCheck'), entryController.createEntry);
router.put('/:id', entryController.updateEntry);
router.delete('/:id', entryController.deleteEntry);
router.post('/:id/viewed', entryController.markViewed);
// Reactions, comments and comment hearts on Updates For Friends (DEX-45).
router.post('/:id/reactions', updateActivity.react);
router.post('/:id/comments', updateActivity.addComment);
router.put('/:id/comments/:commentId', updateActivity.editComment);
router.delete('/:id/comments/:commentId', updateActivity.deleteComment);
router.post('/:id/comments/:commentId/heart', updateActivity.heartComment);

module.exports = router;
