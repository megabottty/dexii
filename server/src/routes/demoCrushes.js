const express = require('express');
const router = express.Router();
const { getDemoCrushes, createDemoCrush } = require('../controllers/demoCrushController');

router.get('/', getDemoCrushes);
router.post('/', createDemoCrush);

module.exports = router;
