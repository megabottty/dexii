const User = require('../models/User');

// @route   GET /api/friends
// @desc    Get user's friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username avatarUrl friendCategories');
    res.json(user.friends);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/friends/:friendId
// @desc    Add a friend
// @access  Private
exports.addFriend = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friendId = req.params.friendId;

    if (user.friends.includes(friendId)) {
      return res.status(400).json({ msg: 'User is already a friend' });
    }

    user.friends.push(friendId);
    await user.save();

    // Reciprocate friend request/add in a real app,
    // but for this CRM we'll just add to current user's list for now.

    res.json(user.friends);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE /api/friends/:friendId
// @desc    Remove a friend
// @access  Private
exports.removeFriend = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friendId = req.params.friendId;

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    await user.save();

    res.json(user.friends);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/friends/search?username=...
// @desc    Search for users to add as friends
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { username } = req.query;
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user.id } // Don't include self
    }).select('username avatarUrl');

    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
