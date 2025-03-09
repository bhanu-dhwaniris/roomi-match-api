const User = require('../models/User');
const { catchAsync, formatUserResponse } = require('../utils/commonFunctions');

const profileController = {
    updateProfile: catchAsync(async (req, res) => {
        const { nickname, birthday, gender, location } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!nickname || !birthday || !gender || !location) {
            return res.BadRequest({}, 'All fields are required');
        }

        // Validate gender
        if (!['male', 'female', 'other'].includes(gender)) {
            return res.BadRequest({}, 'Invalid gender value');
        }

        // Validate birthday
        const birthdayDate = new Date(birthday);
        const today = new Date();
        
        if (isNaN(birthdayDate.getTime())) {
            return res.BadRequest({}, 'Invalid birthday format');
        }

        // Validate location
        if (!location.coordinates || 
            !Array.isArray(location.coordinates) || 
            location.coordinates.length !== 2 ||
            !location.address) {
            return res.BadRequest({}, 'Invalid location format');
        }

        try {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        nickname,
                        birthday: birthdayDate,
                        gender,
                        location: {
                            type: 'Point',
                            coordinates: location.coordinates,
                            address: location.address
                        },
                        isProfileCompleted: true
                    }
                },
                { new: true }
            );

            if (!updatedUser) {
                return res.BadRequest({}, 'User not found');
            }

            return res.Ok(
                { user: formatUserResponse(updatedUser) },
                'Profile updated successfully'
            );

        } catch (error) {
            console.error('Profile update error:', error);
            return res.DbError({}, 'Error updating profile');
        }
    }),

    getProfile: catchAsync(async (req, res) => {
        const userId = req.user._id;

        const user = await User.findById(userId)
            .select('-password -otp -__v -isDeleted -retryTimeStamp -retryCount');

        if (!user) {
            return res.BadRequest({}, 'User not found');
        }

        return res.Ok(
            { user },
            'Profile fetched successfully'
        );
    })
};

module.exports = profileController; 