const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = 'hello123';
const JWT_EXPIRES_IN = '24h';
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'carpool345@gmail.com',
        pass: 'vubn tasn olbp wtyo'
    }
});

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const OTP_EXPIRATION_TIME = 2 * 60 * 1000;

exports.sendOTP = async (req, res) => {
    try {
        const { formData } = req.body;
        console.log(formData)
        const { name, email, password, phoneNumber,role } = formData;
        const validRoles = ["user", "admin", "rider"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role specified" });
        }
        const user = await User.findOne({ email });
        console.log(user);
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const otp = generateOTP();
        console.log(otp);
        const hashedPassword = await bcrypt.hash(password, 10);
        const expirationTime = Date.now() + OTP_EXPIRATION_TIME;

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            otp,
            isVerified: false,
            otpExpiration: expirationTime,
            role,
        });

        await newUser.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It will expire in 2 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: "OTP sent to email", email });
    } catch (error) {
        console.error("Error sending OTP:", error);
        return res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { Email, otp } = req.body;
        console.log(Email, otp);
        if (!Email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        const user = await User.findOne({email:Email });
        console.log('ye rha user:',user);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        console.log('before verifying otp');
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }
        console.log('after verifying otp');

        if (Date.now() > user.otpExpiration) {
            return res.status(400).json({ message: 'OTP has expired.' });
        }
        console.log('before saving user');
        console.log(user);
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiration = undefined;
        await user.save();
        console.log('user saved successfully');
        return res.status(200).json({ message: 'OTP verified successfully. User is now registered.' });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ message: 'Failed to verify OTP. Please try again.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        if(user.isVerified === false) {
            return res.status(400).json({ message: "User is not verified" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const payload = {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.cookie('token', token, {
            httpOnly: false,
            sameSite: 'None',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({ message: "Login successful", token, role: user.role });
    } catch (error) {
        console.error("Error logging in:", error);
        return res.status(500).json({ message: "Error logging in", error: error.message });
    }
};

exports.logout = async (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error("Error logging out:", error);
        return res.status(500).json({ message: "Error logging out", error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(token);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'carpool345@gmail.com',
                pass: 'vubn tasn olbp wtyo'
            },
        });

        const resetLink = `http://localhost:3000/reset-password/${token}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset',
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password</p>`,
        });

        res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending email' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message: "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'Invalid token' });
        }


        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        console.log(password)

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password' });
    }
};