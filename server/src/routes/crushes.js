const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCrushes, createCrush, updateCrush } = require('../controllers/crushController');

// All routes here require auth
router.use(auth);

// @route   GET /api/crushes
router.get('/', getCrushes);

// @route   POST /api/crushes
router.post('/', createCrush);

// @route   PUT /api/crushes/:id
router.put('/:id', updateCrush);

module.exports = router;
