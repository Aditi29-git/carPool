const express = require('express');
const app = express();
const cookieParser = require("cookie-parser");
const cors = require('cors');

// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    exposedHeaders: ['*', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(cookieParser());

const userRoutes = require('./routes/userRoutes')
app.use('/api/auth', userRoutes);

const rideRoutes = require('./routes/rideRoutes');
app.use('/api/rides', rideRoutes);

const feedbackRoutes = require('./routes/feedbackRoutes');
app.use('/api', feedbackRoutes);

app.get('/', (req, res) => {
    res.send("Hello World");
});

const dbConnect = require('./config/database');
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
dbConnect();