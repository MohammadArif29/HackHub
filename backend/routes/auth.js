const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Judge = require('../models/Judge');
const bcrypt = require('bcryptjs');

// Register route
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, ...roleData } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create user
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            role
        });

        await user.save();

        // Create role-specific profile
        let roleProfile;
        switch (role) {
            case 'participant':
                roleProfile = new Participant({
                    user: user._id,
                    skills: roleData.skills,
                    bio: roleData.bio,
                    githubProfile: roleData.githubProfile,
                    linkedinProfile: roleData.linkedinProfile
                });
                break;
            case 'organizer':
                roleProfile = new Organizer({
                    user: user._id,
                    organization: roleData.organization,
                    position: roleData.position,
                    organizationWebsite: roleData.organizationWebsite
                });
                break;
            case 'judge':
                roleProfile = new Judge({
                    user: user._id,
                    expertise: roleData.expertise,
                    experience: roleData.experience,
                    currentRole: roleData.currentRole
                });
                break;
        }

        await roleProfile.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Send response
        res.status(201).json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            message: 'Registration successful'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log('Login attempt:', { email, role });

        // Find user and validate role
        const user = await User.findOne({ email });
        if (!user || user.role !== role) {
            return res.status(401).json({ message: 'Invalid credentials or role' });
        }

        // Validate password
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Send response
        res.json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

module.exports = router; 