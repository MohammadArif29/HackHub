const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const Judge = require('../models/Judge');
const Organizer = require('../models/Organizer');

// Create new hackathon
router.post('/create', auth, async (req, res) => {
    try {
        console.log('Create hackathon request body:', req.body);
        console.log('User ID:', req.user.userId);
        
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ message: 'Only organizers can create hackathons' });
        }

        // First get the organizer document
        const organizer = await Organizer.findOne({ user: req.user.userId });
        console.log('Found organizer:', organizer);
        
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Update trial1 hackathon to use correct organizer ID
        await Hackathon.updateMany(
            { organizer: req.user.userId },
            { $set: { organizer: organizer._id } }
        );

        const hackathon = new Hackathon({
            ...req.body,
            organizer: organizer._id,
            tags: req.body.tags.split(',').map(tag => tag.trim()),
            status: 'active'
        });

        console.log('Saving hackathon:', hackathon);
        await hackathon.save();
        console.log('Hackathon saved successfully');
        
        res.status(201).json({ message: 'Hackathon created successfully', hackathon });
    } catch (error) {
        console.error('Create hackathon error:', error);
        res.status(500).json({ message: 'Error creating hackathon' });
    }
});

// Get organizer's active hackathons
router.get('/active', auth, async (req, res) => {
    try {
        // First get the organizer document
        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        console.log('Finding hackathons for organizer:', organizer._id);
        console.log('User ID:', req.user.userId);
        console.log('Organizer:', organizer);

        // Log the query we're about to make
        const query = {
            organizer: organizer._id,
            status: 'active'
        };
        console.log('Query:', JSON.stringify(query));

        // First find without population to check raw data
        const rawHackathons = await Hackathon.find(query).lean();
        console.log('Raw hackathons found:', rawHackathons);

        const activeHackathons = await Hackathon.find(query)
            .populate('participants')
            .populate('judges')
            .sort('-createdAt');

        console.log('Found active hackathons:', activeHackathons);
        console.log('Number of hackathons found:', activeHackathons.length);
        console.log('Hackathon organizer IDs:', activeHackathons.map(h => h.organizer));

        // Compare IDs as strings
        console.log('Comparing IDs:');
        activeHackathons.forEach(h => {
            console.log(`Hackathon ${h.title}:`);
            console.log(`- Hackathon organizer ID: ${h.organizer.toString()}`);
            console.log(`- Current organizer ID: ${organizer._id.toString()}`);
            console.log(`- Match: ${h.organizer.toString() === organizer._id.toString()}`);
        });

        res.json(activeHackathons);
    } catch (error) {
        console.error('Get active hackathons error:', error);
        res.status(500).json({ message: 'Error fetching hackathons' });
    }
});

// Get organizer's recent completed hackathons
router.get('/recent', auth, async (req, res) => {
    try {
        // First get the organizer document
        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        console.log('Finding recent hackathons for organizer:', organizer._id);
        const recentHackathons = await Hackathon.find({
            organizer: organizer._id,
            status: 'completed'
        })
        .populate('participants')
        .populate('submissions')
        .sort('-endDate')
        .limit(2);

        console.log('Found recent hackathons:', recentHackathons);
        res.json(recentHackathons);
    } catch (error) {
        console.error('Get recent hackathons error:', error);
        res.status(500).json({ message: 'Error fetching hackathons' });
    }
});

// Get available judges
router.get('/available-judges', auth, async (req, res) => {
    try {
        const judges = await Judge.find()
            .populate('user', 'firstName lastName email');
        res.json(judges);
    } catch (error) {
        console.error('Get judges error:', error);
        res.status(500).json({ message: 'Error fetching judges' });
    }
});

// Invite judge to hackathon
router.post('/:hackathonId/invite-judge', auth, async (req, res) => {
    try {
        const { judgeId } = req.body;
        
        // First get the organizer document
        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const hackathon = await Hackathon.findById(req.params.hackathonId);
        
        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        // Compare with organizer._id instead of user.userId
        if (hackathon.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (hackathon.judges.includes(judgeId)) {
            return res.status(400).json({ message: 'Judge already invited' });
        }

        hackathon.judges.push(judgeId);
        await hackathon.save();

        res.json({ message: 'Judge invited successfully' });
    } catch (error) {
        console.error('Invite judge error:', error);
        res.status(500).json({ message: 'Error inviting judge' });
    }
});

// Get manageable hackathons
router.get('/manageable', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ message: 'Only organizers can access this' });
        }

        // First get the organizer document
        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const currentDate = new Date();
        const manageableHackathons = await Hackathon.find({
            organizer: organizer._id,
            startDate: { $gt: currentDate },
            participants: { $size: 0 },
            judges: { $size: 0 }
        }).sort({ startDate: 1 });

        res.json(manageableHackathons);
    } catch (error) {
        console.error('Get manageable hackathons error:', error);
        res.status(500).json({ message: 'Error fetching hackathons' });
    }
});

// Delete a hackathon
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ message: 'Only organizers can delete hackathons' });
        }

        // First get the organizer document
        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const hackathon = await Hackathon.findById(req.params.id);
        
        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        // Verify ownership using organizer._id instead of req.user.userId
        if (hackathon.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this hackathon' });
        }

        // Check if hackathon can be deleted
        const currentDate = new Date();
        if (hackathon.startDate <= currentDate) {
            return res.status(400).json({ message: 'Cannot delete a hackathon that has already started' });
        }

        if (hackathon.participants.length > 0) {
            return res.status(400).json({ message: 'Cannot delete a hackathon with registered participants' });
        }

        if (hackathon.judges.length > 0) {
            return res.status(400).json({ message: 'Cannot delete a hackathon with assigned judges' });
        }

        await Hackathon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Hackathon deleted successfully' });
    } catch (error) {
        console.error('Delete hackathon error:', error);
        res.status(500).json({ message: 'Error deleting hackathon' });
    }
});

// Add this route if it doesn't exist
router.get('/upcoming', auth, async (req, res) => {
    try {
        const upcomingHackathons = await Hackathon.find({
            startDate: { $gt: new Date() }
        })
        .sort('startDate')
        .limit(6);

        res.json(upcomingHackathons);
    } catch (error) {
        console.error('Error fetching upcoming hackathons:', error);
        res.status(500).json({ message: 'Error fetching hackathons' });
    }
});

// Add this route to fix the organizer IDs
router.post('/fix-organizer-ids', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Update all hackathons where organizer is the user ID
        const result = await Hackathon.updateMany(
            { organizer: req.user.userId },
            { $set: { organizer: organizer._id } }
        );

        console.log('Update result:', result);
        res.json({ message: 'Organizer IDs fixed', result });
    } catch (error) {
        console.error('Fix organizer IDs error:', error);
        res.status(500).json({ message: 'Error fixing organizer IDs' });
    }
});

module.exports = router; 