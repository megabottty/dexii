const express = require('express');
const router = express.Router();
const { getDemoCrushes, createDemoCrush, updateDemoCrush, deleteDemoCrush } = require('../controllers/demoCrushController');

router.get('/', getDemoCrushes);
router.post('/', createDemoCrush);
router.put('/:id', updateDemoCrush);
router.delete('/:id', deleteDemoCrush);

module.exports = router;
