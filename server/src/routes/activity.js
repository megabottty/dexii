const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { listAll } = require('../controllers/activityController');

// @route   GET /api/activity
router.get('/', auth, listAll);

module.exports = router;
