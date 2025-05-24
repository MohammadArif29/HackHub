const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const Participant = require('../models/Participant');
const Hackathon = require('../models/Hackathon');
const Submission = require('../models/Submission');
const Team = require('../models/Team');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads/screenshots/',
    filename: function(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Get participant dashboard stats
router.get('/stats', auth, async (req, res) => {
    try {
        const participant = await Participant.findOne({ user: req.user.userId })
            .populate('teams.hackathon')
            .populate('submissions.hackathon')
            .populate('achievements.hackathon');

        const stats = {
            hackathonsJoined: participant.teams.length,
            activeTeams: participant.teams.filter(t => t.hackathon.status === 'active').length,
            projectsSubmitted: participant.submissions.length,
            achievements: participant.achievements.length
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// Get available hackathons
router.get('/available-hackathons', auth, async (req, res) => {
    try {
        const participant = await Participant.findOne({ user: req.user.userId });
        const joinedHackathonIds = participant.teams.map(t => t.hackathon);

        const availableHackathons = await Hackathon.find({
            _id: { $nin: joinedHackathonIds },
            status: 'active',
            registrationDeadline: { $gt: new Date() }
        }).populate('organizer', 'organization');

        res.json(availableHackathons);
    } catch (error) {
        console.error('Error fetching hackathons:', error);
        res.status(500).json({ message: 'Error fetching hackathons' });
    }
});

// Join hackathon
router.post('/join-hackathon', auth, async (req, res) => {
    try {
        const { hackathonId, teamName, teamDescription, isRecruiting } = req.body;
        const participant = await Participant.findOne({ user: req.user.userId });
        
        // Check if already joined
        if (participant.teams.some(t => t.hackathon.toString() === hackathonId)) {
            return res.status(400).json({ message: 'Already joined this hackathon' });
        }

        const hackathon = await Hackathon.findById(hackathonId);
        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        // Create new team
        participant.teams.push({
            name: teamName,
            hackathon: hackathonId,
            members: [participant._id],
            isLeader: true,
            isRecruiting,
            description: teamDescription
        });

        await participant.save();
        res.json({ message: 'Successfully joined hackathon' });
    } catch (error) {
        console.error('Error joining hackathon:', error);
        res.status(500).json({ message: 'Error joining hackathon' });
    }
});

// Submit project
router.post('/submit-project', auth, upload.array('screenshots', 5), async (req, res) => {
    try {
        const {
            hackathonId,
            projectName,
            description,
            technologies,
            githubLink,
            demoLink
        } = req.body;

        const participant = await Participant.findOne({ user: req.user.userId });
        const hackathon = await Hackathon.findById(hackathonId);

        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        // Check if submission deadline has passed
        if (new Date() > hackathon.submissionDeadline) {
            return res.status(400).json({ message: 'Submission deadline has passed' });
        }

        const screenshots = req.files ? req.files.map(file => file.filename) : [];

        const submission = {
            hackathon: hackathonId,
            projectName,
            description,
            technologies: technologies.split(',').map(tech => tech.trim()),
            githubLink,
            demoLink,
            screenshots,
            status: 'submitted'
        };

        participant.submissions.push(submission);
        await participant.save();

        // Add achievement for first submission
        if (participant.submissions.length === 1) {
            participant.achievements.push({
                type: 'submission',
                hackathon: hackathonId,
                description: 'First Project Submission'
            });
            await participant.save();
        }

        res.json({ message: 'Project submitted successfully' });
    } catch (error) {
        console.error('Error submitting project:', error);
        res.status(500).json({ message: 'Error submitting project' });
    }
});

// Get team details
router.get('/team/:teamId', auth, async (req, res) => {
    try {
        const participant = await Participant.findOne({ user: req.user.userId })
            .populate('teams.members', 'user')
            .populate('teams.hackathon');

        const team = participant.teams.id(req.params.teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        res.json(team);
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ message: 'Error fetching team details' });
    }
});

// Update project progress
router.post('/update-progress/:hackathonId', auth, async (req, res) => {
    try {
        const { progress } = req.body;
        const participant = await Participant.findOne({ user: req.user.userId });
        
        const submission = participant.submissions.find(
            s => s.hackathon.toString() === req.params.hackathonId
        );
        
        if (!submission) {
            submission = participant.submissions.create({
                hackathon: req.params.hackathonId,
                progress: progress
            });
            participant.submissions.push(submission);
        } else {
            submission.progress = progress;
        }
        
        await participant.save();
        res.json({ message: 'Progress updated successfully' });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ message: 'Error updating progress' });
    }
});

// Add milestone
router.post('/add-milestone/:hackathonId', auth, async (req, res) => {
    try {
        const { title, description, dueDate } = req.body;
        const participant = await Participant.findOne({ user: req.user.userId });
        
        const submission = participant.submissions.find(
            s => s.hackathon.toString() === req.params.hackathonId
        );
        
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        
        submission.milestones.push({ title, description, dueDate });
        await participant.save();
        
        res.json({ message: 'Milestone added successfully' });
    } catch (error) {
        console.error('Error adding milestone:', error);
        res.status(500).json({ message: 'Error adding milestone' });
    }
});

// Share resource
router.post('/share-resource/:teamId', auth, upload.single('file'), async (req, res) => {
    try {
        const { description } = req.body;
        const participant = await Participant.findOne({ user: req.user.userId });
        
        const team = participant.teams.id(req.params.teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        team.resources.push({
            file: req.file.filename,
            description,
            sharedBy: participant._id
        });
        
        await participant.save();
        res.json({ message: 'Resource shared successfully' });
    } catch (error) {
        console.error('Error sharing resource:', error);
        res.status(500).json({ message: 'Error sharing resource' });
    }
});

// Get dashboard data
router.get('/dashboard-data', auth, async (req, res) => {
    try {
        const participant = await Participant.findOne({ user: req.user.userId })
            .populate('teams.hackathon')
            .populate('submissions.hackathon');

        // Get active hackathons where participant is involved
        const activeHackathons = await Hackathon.find({
            _id: { $in: participant.teams.map(t => t.hackathon._id) },
            status: 'active'
        });

        // Get available hackathons
        const availableHackathons = await Hackathon.find({
            _id: { $nin: participant.teams.map(t => t.hackathon._id) },
            status: 'active',
            registrationDeadline: { $gt: new Date() }
        });

        // Get completed hackathons
        const completedHackathons = await Hackathon.find({
            _id: { $in: participant.teams.map(t => t.hackathon._id) },
            status: 'completed'
        });

        // Get recent submissions
        const recentSubmissions = await Submission.find({
            participant: participant._id
        })
        .sort('-submittedAt')
        .limit(5)
        .populate('hackathon');

        res.json({
            stats: {
                hackathonsJoined: participant.teams.length,
                activeTeams: participant.teams.filter(t => t.hackathon.status === 'active').length,
                projectsSubmitted: participant.submissions.length,
                achievements: participant.achievements.length
            },
            activeHackathons,
            availableHackathons,
            completedHackathons,
            recentSubmissions
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Create team
router.post('/create-team', auth, async (req, res) => {
    try {
        const { name, description, hackathonId } = req.body;
        const participant = await Participant.findOne({ user: req.user.userId });

        const team = {
            name,
            description,
            hackathon: hackathonId,
            members: [participant._id],
            isLeader: true
        };

        participant.teams.push(team);
        await participant.save();

        res.json({ message: 'Team created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating team' });
    }
});

// Join team
router.post('/join-team/:teamId', auth, async (req, res) => {
    try {
        const participant = await Participant.findOne({ user: req.user.userId });
        const team = await Team.findById(req.params.teamId);

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        team.members.push(participant._id);
        await team.save();

        res.json({ message: 'Joined team successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error joining team' });
    }
});

module.exports = router; 