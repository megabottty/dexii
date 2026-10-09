const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCrushes, getFriendSharedCrushes, getSharedCrushById, createCrush, updateCrush, deleteCrush, shareCrush, unshareCrush,
  getCrushPhotos, addCrushPhoto, removeCrushPhoto, removeCrushPhotos, reorderCrushPhotos, setCrushPhotoAudience,
  voteCompatibility, retractCompatibilityVote
} = require('../controllers/crushController');

// All routes here require auth
router.use(auth);

// @route   GET /api/crushes
router.get('/', getCrushes);

// @route   GET /api/crushes/friend/:friendId
router.get('/friend/:friendId', getFriendSharedCrushes);

// @route   GET /api/crushes/shared/:crushId
router.get('/shared/:crushId', getSharedCrushById);

// @route   POST /api/crushes
router.post('/', createCrush);

// @route   PUT /api/crushes/:id
router.put('/:id', updateCrush);

// @route   POST /api/crushes/:id/share
router.post('/:id/share', shareCrush);

// @route   DELETE /api/crushes/:id/share/:friendId
router.delete('/:id/share/:friendId', unshareCrush);

// A friend's read on a crush shared with them
router.put('/:id/compatibility/vote', voteCompatibility);
router.delete('/:id/compatibility/vote', retractCompatibilityVote);

// Photos (up to 8 per crush; friends only see what each photo's audience allows)
router.get('/:id/photos', getCrushPhotos);
router.post('/:id/photos', addCrushPhoto);
router.post('/:id/photos/delete', removeCrushPhotos);
router.put('/:id/photos/order', reorderCrushPhotos);
router.put('/:id/photos/audience', setCrushPhotoAudience);
router.put('/:id/photos/:photoId/audience', setCrushPhotoAudience);
router.delete('/:id/photos/:photoId', removeCrushPhoto);

// @route   DELETE /api/crushes/:id
router.delete('/:id', deleteCrush);

module.exports = router;
