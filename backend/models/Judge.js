const mongoose = require('mongoose');

const judgeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expertise: [String],
    experience: Number,
    currentRole: String,
    invitedHackathons: [{
        hackathon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hackathon'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        },
        invitedAt: {
            type: Date,
            default: Date.now
        }
    }],
    requestedHackathons: [{
        hackathon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hackathon'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        },
        requestedAt: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('Judge', judgeSchema); 