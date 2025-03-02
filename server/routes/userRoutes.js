const router = require('express').Router();
const { sendOTP, verifyOtp, login, logout,forgotPassword, resetPassword } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');


router.get('/', (req, res) => {
    res.send("Hello World");
});

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/logout', logout)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password/:token',resetPassword)

module.exports = router;