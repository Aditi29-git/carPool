const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');
const { authenticateToken, verifyRider, verifyUser } = require('../middleware/auth');

router.post('/feedback/:token', authenticateToken, verifyUser, submitFeedback);

module.exports = router;