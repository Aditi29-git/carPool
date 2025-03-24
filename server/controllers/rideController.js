const Ride = require('../models/rideModel');
const User = require('../models/user');
const nodemailer = require('nodemailer');
const { sendFeedbackRequest } = require('./feedbackController');
require('dotenv').config();


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.createRide = async (req, res) => {
    try {
        // Ensure the user is a rider
        console.log(req.user._id);
        if (req.user.role !== 'rider') {
            return res.status(403).json({ message: "Only riders are allowed to create rides" });
        }

        // Extract ride details from the request body
        const { origin, destination, date, startingTime, expectedTime, availableSeats, pricePerSeat } = req.body;
        const riderId = req.user._id;

        // Validate the required fields
        if (!origin || !destination || !date || !availableSeats || !pricePerSeat) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (availableSeats < 1) {
            return res.status(400).json({ message: "Available seats must be at least 1" });
        }

        if (pricePerSeat < 0) {
            return res.status(400).json({ message: "Price per seat cannot be negative" });
        }

        const startTime = new Date(startingTime);
        const endTime = new Date(expectedTime);
        const currentTime = new Date();
        console.log("currentTime:", currentTime);


        if (startTime < currentTime) {
            return res.status(400).json({ message: "Start time cannot be in the past" });
        }

        if (endTime <= startTime) {
            return res.status(400).json({ message: "Expected time must be after the starting time" });
        }

        // Create a new ride
        const ride = new Ride({
            origin,
            destination,
            date,
            startingTime,
            expectedTime,
            availableSeats,
            pricePerSeat,
            rider: riderId, // Set the logged-in user as the driver
        });
        console.log("rider id:", riderId);
        console.log(ride);
        // Save the ride to the database
        const savedRide = await ride.save();

        // Return the created ride
        res.status(201).json({ message: "Ride created successfully", ride: savedRide, duration: `${Math.round((endTime - startTime) / (1000 * 60))} minutes`, currentTime });
    } catch (error) {
        console.error("Error creating ride:", error);
        res.status(500).json({ message: "Error creating ride", error: error.message });
    }
};


exports.fetchAvailableRides = async (req, res) => {
    try {
        const { origin, destination, date, minSeats } = req.body;

        // Build a dynamic query object based on the filters provided
        const query = {
            status: 'available',
        };

        if (origin) query.origin = new RegExp(origin, 'i');  // Remove exact match requirement
        if (destination) query.destination = new RegExp(destination, 'i');  // Remove exact match requirement
        if (date) {
            // Create start and end of the selected date
            const searchDate = new Date(date);
            const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
            query.date = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
        if (minSeats) query.availableSeats = { $gte: parseInt(minSeats, 10) };

        // Fetch rides based on the query
        const rides = await Ride.find(query)
            .populate('rider', 'name email phoneNumber')
            .populate('passengers', 'name email')
            .sort({ date: 1, time: 1 });

        // If no rides are found, send a response
        if (!rides.length) {
            return res.status(404).json({ message: "No rides found matching your criteria." });
        }

        return res.status(200).json({ message: "Available rides fetched successfully.", rides });
    } catch (error) {
        console.error("Error fetching available rides:", error);
        return res.status(500).json({ message: "Error fetching available rides.", error: error.message });
    }
};



exports.bookRide = async (req, res) => {
    try {
        console.log("booking started")
        const { rideId, seatsToBook } = req.body;

        // Validate 
        if (!rideId || !seatsToBook) {
            return res.status(400).json({ message: "Ride ID and number of seats to book are required." });
        }

        if (seatsToBook < 1) {
            return res.status(400).json({ message: "You must book at least one seat." });
        }

        // Fetch
        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({ message: "Ride not found." });
        }

        // Check if the ride is available and has enough seats
        if (ride.status !== 'available') {
            return res.status(400).json({ message: "This ride is not available for booking." });
        }

        if (ride.availableSeats < seatsToBook) {
            return res.status(400).json({ message: "Not enough available seats." });
        }

        // Check if the user is already a passenger
        if (ride.passengers.includes(req.user._id)) {
            return res.status(400).json({ message: "You have already booked this ride." });
        }

        // Update the ride details
        ride.availableSeats -= seatsToBook;
        ride.passengers.push(req.user._id);

        // Change status if the ride is fully booked
        if (ride.availableSeats === 0) {
            ride.status = 'booked';
        }

        // Save ride
        await ride.save();

        //  populate rider and passenger
        const updatedRide = await Ride.findById(rideId)
            .populate('rider', 'name email phoneNumber')
            .populate('passengers', 'name email phoneNumber');


        const passengers = await User.find({ _id: { $in: ride.passengers } }, 'email');
        const emails = passengers.map(passenger => passenger.email).filter(email => email);
        console.log("emails:", emails);
        console.log("ride.passengers:", ride.passengers);

        if (emails.length) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: emails,
                subject: 'Ride Booking Confirmation',
                html: `<p>Your ride from ${ride.origin} to ${ride.destination} has been booked successfully.</p>`
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("Email sending error:", emailError);
            }
        }

        return res.status(200).json({
            message: "Ride booked successfully.A confirmation email has been sent to you.",
            ride: updatedRide,
        });
    } catch (error) {
        console.error("Error booking ride:", error);
        return res.status(500).json({
            message: "Error booking ride.",
            error: error.message,
        });
    }
};


