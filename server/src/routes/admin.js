const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const adminController = require('../controllers/adminController');

router.use(auth, requireSuperAdmin);

router.get('/super-admins', adminController.listSuperAdmins);
router.post('/super-admins', adminController.addSuperAdmin);
router.delete('/super-admins/:username', adminController.removeSuperAdmin);

module.exports = router;
