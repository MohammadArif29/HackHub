const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const ejs = require('ejs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const profileRoutes = require('./routes/profile');
const judgeApiRoutes = require('./routes/judge-api');
const organizerApiRoutes = require('./routes/organizer-api');
const participantApiRoutes = require('./routes/participant-api');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// View engine setup
app.set('views', path.join(__dirname, '../frontend/views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'dashboard/layout');

// Serve static files
app.use('/', express.static(path.join(__dirname, '../frontend')));
app.use('/pages', express.static(path.join(__dirname, '../frontend/pages')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Auth middleware for dashboard
const authMiddleware = (req, res, next) => {
    try {
        let token;
        
        // Check for token in different places
        if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.token) {
            token = req.cookies.token;
        } else if (req.body.token) {
            token = req.body.token;
        }

        if (!token) {
            return res.redirect('/pages/login.html');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
        // Set cookie if it doesn't exist
        if (!req.cookies.token) {
            res.cookie('token', token, { 
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
        }
        
        next();
    } catch (error) {
        console.error('Auth Error:', error);
        res.redirect('/pages/login.html');
    }
};

// Protected dashboard routes
app.use('/dashboard', authMiddleware, require('./routes/dashboard'));

// Add this with your other routes
app.use('/api/hackathons', require('./routes/hackathons'));

// Profile routes
app.use('/profile', profileRoutes);

// Judge API routes
app.use('/api/judge', judgeApiRoutes);

// Organizer API routes
app.use('/api/organizer', organizerApiRoutes);

// Participant API routes
app.use('/api/participant', participantApiRoutes);

// Catch-all route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 