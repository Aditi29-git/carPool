const mongoose = require('mongoose');
const rideSchema = new mongoose.Schema({
    origin: {
        type: String,
        required: true,
        trim: true,
    },
    destination: {
        type: String,
        required: true,
        trim: true,
    },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
    },
    availableSeats: {
        type: Number,
        required: true,
        min: 0,
    },
    pricePerSeat: {
        type: Number,
        required: true,
        min: 0,
    },
    rider: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    passengers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    status: {
        type: String,
        enum: ['available', 'booked', 'completed', 'cancelled', 'started'],
        default: 'available',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    startingTime: {
        type: Date,
        required: true,
    },
    expectedTime: {
        type: Date,
        required: true,
    },
    actualStartTime: {
        type: Date
    },
    actualEndTime: {
        type: Date
    },
    passengerPayments: [{
        passenger: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending'
        },
        paymentId: String,
        paidAmount: Number,
        paidAt: Date
    }],
    passengerBookings: [{
        passenger: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        bookingTime: {
            type: Date,
            default: Date.now
        },
        seatsBooked: {
            type: Number,
            default: 1
        }
    }],
    ratings: [{
        passenger: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        feedback: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Ride', rideSchema);