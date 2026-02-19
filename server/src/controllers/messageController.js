const Message = require('../models/Message');
const User = require('../models/User');

// @route   GET /api/messages/:friendId
// @desc    Get messages between logged-in user and a friend
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content, isSafetyAlert, crushId } = req.body;
    const senderId = req.user.id;

    const newMessage = new Message({
      sender: senderId,
      recipient: recipientId,
      content,
      isSafetyAlert,
      crushId
    });

    const message = await newMessage.save();
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/messages/read/:friendId
// @desc    Mark messages as read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user.id;

    await Message.updateMany(
      { sender: friendId, recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
