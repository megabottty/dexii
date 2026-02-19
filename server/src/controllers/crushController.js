const CrushProfile = require('../models/CrushProfile');

// @desc    Get all crush profiles for a user
// @route   GET /api/crushes
exports.getCrushes = async (req, res) => {
  try {
    const crushes = await CrushProfile.find({ userId: req.user.id });
    res.json(crushes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Create a new crush profile
// @route   POST /api/crushes
exports.createCrush = async (req, res) => {
  try {
    const newCrush = new CrushProfile({
      ...req.body,
      userId: req.user.id
    });

    const crush = await newCrush.save();
    res.status(201).json(crush);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update a crush profile
// @route   PUT /api/crushes/:id
exports.updateCrush = async (req, res) => {
  try {
    let crush = await CrushProfile.findById(req.params.id);
    if (!crush) return res.status(404).json({ message: 'Crush not found' });

    // Check ownership
    if (crush.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    crush = await CrushProfile.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(crush);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
