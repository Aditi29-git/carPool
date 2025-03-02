const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    image: {
        type: String,
        default: "",
    },
    phoneNumber: {
        type: Number,
        default: 9999999999,
        required: true,
        unique: true
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ["user", "admin", "rider"],
        default: "user"
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpiration: {
        type: Date,
        default: null,
        index: { expires: 0 },
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model("User", userSchema);
