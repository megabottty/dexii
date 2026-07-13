const express = require('express');
const router = express.Router();
const controller = require('../controllers/demoFriendController');

router.get('/search', controller.search);
router.get('/list', controller.list);
router.get('/requests', controller.incoming);
router.get('/requests/sent', controller.outgoing);
router.post('/request', controller.request);
router.post('/requests/:requestId/respond', controller.respond);
router.post('/requests/:requestId/nudge', controller.nudge);
router.delete('/list/:friendUsername', controller.remove);

module.exports = router;
