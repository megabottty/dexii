const express = require('express');
const router = express.Router();
const { getDemoCrushes, createDemoCrush, updateDemoCrush } = require('../controllers/demoCrushController');

router.get('/', getDemoCrushes);
router.post('/', createDemoCrush);
router.put('/:id', updateDemoCrush);

module.exports = router;
