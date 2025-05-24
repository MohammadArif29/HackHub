require('dotenv').config();
const mongoose = require('mongoose');
const Organizer = require('../models/Organizer');

async function migrateOrganizers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all organizers
        const organizers = await Organizer.find({});
        console.log(`Found ${organizers.length} organizers to migrate`);

        // Update each organizer
        for (const organizer of organizers) {
            const updates = {
                // Preserve existing fields
                organization: organizer.organization,
                user: organizer.user,

                // Add new fields with default values if they don't exist
                phone: organizer.phone || '',
                bio: organizer.bio || '',
                website: organizer.website || '',
                socialLinks: {
                    linkedin: organizer.socialLinks?.linkedin || '',
                    twitter: organizer.socialLinks?.twitter || '',
                    github: organizer.socialLinks?.github || ''
                },
                verificationStatus: organizer.verificationStatus || 'pending',
                organizationType: organizer.organizationType || 'other',
                location: {
                    city: organizer.location?.city || '',
                    country: organizer.location?.country || ''
                }
            };

            // Update the organizer
            await Organizer.findByIdAndUpdate(organizer._id, updates, { new: true });
            console.log(`Updated organizer: ${organizer._id}`);
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        // Close the database connection
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the migration
migrateOrganizers(); 