exports.completeRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const riderId = req.user._id;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        // Verify that only the rider who created the ride can complete it
        if (ride.rider.toString() !== riderId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the ride creator can complete this ride"
            });
        }

        // if (ride.status !== 'booked') {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Only booked rides can be marked as completed"
        //     });
        // }

        // if (ride.status === 'completed') {
        //     return res.status(400).json({ message: "Ride is already completed" });
        // }
        if (ride.status === 'cancelled') {
            return res.status(400).json({ message: "Cancelled rides cannot be completed" });
        }

        const currentTime = new Date();
        const startTime = new Date(ride.startingTime);
        const expectedEndTime = new Date(ride.expectedTime);

        if (currentTime < startTime) {
            return res.status(400).json({
                message: "Ride has not started yet. It can only be completed after 70% of the journey is over.",
                journeyDetails: {
                    startTime,
                    expectedEndTime,
                    currentTime
                }
            });
        }

        const totalDurationMs = expectedEndTime - startTime;
        const completionThreshold = startTime.getTime() + 0.7 * totalDurationMs;

        if (currentTime < completionThreshold) {
            return res.status(400).json({
                message: "Ride cannot be completed yet. At least 70% of the journey time must be completed.",
                journeyDetails: {
                    startTime,
                    expectedEndTime,
                    currentTime,
                    totalDuration: `${Math.ceil(totalDurationMs / 60000)} minutes`,
                    requiredCompletionTime: new Date(completionThreshold),
                    timeRemaining: `${Math.ceil((completionThreshold - currentTime) / 60000)} minutes left`
                }
            });
        }

        ride.status = 'completed';
        ride.actualEndTime = currentTime;
        await ride.save();
        const rider = await User.findById(ride.rider, 'email');
        await sendFeedbackRequest(rideId);

        res.status(200).json({
            success: true,
            message: "Ride marked as completed successfully",
            rideDetails: {
                rideId: ride._id,
                origin: ride.origin,
                destination: ride.destination,
                startTime,
                expectedEndTime,
                actualEndTime: currentTime,
                totalDuration: `${Math.ceil(totalDurationMs / 60000)} minutes`,
            }
        });

    } catch (error) {
        console.error('Error in completeRide:', error);
        res.status(500).json({
            success: false,
            message: "Error completing ride",
            error: error.message
        });
    }
};

