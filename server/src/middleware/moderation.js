// Mock AI Moderation middleware
// In a real app, this would call an external API like Perspective API or similar.
const moderateContent = (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    return next();
  }

  // Simulated banned words for demonstration
  const bannedWords = ['badword1', 'badword2', 'spam_link', 'malicious_content'];

  const isClean = !bannedWords.some(word => content.toLowerCase().includes(word));

  if (!isClean) {
    return res.status(400).json({
      msg: 'Content flagged by AI moderation for containing restricted terms.',
      flagged: true
    });
  }

  next();
};

module.exports = moderateContent;
