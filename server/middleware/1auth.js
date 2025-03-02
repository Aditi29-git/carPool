const jwt = require('jsonwebtoken');
const User = require('../models/user'); 
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify user role
 * @param {string} role - The required role to access the route
 */
const verifyRole = (role) => {
    return async (req, res, next) => {
        try {
            // Extract token from headers
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: "Access denied. No token provided." });
            }

            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);

            // Find user from the database
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Check the user's role
            if (user.role !== role) {
                return res.status(403).json({ message: `Access forbidden. Requires ${role} role.` });
            }

            // Attach user info to request object and proceed
            req.user = user;
            next();
        } catch (error) {
            console.error("Error verifying role:", error);
            res.status(401).json({ message: "Invalid or expired token." });
        }
    };
};

const isRider = verifyRole('rider');
const isAdmin = verifyRole('admin');
const isUser = verifyRole('user');

module.exports = {
    isRider,
    isAdmin,
    isUser,
};
