const Razorpay = require('razorpay');
const crypto = require('crypto');
const Ride = require('../models/rideModel');
const User = require('../models/user');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
    try {
        const { amount, rideId } = req.body;
        const userId = req.user._id;

        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        // Verify user is a passenger of this ride
        if (!ride.passengers.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to make payment for this ride"
            });
        }

        if (ride.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: "Payment has already been completed for this ride"
            });
        }

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `receipt_${rideId}`,
            notes: {
                rideId: rideId,
                userId: userId.toString()
            }
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating payment order',
            error: error.message
        });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            rideId
        } = req.body;

        // Verify payment signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update ride payment status
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        ride.paymentStatus = 'completed';
        await ride.save();

        // Send email notification to rider
        const rider = await User.findById(ride.rider, 'email');
        if (rider && rider.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: rider.email,
                subject: 'Payment Received',
                html: `<p>Payment has been received for your ride from ${ride.origin} to ${ride.destination}.</p>`
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("Email sending error:", emailError);
            }
        }

        res.status(200).json({
            success: true,
            message: "Payment verified successfully"
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
}; 