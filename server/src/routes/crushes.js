const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCrushes, getFriendSharedCrushes, getSharedCrushById, createCrush, updateCrush, deleteCrush } = require('../controllers/crushController');

// All routes here require auth
router.use(auth);

// @route   GET /api/crushes
router.get('/', getCrushes);

// @route   GET /api/crushes/friend/:friendId
router.get('/friend/:friendId', getFriendSharedCrushes);

// @route   GET /api/crushes/shared/:crushId
router.get('/shared/:crushId', getSharedCrushById);

// @route   POST /api/crushes
router.post('/', createCrush);

// @route   PUT /api/crushes/:id
router.put('/:id', updateCrush);

// @route   DELETE /api/crushes/:id
router.delete('/:id', deleteCrush);

module.exports = router;
