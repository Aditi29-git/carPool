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
    },
    passengers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    status: {
        type: String,
        enum: ['available', 'booked', 'completed', 'cancelled','started'],
        default: 'available',
    },
    startingTime: {
        type: Date,
        required: true,
    },
    expectedTime: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Ride', rideSchema);