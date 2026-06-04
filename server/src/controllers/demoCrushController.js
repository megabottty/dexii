const { getCrushes, addCrush, updateCrush } = require('../utils/demoCrushStore');

const normalizeOwner = (input) => {
  if (!input || typeof input !== 'string') return 'dexii_demo_user';
  return input.trim() || 'dexii_demo_user';
};

exports.getDemoCrushes = async (req, res) => {
  try {
    const owner = normalizeOwner(req.query.owner);
    const crushes = await getCrushes(owner);
    res.json(crushes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createDemoCrush = async (req, res) => {
  try {
    const owner = normalizeOwner(req.body.owner);

    if (!req.body.nickname || typeof req.body.nickname !== 'string') {
      return res.status(400).json({ message: 'nickname is required' });
    }

    const crush = await addCrush(owner, req.body);
    res.status(201).json(crush);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateDemoCrush = async (req, res) => {
  try {
    const owner = normalizeOwner(req.body.owner);
    const id = req.params.id;

    const crush = await updateCrush(owner, id, req.body);
    if (!crush) {
      return res.status(404).json({ message: 'Crush not found' });
    }
    res.json(crush);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
