const express = require("express");
const router = express.Router();
const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const auth = require('../middlewares/auth');
const questionController = require('../controllers/questionController');
const notificationController = require('../controllers/notificationController');
const chatController = require('../controllers/chatController');
const userController = require('../controllers/userController');

// Auth routes
router.post('/auth/signup', authController.signup);
router.post('/auth/verify-email', authController.verifyEmail);
router.post('/auth/resend-otp', authController.resendOTP);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleLogin);

// Profile routes
router.put('/user/profile', auth, profileController.updateProfile);
router.get('/user/profile', auth, profileController.getProfile);

// Question routes
router.get('/questions', auth, questionController.getQuestions);
router.post('/questions/responses', auth, questionController.submitResponses);
router.get('/questions/responses', auth, questionController.getUserResponses);
router.get('/matches', auth, questionController.findMatches);
router.get('/personality', auth, questionController.getPersonality);

// Notification routes
router.get('/notifications', auth, notificationController.getNotifications);
router.put('/notifications/:id/read', auth, notificationController.markAsRead);

// Chat routes
router.get('/matches/chat', auth, chatController.getMatches);
router.get('/matches/:matchId/messages', auth, chatController.getMessages);
router.get('/matches/:matchId/sync/:lastSyncTimestamp', auth, chatController.syncMessages);
router.post('/messages/resend', auth, chatController.resendFailedMessages);

module.exports = router;