exports.startRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const riderId = req.user._id;

        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ success: false, message: "Ride not found" });
        }

        // Ensure only the ride creator can start the ride
        if (ride.rider.toString() !== riderId.toString()) {
            return res.status(403).json({ success: false, message: "Only the ride creator can start this ride" });
        }

        // Prevent starting a cancelled or completed ride
        if (ride.status === 'completed') {
            return res.status(400).json({ success: false, message: "Ride is already completed" });
        }
        if (ride.status === 'cancelled') {
            return res.status(400).json({ success: false, message: "Cancelled rides cannot be started" });
        }
        if (ride.status === 'started') {
            return res.status(400).json({ success: false, message: "Ride has already started" });
        }

        const currentTime = new Date();
        const startTime = new Date(ride.startingTime);
        let expectedEndTime = new Date(ride.expectedTime);

        // Prevent starting the ride before its starting time
        if (currentTime < startTime) {
            return res.status(400).json({
                success: false,
                message: "Ride cannot be started before the scheduled starting time.",
                rideDetails: { startTime, expectedEndTime, currentTime }
            });
        }

        // If rider starts late, adjust expected end time accordingly
        if (currentTime > startTime) {
            const delay = currentTime - startTime;
            expectedEndTime = new Date(expectedEndTime.getTime() + delay);
        }

        // Update ride status and expected end time
        ride.status = 'started';
        ride.startingTime = currentTime;
        ride.expectedTime = expectedEndTime;
        await ride.save();

        res.status(200).json({
            success: true,
            message: "Ride has started successfully",
            rideDetails: {
                rideId: ride._id,
                origin: ride.origin,
                destination: ride.destination,
                newStartTime: currentTime,
                newExpectedEndTime: expectedEndTime,
                delay: currentTime > startTime ? `${Math.ceil((currentTime - startTime) / 60000)} minutes` : "No delay"
            }
        });

    } catch (error) {
        console.error('Error in startRide:', error);
        res.status(500).json({ success: false, message: "Error starting ride", error: error.message });
    }
};

exports.fetchMyBookings = async (req, res) => {
    try {
        // Find all rides where the current user is in the passengers array
        const bookings = await Ride.find({
            passengers: req.user._id
        })
        .populate('rider', 'name email phoneNumber')
        .populate('passengers', 'name email phoneNumber')
        .sort({ date: -1 }); // Sort by date, most recent first

        // Map over the bookings to modify the status for the user's view
        const modifiedBookings = bookings.map(booking => {
            const bookingObj = booking.toObject();
            // If the user is a passenger, show as 'booked' unless completed/cancelled
            if (bookingObj.passengers.some(passenger => passenger._id.toString() === req.user._id.toString())) {
                if (bookingObj.status === 'available') {
                    bookingObj.status = 'booked';
                }
            }
            return bookingObj;
        });

        if (!bookings.length) {
            return res.status(404).json({ message: "No bookings found" });
        }

        return res.status(200).json({
            success: true,
            message: "Bookings fetched successfully",
            bookings: modifiedBookings
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching bookings",
            error: error.message
        });
    }
};

exports.cancelRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const userId = req.user._id;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        // Check if the user is either the rider or a passenger
        const isRider = ride.rider.toString() === userId.toString();
        const isPassenger = ride.passengers.some(passenger => passenger.toString() === userId.toString());

        if (!isRider && !isPassenger) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to cancel this ride"
            });
        }

        // Cannot cancel if ride is already completed or cancelled
        if (ride.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a completed ride"
            });
        }

        if (ride.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Ride is already cancelled"
            });
        }

        // Update ride status
        ride.status = 'cancelled';
        await ride.save();

        // Send email notifications to all affected users
        const passengers = await User.find({ _id: { $in: ride.passengers } }, 'email');
        const emails = passengers.map(passenger => passenger.email).filter(email => email);

        if (emails.length) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: emails,
                subject: 'Ride Cancellation Notice',
                html: `<p>Your ride from ${ride.origin} to ${ride.destination} has been cancelled.</p>`
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("Email sending error:", emailError);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Ride cancelled successfully",
            ride
        });

    } catch (error) {
        console.error("Error cancelling ride:", error);
        return res.status(500).json({
            success: false,
            message: "Error cancelling ride",
            error: error.message
        });
    }
};








