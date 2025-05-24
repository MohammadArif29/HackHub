const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Judge = require('../models/Judge');
const Hackathon = require('../models/Hackathon');
const Submission = require('../models/Submission');

// Get judge's stats
router.get('/stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'judge') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const judge = await Judge.findOne({ user: req.user.userId });
        if (!judge) {
            return res.status(404).json({ message: 'Judge not found' });
        }

        const activeHackathons = await Hackathon.find({
            judges: judge._id,
            status: 'active'
        });

        const pendingInvites = judge.invitedHackathons?.filter(
            inv => inv.status === 'pending'
        ).length || 0;

        const submissions = await Submission.find({
            hackathon: { $in: activeHackathons.map(h => h._id) }
        });

        const reviewedSubmissions = submissions.filter(
            s => s.reviews.some(r => r.judge.toString() === judge._id.toString())
        );

        const stats = {
            assignedHackathons: activeHackathons.length,
            pendingInvites,
            pendingReviews: submissions.length - reviewedSubmissions.length,
            completedReviews: reviewedSubmissions.length
        };

        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// Get judge's assignments
router.get('/assignments', auth, async (req, res) => {
    try {
        if (req.user.role !== 'judge') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const judge = await Judge.findOne({ user: req.user.userId });
        if (!judge) {
            return res.status(404).json({ message: 'Judge not found' });
        }

        const activeHackathons = await Hackathon.find({
            judges: judge._id,
            status: 'active'
        }).populate('organizer', 'organization');

        const assignments = await Promise.all(activeHackathons.map(async (hackathon) => {
            const submissions = await Submission.find({ hackathon: hackathon._id });
            const reviewedSubmissions = submissions.filter(s => 
                s.reviews.some(r => r.judge.toString() === judge._id.toString())
            );
            
            return {
                hackathon: hackathon,
                totalSubmissions: submissions.length,
                reviewedCount: reviewedSubmissions.length,
                dueDate: hackathon.endDate
            };
        }));

        res.json(assignments);
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

// Get upcoming hackathons
router.get('/upcoming-hackathons', auth, async (req, res) => {
    try {
        if (req.user.role !== 'judge') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const judge = await Judge.findOne({ user: req.user.userId });
        if (!judge) {
            return res.status(404).json({ message: 'Judge not found' });
        }

        const upcomingHackathons = await Hackathon.find({
            startDate: { $gt: new Date() },
            status: 'active',
            judges: { $ne: judge._id }
        })
        .populate({
            path: 'organizer',
            select: 'organization'
        })
        .sort('startDate')
        .limit(6);

        const hackathonsWithStatus = upcomingHackathons.map(hackathon => ({
            ...hackathon.toObject(),
            alreadyRequested: judge.requestedHackathons?.some(
                req => req.hackathon.toString() === hackathon._id.toString()
            ) || false
        }));

        res.json(hackathonsWithStatus);
    } catch (error) {
        console.error('Get upcoming hackathons error:', error);
        res.status(500).json({ message: 'Error fetching hackathons' });
    }
});

// Request to judge a hackathon
router.post('/request-to-judge/:hackathonId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'judge') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const judge = await Judge.findOne({ user: req.user.userId });
        if (!judge) {
            return res.status(404).json({ message: 'Judge not found' });
        }

        const hackathon = await Hackathon.findById(req.params.hackathonId);
        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        // Check if already requested
        const existingRequest = judge.requestedHackathons.find(
            req => req.hackathon.toString() === hackathon._id.toString()
        );

        if (existingRequest) {
            return res.status(400).json({ message: 'Already requested to judge this hackathon' });
        }

        // Add to requested hackathons
        judge.requestedHackathons.push({
            hackathon: hackathon._id,
            status: 'pending'
        });

        await judge.save();
        res.json({ message: 'Request sent successfully' });
    } catch (error) {
        console.error('Request to judge error:', error);
        res.status(500).json({ message: 'Error sending request' });
    }
});

module.exports = router; 