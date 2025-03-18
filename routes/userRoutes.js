const express = require('express');
const userController = require('../controllers/userController');
const { auth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/connections/:userId', auth, userController.sendRequest);
router.put('/connections/:userId', auth, userController.respondToRequest);
router.get('/connections', auth, userController.getConnections);
router.delete('/connections/:userId', auth, userController.removeConnection);
router.delete('/skipped-matches/:userId', auth, userController.removeMatch);

module.exports = router; 