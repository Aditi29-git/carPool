const express = require('express');
const router = express.Router();
const { createRide, fetchAvailableRides, bookRide, completeRide, startRide, fetchMyBookings, cancelRide, updatePaymentStatus, fetchMyRides, rateRide } = require('../controllers/rideController');
const { authenticateToken, verifyRider, verifyUser } = require('../middleware/auth');

router.post('/ride', authenticateToken, verifyRider, createRide);
router.post('/fetch-rides', authenticateToken, verifyUser, fetchAvailableRides);
router.post('/book-rides', authenticateToken, verifyUser, bookRide);
router.post('/:rideId/complete', authenticateToken, verifyRider, completeRide);
router.post('/:rideId/start', authenticateToken, verifyRider, startRide);
router.get('/my-bookings', authenticateToken, verifyUser, fetchMyBookings);
router.get('/my-rides', authenticateToken, verifyRider, fetchMyRides);
router.post('/:rideId/cancel', authenticateToken, cancelRide);
router.post('/:rideId/update-payment-status', authenticateToken, updatePaymentStatus);
router.post('/:rideId/rate', authenticateToken, verifyUser, rateRide);

module.exports = router;