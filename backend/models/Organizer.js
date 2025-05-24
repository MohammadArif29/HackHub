const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organization: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    bio: {
        type: String,
        maxLength: 500
    },
    website: {
        type: String,
        trim: true
    },
    socialLinks: {
        linkedin: String,
        twitter: String,
        github: String
    },
    // Additional organizer-specific fields
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    organizationType: {
        type: String,
        enum: ['company', 'university', 'nonprofit', 'other'],
        default: 'other'
    },
    location: {
        city: String,
        country: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Organizer', organizerSchema); 