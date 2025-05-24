const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Judge = require('../models/Judge');
const Hackathon = require('../models/Hackathon');
const Submission = require('../models/Submission');
const Team = require('../models/Team');

// Participant Dashboard
router.get('/participant', auth, async (req, res) => {
    try {
        // Get user data with all necessary fields
        const user = await User.findById(req.user.userId)
            .select('firstName lastName email role');
            
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        // Get participant data with all related information
        const participant = await Participant.findOne({ user: user._id })
            .populate({
                path: 'teams.hackathon',
                select: 'title description startDate endDate status prizePool'
            })
            .populate({
                path: 'submissions.hackathon',
                select: 'title status'
            })
            .populate('achievements.hackathon');

        // Get active hackathons the participant is part of
        const activeHackathons = await Hackathon.find({
            _id: { $in: participant.teams.map(t => t.hackathon._id) },
            status: 'active',
            endDate: { $gt: new Date() }
        }).populate('organizer', 'organization');

        // Get available hackathons to join
        const availableHackathons = await Hackathon.find({
            _id: { $nin: participant.teams.map(t => t.hackathon._id) },
            status: 'active',
            registrationDeadline: { $gt: new Date() }
        }).populate('organizer', 'organization');

        // Get participant's teams with members
        const teams = await Team.find({
            members: participant._id
        }).populate('members', 'user')
          .populate('leader', 'user')
          .populate('hackathon', 'title status');

        // Get recent submissions
        const recentSubmissions = await Submission.find({
            participant: participant._id
        })
        .sort('-submittedAt')
        .limit(5)
        .populate('hackathon', 'title');

        // Get recent activities
        const activities = [
            ...participant.submissions.map(sub => ({
                icon: 'fa-code',
                user: user.firstName,
                action: `submitted project for ${sub.hackathon.title}`,
                timestamp: sub.submittedAt
            })),
            ...participant.teams.map(team => ({
                icon: 'fa-users',
                user: user.firstName,
                action: `joined team ${team.name}`,
                timestamp: team.joinedAt
            })),
            ...participant.achievements.map(ach => ({
                icon: 'fa-trophy',
                user: user.firstName,
                action: `earned achievement: ${ach.description}`,
                timestamp: ach.date
            }))
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

        // Calculate stats
        const stats = {
            hackathonsJoined: participant.teams.length,
            activeTeams: teams.filter(t => t.hackathon.status === 'active').length,
            projectsSubmitted: participant.submissions.length,
            achievements: participant.achievements.length
        };

        // Add helper functions
        const helpers = {
            formatDate: (date) => {
                return new Date(date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        };

        res.render('dashboard/participant', {
            layout: 'dashboard/layout',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            stats,
            activeHackathons,
            availableHackathons,
            teams,
            recentSubmissions,
            activities,
            title: 'Participant Dashboard',
            path: 'dashboard',
            formatDate: helpers.formatDate
        });

    } catch (error) {
        console.error('Error loading participant dashboard:', error);
        res.status(500).render('error', { 
            message: 'Error loading dashboard',
            error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

// Organizer Dashboard
router.get('/organizer', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.redirect(`/dashboard/${req.user.role}`);
        }

        // Get user data with all necessary fields
        const user = await User.findById(req.user.userId)
            .select('firstName lastName email role');
            
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        const organizer = await Organizer.findOne({ user: user._id });

        // Get active hackathons
        const activeHackathons = await Hackathon.find({
            organizer: organizer._id,
            status: 'active'
        }).populate('judges participants');

        // Get recent hackathons
        const recentHackathons = await Hackathon.find({
            organizer: organizer._id,
            status: 'completed'
        })
        .sort('-endDate')
        .limit(5)
        .populate('participants submissions');

        // Get available judges
        const availableJudges = await Judge.find({})
            .populate('user', 'firstName lastName email')
            .select('expertise experience currentRole');

        // Get all submissions for active hackathons
        const submissions = await Submission.find({
            hackathon: { $in: activeHackathons.map(h => h._id) }
        })
        .populate('participant', {
            path: 'user',
            select: 'firstName lastName'
        })
        .populate('hackathon', 'title')
        .sort('-submittedAt');

        // Calculate dashboard stats
        const stats = {
            activeHackathons: activeHackathons.length,
            totalParticipants: activeHackathons.reduce((acc, h) => acc + h.participants.length, 0),
            ongoingSubmissions: activeHackathons.reduce((acc, h) => acc + h.submissions?.length || 0, 0),
            assignedJudges: activeHackathons.reduce((acc, h) => acc + h.judges.length, 0)
        };

        res.render('dashboard/organizer', {
            layout: 'dashboard/layout',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            organizer,
            activeHackathons,
            recentHackathons,
            availableJudges,
            submissions,
            stats,
            path: 'dashboard',
            title: 'Organizer Dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', { 
            message: 'Error loading dashboard', 
            error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

// Judge Dashboard
router.get('/judge', auth, async (req, res) => {
    try {
        console.log('Accessing judge dashboard');
        console.log('User data:', req.user);

        if (req.user.role !== 'judge') {
            return res.redirect(`/dashboard/${req.user.role}`);
        }

        // Get user data with all necessary fields
        const user = await User.findById(req.user.userId)
            .select('firstName lastName email role');
            
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        const judge = await Judge.findOne({ user: user._id });
        if (!judge) {
            return res.status(404).render('error', { 
                message: 'Judge profile not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        // Get active hackathons where judge is assigned
        const activeHackathons = await Hackathon.find({
            judges: judge._id,
            status: 'active'
        }).populate('organizer', 'organization');

        // Get assignments with submission counts
        const activeAssignments = await Promise.all(activeHackathons.map(async (hackathon) => {
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

        // Get pending invitations
        const pendingInvites = judge.invitedHackathons?.filter(inv => inv.status === 'pending') || [];
        await Judge.populate(pendingInvites, {
            path: 'hackathon',
            populate: { path: 'organizer', select: 'organization' }
        });

        // Get upcoming hackathons
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

        // Add request status to upcoming hackathons
        const upcomingWithStatus = upcomingHackathons.map(hackathon => ({
            ...hackathon.toObject(),
            alreadyRequested: judge.requestedHackathons?.some(
                req => req.hackathon.toString() === hackathon._id.toString()
            ) || false
        }));

        // Calculate stats
        const stats = {
            assignedHackathons: activeHackathons?.length || 0,
            pendingInvites: pendingInvites?.length || 0,
            pendingReviews: activeAssignments?.reduce((acc, curr) => 
                acc + (curr.totalSubmissions - curr.reviewedCount), 0) || 0,
            completedReviews: activeAssignments?.reduce((acc, curr) => 
                acc + curr.reviewedCount, 0) || 0
        };

        return res.render('dashboard/judge', {
            layout: 'dashboard/layout',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            judge,
            stats,
            activeAssignments: activeAssignments || [],
            pendingInvites: pendingInvites || [],
            upcomingHackathons: upcomingWithStatus || [],
            path: 'dashboard',
            title: 'Judge Dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return res.status(500).render('error', { 
            message: 'Error loading dashboard', 
            error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

// Modify the stats route to use organizer ID
router.get('/organizer/stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // First get the organizer document
        const organizer = await Organizer.findOne({ user: req.user.userId });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Use organizer._id to find hackathons
        const activeHackathons = await Hackathon.find({ 
            organizer: organizer._id,  // Changed from req.user.userId to organizer._id
            status: 'active'
        });

        const submissions = await Submission.find({
            hackathon: { $in: activeHackathons.map(h => h._id) }
        });

        const stats = {
            activeHackathons: activeHackathons.length,
            totalParticipants: activeHackathons.reduce((acc, curr) => acc + (curr.participants ? curr.participants.length : 0), 0),
            ongoingSubmissions: submissions.filter(s => s.status === 'pending').length,
            assignedJudges: activeHackathons.reduce((acc, curr) => acc + (curr.judges ? curr.judges.length : 0), 0)
        };

        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// Update the route path to match the menu link
router.get('/organizer/manage-hackathons', auth, async (req, res) => {
    try {
        console.log('Accessing manage-hackathons route');
        console.log('User role:', req.user.role);
        
        if (req.user.role !== 'organizer') {
            console.log('Redirecting non-organizer');
            return res.redirect(`/dashboard/${req.user.role}`);
        }

        // Get user data with all necessary fields
        const user = await User.findById(req.user.userId)
            .select('firstName lastName email role');
            
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        const organizer = await Organizer.findOne({ user: user._id });
        if (!organizer) {
            return res.status(404).render('error', { 
                message: 'Organizer profile not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        // Get manageable hackathons
        const manageableHackathons = await Hackathon.find({
            organizer: organizer._id,
            startDate: { $gt: new Date() },
            participants: { $size: 0 },
            judges: { $size: 0 }
        }).sort({ startDate: 1 });

        res.render('dashboard/manage-hackathon', {
            layout: 'dashboard/layout',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            organizer,
            manageableHackathons,
            title: 'Manage Hackathons',
            path: 'manage-hackathons'
        });
    } catch (error) {
        console.error('Manage hackathons error:', error);
        return res.status(500).render('error', { 
            message: 'Error loading manage hackathons page', 
            error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

// Update the hackathons route
router.get('/organizer/hackathons', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.redirect(`/dashboard/${req.user.role}`);
        }

        // Get user data with all necessary fields
        const user = await User.findById(req.user.userId)
            .select('firstName lastName email role');
            
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        const organizer = await Organizer.findOne({ user: user._id });
        if (!organizer) {
            return res.status(404).render('error', { 
                message: 'Organizer profile not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        // Get all hackathons for this organizer
        const hackathons = await Hackathon.find({
            organizer: organizer._id
        }).sort('-createdAt');

        res.render('dashboard/hackathons', {
            layout: 'dashboard/layout',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            organizer,
            hackathons,
            title: 'My Hackathons',
            path: 'hackathons'
        });
    } catch (error) {
        console.error('Hackathons page error:', error);
        return res.status(500).render('error', { 
            message: 'Error loading hackathons page', 
            error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

// Update the manage route
router.get('/organizer/manage', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.redirect(`/dashboard/${req.user.role}`);
        }

        // Get user data with all necessary fields
        const user = await User.findById(req.user.userId)
            .select('firstName lastName email role');
            
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        const organizer = await Organizer.findOne({ user: user._id });
        if (!organizer) {
            return res.status(404).render('error', { 
                message: 'Organizer profile not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        // Get manageable hackathons
        const manageableHackathons = await Hackathon.find({
            organizer: organizer._id,
            startDate: { $gt: new Date() },
            participants: { $size: 0 },
            judges: { $size: 0 }
        }).sort({ startDate: 1 });

        res.render('dashboard/manage-hackathon', {
            layout: 'dashboard/layout',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            organizer,
            manageableHackathons,
            title: 'Manage Hackathon',
            path: 'manage'
        });
    } catch (error) {
        console.error('Manage hackathon error:', error);
        return res.status(500).render('error', { 
            message: 'Error loading manage hackathon page', 
            error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

// Update the participants route
router.get('/organizer/participants', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.redirect(`/dashboard/${req.user.role}`);
        }

        // Get user data with all necessary fields
        const user = await User.findById(req.user.userId)
            .select('firstName lastName email role');
            
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        const organizer = await Organizer.findOne({ user: user._id });
        if (!organizer) {
            return res.status(404).render('error', { 
                message: 'Organizer profile not found',
                title: 'Error',
                layout: 'dashboard/layout'
            });
        }

        // Get active hackathons for this organizer
        const activeHackathons = await Hackathon.find({
            organizer: organizer._id,
            status: 'active'
        });

        // Get all participants from active hackathons
        const hackathonParticipants = await Hackathon.find({
            organizer: organizer._id,
            status: 'active'
        })
        .populate({
            path: 'participants',
            populate: {
                path: 'user',
                select: 'firstName lastName email'
            }
        })
        .select('title participants');

        res.render('dashboard/organizer-participants', {
            layout: 'dashboard/layout',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            },
            organizer,
            hackathonParticipants,
            title: 'Hackathon Participants',
            path: 'participants'
        });
    } catch (error) {
        console.error('Participants page error:', error);
        return res.status(500).render('error', { 
            message: 'Error loading participants page', 
            error,
            title: 'Error',
            layout: 'dashboard/layout'
        });
    }
});

module.exports = router; 