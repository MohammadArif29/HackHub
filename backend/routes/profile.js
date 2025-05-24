const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Judge = require('../models/Judge');

// Get user profile
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        let profileData;
        let template;
        let title;
        let layout;

        switch (user.role) {
            case 'organizer':
                profileData = await Organizer.findOne({ user: user._id })
                    .populate('hackathons')
                    .populate({
                        path: 'hackathons',
                        populate: {
                            path: 'participants'
                        }
                    });

                // Calculate active hackathons
                profileData.activeHackathons = profileData.hackathons.filter(h => h.status === 'active');
                
                // Calculate total participants
                profileData.totalParticipants = profileData.hackathons.reduce((total, h) => 
                    total + (h.participants ? h.participants.length : 0), 0);

                template = 'profile/organizer-profile';
                title = 'Organizer Profile';
                layout = 'dashboard/layouts/organizer-layout';
                break;

            case 'judge':
                profileData = await Judge.findOne({ user: user._id })
                    .populate('hackathonsJudged')
                    .populate('evaluations')
                    .populate('activeAssignments');
                
                // Format recent evaluations
                const recentEvaluations = profileData.evaluations.map(eval => ({
                    projectName: eval.project.name,
                    hackathonName: eval.hackathon.title,
                    score: eval.score,
                    date: eval.evaluatedAt
                })).slice(0, 5);

                profileData.recentEvaluations = recentEvaluations;
                template = 'profile/judge-profile';
                title = 'Judge Profile';
                layout = 'dashboard/layouts/judge-layout';
                break;

            case 'participant':
                profileData = await Participant.findOne({ user: user._id })
                    .populate('teams.hackathon')
                    .populate('submissions.hackathon')
                    .populate('achievements.hackathon');
                
                // Format recent activity
                const recentActivity = [
                    ...profileData.submissions.map(sub => ({
                        icon: 'fa-code',
                        description: `Submitted project for ${sub.hackathon.title}`,
                        date: sub.submittedAt
                    })),
                    ...profileData.achievements.map(ach => ({
                        icon: 'fa-trophy',
                        description: ach.description,
                        date: ach.date
                    }))
                ].sort((a, b) => b.date - a.date).slice(0, 5);

                profileData.recentActivity = recentActivity;
                template = 'profile/participant-profile';
                title = 'Participant Profile';
                layout = 'dashboard/layouts/participant-layout';
                break;

            default:
                return res.status(400).render('error', { 
                    message: 'Invalid user role',
                    title: 'Error',
                    layout: 'dashboard/layout'
                });
        }

        // Helper function for date formatting
        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        res.render(template, {
            user,
            [user.role]: profileData,
            formatDate,
            title,
            layout,
            path: 'profile'
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).render('error', {
            message: 'Error loading profile',
            error: error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

// Update profile
router.post('/update', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user basic info
        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        await user.save();

        // Update role-specific info
        let profileModel;
        switch (user.role) {
            case 'organizer':
                profileModel = await Organizer.findOne({ user: user._id });
                profileModel.organization = req.body.organization;
                profileModel.position = req.body.position;
                profileModel.phone = req.body.phone;
                profileModel.organizationWebsite = req.body.organizationWebsite;
                break;
            case 'judge':
                profileModel = await Judge.findOne({ user: user._id });
                profileModel.currentRole = req.body.currentRole;
                profileModel.experience = req.body.experience;
                profileModel.expertise = req.body.expertise.split(',').map(item => item.trim());
                break;
            case 'participant':
                profileModel = await Participant.findOne({ user: user._id });
                profileModel.bio = req.body.bio;
                profileModel.githubProfile = req.body.githubProfile;
                profileModel.linkedinProfile = req.body.linkedinProfile;
                profileModel.skills = req.body.skills.split(',').map(item => item.trim());
                break;
        }

        await profileModel.save();
        res.json({ success: true, message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Reset organizer profile
router.post('/reset', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({
                success: false,
                message: 'Only organizers can reset their profile'
            });
        }

        // Delete existing organizer profile
        await Organizer.findOneAndDelete({ user: req.user.userId });

        // Create new organizer profile with default values
        const newOrganizer = new Organizer({
            user: req.user.userId,
            organization: 'My Organization', // Default value
            phone: '',
            bio: '',
            website: '',
            socialLinks: {
                linkedin: '',
                twitter: '',
                github: ''
            },
            verificationStatus: 'pending',
            organizationType: 'other',
            location: {
                city: '',
                country: ''
            }
        });

        await newOrganizer.save();

        res.status(200).json({
            success: true,
            message: 'Profile reset successfully'
        });
    } catch (error) {
        console.error('Profile reset error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error resetting profile'
        });
    }
});

module.exports = router; 