const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const entryController = require('../controllers/entryController');

router.use(auth);

router.get('/shared', entryController.getSharedEntries);
router.get('/', entryController.getEntries);
router.post('/', entryController.createEntry);
router.put('/:id', entryController.updateEntry);
router.delete('/:id', entryController.deleteEntry);
router.post('/:id/viewed', entryController.markViewed);

module.exports = router;
