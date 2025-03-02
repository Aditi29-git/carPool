const express = require('express');
const router = express.Router();
const { createRide } = require('../controllers/rideController');
const { fetchAvailableRides } = require('../controllers/rideController')
const { bookRide } = require('../controllers/rideController')
const { completeRide } = require('../controllers/rideController')
const { startRide } = require('../controllers/rideController')
const { authenticateToken, verifyRider, verifyUser } = require('../middleware/auth');

router.post('/ride', authenticateToken, verifyRider, createRide);
router.post('/fetch-rides', authenticateToken, verifyUser, fetchAvailableRides);
router.post('/book-rides', authenticateToken, verifyUser, bookRide);
router.get('/:rideId/complete', authenticateToken, verifyRider, completeRide);
router.put('/:rideId/start', authenticateToken, verifyRider, startRide);


module.exports = router;