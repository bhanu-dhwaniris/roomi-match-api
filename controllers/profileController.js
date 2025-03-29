const User = require('../models/User');
const { catchAsync, formatUserResponse } = require('../utils/commonFunctions');

const profileController = {
    updateProfile: catchAsync(async (req, res) => {
        const { nickname, birthday, gender, address, traits } = req.body;
        const userId = req.user._id;

        // Validate gender if provided
        if (gender && !['male', 'female', 'other'].includes(gender)) {
            return res.BadRequest({}, 'Invalid gender value');
        }

        // Validate birthday if provided
        let birthdayDate;
        if (birthday) {
            birthdayDate = new Date(birthday);
            if (isNaN(birthdayDate.getTime())) {
                return res.BadRequest({}, 'Invalid birthday format');
            }
        }

        try {
            const updateData = {
                ...(nickname && { nickname }),
                ...(birthday && { birthday: birthdayDate }),
                ...(gender && { gender }),
                ...(address && { address: { city: address.split(',')[0].trim(), state: address.split(',')[1].trim() } }),
                ...(traits && { traits }),
                isProfileCompleted: true
            };

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
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