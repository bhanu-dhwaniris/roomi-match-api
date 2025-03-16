const User = require("../models/User");
const { catchAsync } = require("../utils/commonFunctions");

const userController = {
    getMatches: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const currentUser = await User.findById(userId).populate('traits');

        if (!currentUser) {
            return res.BadRequest({}, 'User not found');
        }

        const { gender, address, traits: userTraits } = currentUser;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const users = await User.find({
            _id: { $ne: userId }, // Exclude current user
            gender,
            'address.city': address.city,
            'address.state': address.state,
            lastActive: { $gte: thirtyDaysAgo } // Filter by lastActive within 30 days
        }).populate('traits');

        const usersWithTraitMatchCount = users.map(user => {
            const matchingTraits = user.traits.filter(trait => 
                userTraits.some(userTrait => userTrait.equals(trait))
            );
            return {
                user,
                matchCount: matchingTraits.length
            };
        });

        // Sort by match count before pagination
        usersWithTraitMatchCount.sort((a, b) => b.matchCount - a.matchCount);

        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
        const skip = (page - 1) * limit;

        // Apply pagination after sorting
        const paginatedUsers = usersWithTraitMatchCount.slice(skip, skip + limit);

        const sortedUsers = paginatedUsers.map(item => ({
            id: item.user._id,
            nickname: item.user.nickname,
            lastActive: item.user.lastActive,
            traits: item.user.traits,
        }));

        return res.Ok(
            { matches: sortedUsers },
            'Matches fetched successfully'
        );
    }),

    updateLastActive: catchAsync(async (req, res) => {
        const userId = req.user._id;
        await User.findByIdAndUpdate(userId, { lastActive: new Date() });
        return res.Ok({}, 'Last active updated successfully');
    })
};

module.exports = userController;

