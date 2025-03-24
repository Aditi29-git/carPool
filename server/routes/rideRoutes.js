const express = require('express');
const router = express.Router();
const { createRide, fetchAvailableRides, bookRide, completeRide, startRide, fetchMyBookings, cancelRide } = require('../controllers/rideController');
const { authenticateToken, verifyRider, verifyUser } = require('../middleware/auth');

router.post('/ride', authenticateToken, verifyRider, createRide);
router.post('/fetch-rides', authenticateToken, verifyUser, fetchAvailableRides);
router.post('/book-rides', authenticateToken, verifyUser, bookRide);
router.get('/:rideId/complete', authenticateToken, verifyRider, completeRide);
router.put('/:rideId/start', authenticateToken, verifyRider, startRide);
router.get('/my-bookings', authenticateToken, verifyUser, fetchMyBookings);
router.post('/:rideId/cancel', authenticateToken, cancelRide);


module.exports = router;