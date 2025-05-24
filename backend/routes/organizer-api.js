const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Organizer = require('../models/Organizer');
const Judge = require('../models/Judge');
const Hackathon = require('../models/Hackathon');

// Get judge requests for a hackathon
router.get('/judge-requests/:hackathonId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const hackathon = await Hackathon.findOne({
            _id: req.params.hackathonId,
            organizer: organizer._id
        });

        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        // Find all judges who requested this hackathon with pending status
        const judgeRequests = await Judge.find({
            'requestedHackathons': {
                $elemMatch: {
                    hackathon: hackathon._id,
                    status: 'pending'
                }
            }
        }).populate('user', 'firstName lastName email');

        console.log('Found judge requests:', judgeRequests); // Debug log

        // Format the response with more detailed information
        const formattedRequests = judgeRequests.map(judge => {
            const request = judge.requestedHackathons.find(
                req => req.hackathon.toString() === hackathon._id.toString()
            );
            
            return {
                _id: judge._id,
                user: judge.user,
                expertise: judge.expertise || [],
                experience: judge.experience || 0,
                currentRole: judge.currentRole || 'Not specified',
                requestedAt: request.requestedAt
            };
        });

        console.log('Formatted requests:', formattedRequests); // Debug log
        res.json(formattedRequests);
    } catch (error) {
        console.error('Get judge requests error:', error);
        res.status(500).json({ message: 'Error fetching judge requests' });
    }
});

// Respond to judge request
router.post('/respond-to-judge-request/:hackathonId/:judgeId', auth, async (req, res) => {
    try {
        const { response } = req.body; // 'accept' or 'decline'
        if (!['accept', 'decline'].includes(response)) {
            return res.status(400).json({ message: 'Invalid response' });
        }

        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const hackathon = await Hackathon.findOne({
            _id: req.params.hackathonId,
            organizer: organizer._id
        });

        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        const judge = await Judge.findById(req.params.judgeId);
        if (!judge) {
            return res.status(404).json({ message: 'Judge not found' });
        }

        // Update request status
        const request = judge.requestedHackathons.find(
            req => req.hackathon.toString() === hackathon._id.toString()
        );

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = response === 'accept' ? 'accepted' : 'declined';

        if (response === 'accept') {
            // Add judge to hackathon's judges array
            if (!hackathon.judges.includes(judge._id)) {
                hackathon.judges.push(judge._id);
                await hackathon.save();
            }
        }

        await judge.save();
        res.json({ message: `Judge request ${response}ed successfully` });
    } catch (error) {
        console.error('Respond to judge request error:', error);
        res.status(500).json({ message: 'Error responding to judge request' });
    }
});

module.exports = router; 