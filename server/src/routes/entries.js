const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const entryController = require('../controllers/entryController');
const requireFeature = require('../middleware/requireFeature');

router.use(auth);

router.get('/shared', entryController.getSharedEntries);
router.get('/', entryController.getEntries);
// Safety Check entries are a Premium feature; other entry types are not gated.
router.post('/', requireFeature('safetyCheck', (req) => req.body?.type === 'SafetyCheck'), entryController.createEntry);
router.put('/:id', entryController.updateEntry);
router.delete('/:id', entryController.deleteEntry);
router.post('/:id/viewed', entryController.markViewed);

module.exports = router;
