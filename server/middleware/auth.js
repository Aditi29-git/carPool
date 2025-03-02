// const jwt = require('jsonwebtoken');
// const secretKey = process.env.JWT_SECRET;

// exports.authenticateToken = async (req, res, next) => {
//     try {
//         console.log("into authentication");
//         const token = req.cookies.token;

//         console.log("Extracted token:", token);

//         if (!token) {
//             return res.status(401).json({ success: false, message: 'Token is missing' });
//         }

//         try {
//             const decoded = jwt.verify(token, secretKey);
//             console.log("decodedToken:", decoded);
//             req.user = decoded;
//             console.log("Decoded token:", req.user);
//             next();
//         } catch (err) {
//             console.error("Token verification error:", err);
//             return res.status(401).json({ success: false, message: 'Token is invalid' });
//         }

//     } catch (error) {
//         console.error("Error in authentication middleware:", error);
//         return res.status(500).json({ success: false, message: 'Something went wrong while validating the token' });
//     }
// };

// exports.verifyAdmin = (req, res, next) => {
//     if (req.user && req.user.role === 'admin') {
//         next();
//     } else {
//         return res.status(403).json({ message: 'Access denied, admin only' });
//     }
// };

// exports.verifyUser = (req, res, next) => {
//     if (req.user && req.user.role === 'user') {
//         next();
//     } else {
//         return res.status(403).json({ message: 'Access denied, user only' });
//     }
// };

// exports.verifyRider = (req, res, next) => {
//     if (req.user && req.user.role === 'rider') {
//         next();
//     } else {
//         return res.status(403).json({ message: 'Access denied, rider only' });
//     }
// };

const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
    try {
        console.log("Into authentication middleware");
        
        const token = req.cookies.token ;

        console.log("Extracted token:", token);

        if (!token) {
            return res.status(401).json({ success: false, message: 'Token is missing' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, secretKey);
            console.log("Decoded token:", decoded);

            req.user = decoded; // Attach user info to the request
            console.log("req.user:", req.user);
            next(); // Pass control to the next middleware
        } catch (err) {
            console.error("Token verification error:", err.message);
            return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
        }
    } catch (error) {
        console.error("Error in authentication middleware:", error.message);
        return res.status(500).json({ success: false, message: 'Server error during token validation' });
    }
};

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied, admin only' });
    }
};

// Middleware to verify user role
const verifyUser = (req, res, next) => {
    if (req.user?.role === 'user') {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied, user only' });
    }
};

// Middleware to verify rider role
const verifyRider = (req, res, next) => {
    if (req.user?.role === 'rider') {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied, rider only' });
    }
};

module.exports = {
    authenticateToken,
    verifyAdmin,
    verifyUser,
    verifyRider,
};
