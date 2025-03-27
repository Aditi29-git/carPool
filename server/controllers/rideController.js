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
        const userId = req.user._id;

        // Build a dynamic query object based on the filters provided
        const query = {
            status: { $in: ['available', 'started'] },  // Show both available and started rides
            availableSeats: { $gt: 0 } // Only show rides with available seats
        };

        // Add origin and destination filters if provided
        if (origin) query.origin = new RegExp(origin, 'i');
        if (destination) query.destination = new RegExp(destination, 'i');

        // Add date filter if provided
        if (date) {
            const searchDate = new Date(date);
            const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
            query.date = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        // Update seats filter
        if (minSeats) {
            query.availableSeats = { $gte: parseInt(minSeats, 10) };
        }

        console.log('Query:', JSON.stringify(query, null, 2));

        // Fetch rides based on the query
        const rides = await Ride.find(query)
            .populate('rider', 'name email phoneNumber')
            .populate('passengers', 'name email')
            .sort({ date: 1, startingTime: 1 });

        console.log('Found rides:', rides.length);

        // If no rides are found, send a response
        if (!rides || rides.length === 0) {
            return res.status(404).json({ message: "No rides found matching your criteria." });
        }

        // Get rider IDs to fetch their average ratings
        const riderIds = [...new Set(rides.map(ride => ride.rider._id.toString()))];
        
        // Fetch all rides by these riders to calculate their average ratings
        const riderRides = await Ride.find({
            rider: { $in: riderIds },
            status: 'completed',
            'ratings.0': { $exists: true } // Only rides with at least one rating
        });
        
        // Calculate average rating for each rider
        const riderRatings = {};
        riderIds.forEach(riderId => {
            const riderCompletedRides = riderRides.filter(r => r.rider.toString() === riderId);
            if (riderCompletedRides.length > 0) {
                // Flatten all ratings from all rides
                const allRatings = riderCompletedRides.flatMap(r => r.ratings.map(rating => rating.rating));
                const avgRating = allRatings.length > 0 
                    ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length 
                    : 0;
                const totalRatings = allRatings.length;
                
                riderRatings[riderId] = { 
                    averageRating: avgRating,
                    totalRatings: totalRatings
                };
            } else {
                riderRatings[riderId] = { averageRating: 0, totalRatings: 0 };
            }
        });

        // Format the rides data and add booking status for the current user
        const formattedRides = rides.map(ride => {
            const rideObj = ride.toObject();
            const riderId = ride.rider._id.toString();
            
            // Find the user's booking details
            const userBooking = ride.passengerBookings.find(booking => 
                booking.passenger && booking.passenger.toString() === userId.toString()
            );
            
            const userHasBooked = !!userBooking;
            const seatsBookedByUser = userBooking ? userBooking.seatsBooked || 0 : 0;
            const isRider = riderId === userId.toString();

            // Add rider rating information
            const riderRating = riderRatings[riderId] || { averageRating: 0, totalRatings: 0 };

            return {
                ...rideObj,
                startingTime: ride.startingTime || ride.time,
                time: ride.startingTime || ride.time,
                userHasBooked,
                seatsBookedByUser,
                isRider,
                totalAvailableSeats: ride.availableSeats,
                totalSeats: ride.availableSeats + seatsBookedByUser,
                status: ride.status,
                riderRating: riderRating.averageRating,
                riderTotalRatings: riderRating.totalRatings
            };
        });

        // Sort rides by rider rating (highest first)
        formattedRides.sort((a, b) => b.riderRating - a.riderRating);

        return res.status(200).json({ 
            message: "Available rides fetched successfully.", 
            rides: formattedRides 
        });
    } catch (error) {
        console.error("Error fetching available rides:", error);
        return res.status(500).json({ 
            message: "Error fetching available rides.", 
            error: error.message 
        });
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

        // Update the ride details
        ride.availableSeats -= seatsToBook;

        // If user hasn't booked before, add them as a passenger
        if (!ride.passengers.includes(req.user._id)) {
            ride.passengers.push(req.user._id);
            ride.passengerBookings.push({
                passenger: req.user._id,
                bookingTime: new Date(),
                seatsBooked: seatsToBook
            });
        } else {
            // If user has already booked, update their seats count
            const bookingIndex = ride.passengerBookings.findIndex(
                booking => booking.passenger.toString() === req.user._id.toString()
            );
            if (bookingIndex !== -1) {
                ride.passengerBookings[bookingIndex].seatsBooked += seatsToBook;
            }
        }

        // Keep status as 'available' so the rider can start the ride
        ride.status = 'available';

        // Save ride
        await ride.save();

        // Populate rider and passenger details
        const updatedRide = await Ride.findById(rideId)
            .populate('rider', 'name email phoneNumber')
            .populate('passengers', 'name email phoneNumber')
            .populate('passengerBookings');

        // Send email confirmation
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: req.user.email,
            subject: 'Ride Booking Confirmation',
            html: `
                <p>Your ride from ${ride.origin} to ${ride.destination} has been booked successfully.</p>
                <p>Number of seats booked: ${seatsToBook}</p>
                <p>Total seats you have on this ride: ${
                    ride.passengerBookings.find(b => b.passenger.toString() === req.user._id.toString())?.seatsBooked || seatsToBook
                }</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error("Email sending error:", emailError);
        }

        return res.status(200).json({
            message: "Ride booked successfully. A confirmation email has been sent to you.",
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

        // Check if ride is already completed or cancelled
        if (ride.status === 'completed') {
            return res.status(400).json({ 
                success: false,
                message: "Ride is already completed" 
            });
        }

        if (ride.status === 'cancelled') {
            return res.status(400).json({ 
                success: false,
                message: "Cancelled rides cannot be completed" 
            });
        }

        // Check if ride has been started
        if (ride.status !== 'started') {
            return res.status(400).json({
                success: false,
                message: "Ride must be started before it can be completed"
            });
        }

        const currentTime = new Date();
        const startTime = new Date(ride.actualStartTime || ride.startingTime);
        const expectedEndTime = new Date(ride.expectedTime);

        // Calculate journey progress
        const totalDurationMs = expectedEndTime - startTime;
        const elapsedTimeMs = currentTime - startTime;
        const progressPercentage = (elapsedTimeMs / totalDurationMs) * 100;

        // Allow completion if at least 70% of the journey is complete
        if (progressPercentage < 70) {
            return res.status(400).json({
                success: false,
                message: "Ride cannot be completed yet. At least 70% of the journey time must be completed.",
                journeyDetails: {
                    progressPercentage: Math.round(progressPercentage),
                    startTime,
                    expectedEndTime,
                    currentTime,
                    totalDuration: `${Math.ceil(totalDurationMs / 60000)} minutes`,
                    elapsedTime: `${Math.ceil(elapsedTimeMs / 60000)} minutes`,
                    timeRemaining: `${Math.ceil((expectedEndTime - currentTime) / 60000)} minutes`
                }
            });
        }

        // Update ride status
        ride.status = 'completed';
        ride.actualEndTime = currentTime;
        await ride.save();

        // Send feedback request
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
                actualDuration: `${Math.ceil(elapsedTimeMs / 60000)} minutes`,
                progressPercentage: Math.round(progressPercentage)
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

        // Find the ride
        const ride = await Ride.findById(rideId)
            .populate('passengers', 'name email');

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        // Verify that the current user is the rider
        if (ride.rider.toString() !== riderId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the ride creator can start this ride"
            });
        }

        // Check if the ride has any passengers
        if (!ride.passengers || ride.passengers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot start ride without any passengers"
            });
        }

        // Check ride status
        if (ride.status === 'started') {
            return res.status(400).json({
                success: false,
                message: "Ride has already been started"
            });
        }

        if (ride.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: "Cannot start a completed ride"
            });
        }

        if (ride.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Cannot start a cancelled ride"
            });
        }

        // Check if it's too early to start the ride
        const now = new Date();
        const scheduledStartTime = new Date(ride.startingTime);

        if (now < scheduledStartTime) {
            const timeUntilStart = Math.ceil((scheduledStartTime - now) / 60000);
            return res.status(400).json({
                success: false,
                message: `Cannot start ride before scheduled time. Please wait ${timeUntilStart} minutes.`
            });
        }

        // Calculate delay if any
        const delay = now > scheduledStartTime ? now.getTime() - scheduledStartTime.getTime() : 0;
        const delayInMinutes = Math.floor(delay / 60000);

        // Update ride status and times
        ride.status = 'started';
        ride.actualStartTime = now;

        // If started late, adjust the expected end time
        const originalExpectedTime = new Date(ride.expectedTime);
        if (delay > 0) {
            ride.expectedTime = new Date(originalExpectedTime.getTime() + delay);
            ride.delayInMinutes = delayInMinutes;
        }

        await ride.save();

        // Send email notifications to all passengers
        const passengers = ride.passengers;
        if (passengers && passengers.length > 0) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                subject: 'Your Ride Has Started',
                html: `
                    <h2>Your ride has started</h2>
                    <p>Your ride from ${ride.origin} to ${ride.destination} has begun.</p>
                    <p>Scheduled Start Time: ${scheduledStartTime.toLocaleString()}</p>
                    <p>Actual Start Time: ${now.toLocaleString()}</p>
                    ${delay > 0 ? `<p>Delay: ${delayInMinutes} minutes</p>` : ''}
                    <p>Updated Expected Arrival: ${new Date(ride.expectedTime).toLocaleString()}</p>
                    <p>Driver Details:</p>
                    <p>Name: ${req.user.name}</p>
                    <p>Phone: ${req.user.phoneNumber}</p>
                `
            };

            for (const passenger of passengers) {
                if (passenger.email) {
                    mailOptions.to = passenger.email;
                    try {
                        await transporter.sendMail(mailOptions);
                    } catch (emailError) {
                        console.error("Error sending email to passenger:", emailError);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Ride started successfully",
            ride: {
                ...ride.toObject(),
                scheduledStartTime: scheduledStartTime,
                delayInMinutes: delayInMinutes,
                actualStartTime: now,
                adjustedExpectedTime: ride.expectedTime
            }
        });

    } catch (error) {
        console.error("Error starting ride:", error);
        return res.status(500).json({
            success: false,
            message: "Error starting ride",
            error: error.message
        });
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
        .populate('passengerPayments.passenger', 'name email phoneNumber')
        .populate('ratings.passenger', 'name')
        .sort({ date: -1 }); // Sort by date, most recent first

        // Map over the bookings to modify the status for the user's view
        const modifiedBookings = bookings.map(booking => {
            const bookingObj = booking.toObject();
            
            // Find the current user's payment record
            const userPayment = bookingObj.passengerPayments.find(
                payment => payment.passenger?._id.toString() === req.user._id.toString()
            );

            // Find the user's booking details including booking time
            const userBooking = booking.passengerBookings.find(
                booking => booking.passenger.toString() === req.user._id.toString()
            );

            // Find the user's rating if it exists
            const userRating = booking.ratings?.find(
                rating => rating.passenger?._id.toString() === req.user._id.toString()
            );

            // Add user's rating and feedback to the booking object
            if (userRating) {
                bookingObj.userRating = userRating.rating;
                bookingObj.userFeedback = userRating.feedback;
                bookingObj.ratingSubmittedAt = userRating.createdAt;
            }

            // Calculate average rating and total ratings
            if (booking.ratings && booking.ratings.length > 0) {
                bookingObj.averageRating = booking.ratings.reduce((sum, r) => sum + r.rating, 0) / booking.ratings.length;
                bookingObj.totalRatings = booking.ratings.length;
            }

            // Calculate if the booking is within the cancellation window (3 minutes)
            const bookingTime = userBooking ? new Date(userBooking.bookingTime) : null;
            const currentTime = new Date();
            const timeDifferenceInMinutes = bookingTime ? (currentTime - bookingTime) / (1000 * 60) : null;
            const canCancel = bookingTime && timeDifferenceInMinutes <= 3 && bookingObj.status !== 'completed' && bookingObj.status !== 'cancelled';

            // If the user is a passenger, show appropriate status
            if (bookingObj.passengers.some(passenger => passenger._id.toString() === req.user._id.toString())) {
                // For completed rides, show payment status for this specific user
                if (bookingObj.status === 'completed') {
                    bookingObj.displayStatus = userPayment?.paymentStatus === 'completed' ? 'Payment Completed' : 'Payment Pending';
                    bookingObj.paymentDetails = {
                        amount: bookingObj.pricePerSeat,
                        paidAmount: userPayment?.paidAmount,
                        paidAt: userPayment?.paidAt,
                        paymentId: userPayment?.paymentId
                    };
                }
                // For available rides that user has booked, show as upcoming
                else if (bookingObj.status === 'available') {
                    const now = new Date();
                    const startTime = new Date(bookingObj.startingTime);
                    
                    if (startTime > now) {
                        bookingObj.displayStatus = 'Upcoming';
                    } else {
                        bookingObj.displayStatus = 'Waiting to Start';
                    }
                }
                // For other statuses (started, cancelled)
                else {
                    bookingObj.displayStatus = bookingObj.status.charAt(0).toUpperCase() + bookingObj.status.slice(1);
                }
            }

            // Add booking time and cancellation information
            bookingObj.bookingTime = bookingTime;
            bookingObj.canCancel = canCancel;
            bookingObj.minutesSinceBooking = timeDifferenceInMinutes;

            // Remove sensitive payment information of other passengers
            bookingObj.passengerPayments = undefined;
            
            // Only show the current user's passenger information
            bookingObj.passengers = bookingObj.passengers.filter(
                passenger => passenger._id.toString() === req.user._id.toString()
            );
            
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

        // If user is a passenger, check the 3-minute cancellation window
        if (isPassenger && !isRider) {
            const booking = ride.passengerBookings.find(
                booking => booking.passenger.toString() === userId.toString()
            );

            if (!booking) {
                return res.status(400).json({
                    success: false,
                    message: "Booking information not found"
                });
            }

            const bookingTime = new Date(booking.bookingTime);
            const currentTime = new Date();
            const timeDifferenceInMinutes = (currentTime - bookingTime) / (1000 * 60);

            if (timeDifferenceInMinutes > 3) {
                return res.status(400).json({
                    success: false,
                    message: "Rides can only be cancelled within 3 minutes of booking"
                });
            }
        }

        // Update ride status
        if (isRider) {
            // If rider cancels, cancel the entire ride
            ride.status = 'cancelled';
        } else {
            // If passenger cancels, just remove them from the ride
            ride.passengers = ride.passengers.filter(
                passenger => passenger.toString() !== userId.toString()
            );
            ride.passengerBookings = ride.passengerBookings.filter(
                booking => booking.passenger.toString() !== userId.toString()
            );
            ride.availableSeats += 1;
        }

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

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { paymentId, amount } = req.body;
        const userId = req.user._id;

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        // Verify that the user is a passenger of this ride
        if (!ride.passengers.some(passenger => passenger.toString() === userId.toString())) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this ride's payment status"
            });
        }

        // Calculate the amount this passenger should pay (one seat)
        const passengerAmount = ride.pricePerSeat;

        // Update or create payment record for this passenger
        const paymentIndex = ride.passengerPayments.findIndex(
            payment => payment.passenger.toString() === userId.toString()
        );

        if (paymentIndex === -1) {
            // Add new payment record
            ride.passengerPayments.push({
                passenger: userId,
                paymentStatus: 'completed',
                paymentId,
                paidAmount: passengerAmount,
                paidAt: new Date()
            });
        } else {
            // Update existing payment record
            ride.passengerPayments[paymentIndex] = {
                ...ride.passengerPayments[paymentIndex],
                paymentStatus: 'completed',
                paymentId,
                paidAmount: passengerAmount,
                paidAt: new Date()
            };
        }

        // Check if all passengers have paid
        const allPaid = ride.passengers.every(passengerId => 
            ride.passengerPayments.some(
                payment => 
                    payment.passenger.toString() === passengerId.toString() && 
                    payment.paymentStatus === 'completed'
            )
        );

        // Update overall ride payment status if all passengers have paid
        if (allPaid) {
            ride.paymentStatus = 'completed';
        }

        await ride.save();

        // Send email notification to rider
        const rider = await User.findById(ride.rider, 'email');
        if (rider && rider.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: rider.email,
                subject: 'Payment Received',
                html: `
                    <h2>Payment Received</h2>
                    <p>Payment has been received for your ride from ${ride.origin} to ${ride.destination}.</p>
                    <p>Passenger: ${req.user.name}</p>
                    <p>Amount: ₹${passengerAmount}</p>
                    <p>Payment ID: ${paymentId}</p>
                    ${allPaid ? '<p><strong>All passengers have completed their payments!</strong></p>' : ''}
                `
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("Email sending error:", emailError);
            }
        }

        res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            ride
        });

    } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(500).json({
            success: false,
            message: "Error updating payment status",
            error: error.message
        });
    }
};

exports.fetchMyRides = async (req, res) => {
    try {
        // Find all rides where the current user is the rider
        const rides = await Ride.find({
            rider: req.user._id
        })
        .populate('rider', 'name email phoneNumber')
        .populate('passengers', 'name email phoneNumber')
        .populate('passengerPayments.passenger', 'name email phoneNumber')
        .populate('ratings.passenger', 'name email')
        .sort({ date: -1 }); // Sort by date, most recent first

        // Map over the rides to add display status and payment details
        const modifiedRides = rides.map(ride => {
            const rideObj = ride.toObject();
            
            // Add display status for payment
            if (rideObj.status === 'completed') {
                // Calculate total earnings and received payments
                const totalPotentialEarnings = rideObj.pricePerSeat * (rideObj.passengers?.length || 0);
                const receivedPayments = rideObj.passengerPayments.reduce((sum, payment) => 
                    payment.paymentStatus === 'completed' ? sum + (payment.paidAmount || rideObj.pricePerSeat) : sum, 0
                );

                rideObj.displayStatus = `Payments Received: ₹${receivedPayments} of ₹${totalPotentialEarnings}`;
                rideObj.totalEarnings = totalPotentialEarnings;
                rideObj.receivedPayments = receivedPayments;
                
                // Add payment status for each passenger
                rideObj.passengerPayments = rideObj.passengers.map(passenger => {
                    const paymentRecord = rideObj.passengerPayments.find(
                        payment => payment.passenger?._id.toString() === passenger._id.toString()
                    );
                    
                    // Find the passenger's rating if it exists
                    const passengerRating = ride.ratings?.find(
                        rating => rating.passenger?._id.toString() === passenger._id.toString()
                    );

                    return {
                        passenger: {
                            id: passenger._id,
                            name: passenger.name,
                            email: passenger.email,
                            phoneNumber: passenger.phoneNumber
                        },
                        paymentStatus: paymentRecord?.paymentStatus || 'pending',
                        amount: rideObj.pricePerSeat,
                        paidAmount: paymentRecord?.paidAmount,
                        paidAt: paymentRecord?.paidAt,
                        paymentId: paymentRecord?.paymentId,
                        rating: passengerRating ? {
                            rating: passengerRating.rating,
                            feedback: passengerRating.feedback,
                            createdAt: passengerRating.createdAt
                        } : null
                    };
                });

                // Calculate average rating and total ratings
                if (ride.ratings && ride.ratings.length > 0) {
                    rideObj.averageRating = ride.ratings.reduce((sum, r) => sum + r.rating, 0) / ride.ratings.length;
                    rideObj.totalRatings = ride.ratings.length;
                }
            } else {
                rideObj.displayStatus = rideObj.status.charAt(0).toUpperCase() + rideObj.status.slice(1);
            }

            // Add passenger count
            rideObj.passengerCount = rideObj.passengers?.length || 0;
            
            return rideObj;
        });

        if (!rides.length) {
            return res.status(404).json({ message: "No rides found" });
        }

        return res.status(200).json({
            success: true,
            message: "Rides fetched successfully",
            rides: modifiedRides,
            summary: {
                totalRides: modifiedRides.length,
                completedRides: modifiedRides.filter(r => r.status === 'completed').length,
                totalPotentialEarnings: modifiedRides.reduce((sum, ride) => 
                    sum + (ride.totalEarnings || 0), 0
                ),
                actualEarnings: modifiedRides.reduce((sum, ride) => 
                    sum + (ride.receivedPayments || 0), 0
                )
            }
        });
    } catch (error) {
        console.error("Error fetching rides:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching rides",
            error: error.message
        });
    }
};

// Rate a ride
exports.rateRide = async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        const { rideId } = req.params;
        const userId = req.user._id;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Find the ride
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'Ride not found'
            });
        }

        // Check if the ride is completed
        if (ride.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only rate completed rides'
            });
        }

        // Check if user was a passenger
        const isPassenger = ride.passengers.some(passengerId => 
            passengerId.toString() === userId.toString()
        );
        
        if (!isPassenger) {
            return res.status(403).json({
                success: false,
                message: 'Only passengers can rate the ride'
            });
        }

        // Check if the user has already submitted a rating
        const existingRatingIndex = ride.ratings.findIndex(r => 
            r.passenger.toString() === userId.toString()
        );

        if (existingRatingIndex !== -1) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted a rating for this ride'
            });
        }

        // Add rating
        ride.ratings.push({
            passenger: userId,
            rating,
            feedback,
            createdAt: new Date()
        });

        await ride.save();

        // Calculate average rating
        const averageRating = ride.ratings.reduce((sum, r) => sum + r.rating, 0) / ride.ratings.length;

        return res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            data: {
                averageRating,
                totalRatings: ride.ratings.length
            }
        });
    } catch (error) {
        console.error('Error submitting rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Error submitting rating',
            error: error.message
        });
    }
};








