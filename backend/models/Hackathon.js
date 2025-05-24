const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    registrationDeadline: {
        type: Date,
        required: true
    },
    maxParticipants: {
        type: Number,
        required: true
    },
    prizePool: {
        type: Number,
        required: true
    },
    tags: [{
        type: String
    }],
    rules: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'completed'],
        default: 'active'
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    judges: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    submissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Submission'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Hackathon', hackathonSchema); 