const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    skills: [{
        type: String,
        trim: true
    }],
    bio: {
        type: String,
        required: true,
        trim: true
    },
    githubProfile: {
        type: String,
        trim: true,
    },
    linkedinProfile: {
        type: String,
        trim: true,
    },
    achievements: [{
        type: {
            type: String,
            enum: ['hackathon_win', 'submission', 'team_lead', 'first_place', 'popular_choice'],
        },
        hackathon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hackathon'
        },
        date: {
            type: Date,
            default: Date.now
        },
        description: String
    }],
    teams: [{
        name: String,
        hackathon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hackathon'
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant'
        }],
        isLeader: {
            type: Boolean,
            default: false
        },
        isRecruiting: {
            type: Boolean,
            default: false
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    submissions: [{
        hackathon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hackathon'
        },
        projectName: String,
        description: String,
        technologies: [String],
        githubLink: String,
        demoLink: String,
        screenshots: [String],
        submittedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['draft', 'submitted', 'reviewed'],
            default: 'draft'
        },
        score: Number,
        feedback: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Participant', participantSchema); 