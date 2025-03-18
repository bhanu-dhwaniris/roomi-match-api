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

        // Get IDs of users who already have connections with current user
        const connectedUserIds = currentUser.connections.map(conn => conn.user);

        const users = await User.find({
            _id: { 
                $ne: userId,  // Exclude current user
                $nin: connectedUserIds // Exclude users who already have connections
            },
            gender,
            'address.city': address.city,
            'address.state': address.state,
            lastActive: { $gte: thirtyDaysAgo }
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

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

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
    }),

    sendRequest: catchAsync(async (req, res) => {
        const senderId = req.user._id;
        const receiverId = req.params.userId;

        // Check if users exist
        const [sender, receiver] = await Promise.all([
            User.findById(senderId),
            User.findById(receiverId)
        ]);

        if (!receiver) {
            return res.BadRequest({}, 'Receiver not found');
        }

        // Check if request already exists
        const existingConnection = await User.findOne({
            _id: senderId,
            'connections.user': receiverId
        });

        if (existingConnection) {
            return res.BadRequest({}, 'Connection already exists');
        }

        // Add connection to both users
        await Promise.all([
            User.findByIdAndUpdate(senderId, {
                $push: {
                    connections: {
                        user: receiverId,
                        initiator: senderId
                    }
                }
            }),
            User.findByIdAndUpdate(receiverId, {
                $push: {
                    connections: {
                        user: senderId,
                        initiator: senderId
                    }
                }
            })
        ]);

        return res.Ok({}, 'Request sent successfully');
    }),

    respondToRequest: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const requesterId = req.params.userId;
        const { action } = req.body; // 'accept' or 'block'

        if (!['accept', 'block'].includes(action)) {
            return res.BadRequest({}, 'Invalid action');
        }

        // Update connection status for both users
        await Promise.all([
            User.findOneAndUpdate(
                { 
                    _id: userId,
                    'connections.user': requesterId,
                    'connections.status': 'pending'
                },
                {
                    $set: {
                        'connections.$.status': action === 'accept' ? 'accepted' : 'blocked'
                    }
                }
            ),
            User.findOneAndUpdate(
                {
                    _id: requesterId,
                    'connections.user': userId,
                    'connections.status': 'pending'
                },
                {
                    $set: {
                        'connections.$.status': action === 'accept' ? 'accepted' : 'blocked'
                    }
                }
            )
        ]);

        return res.Ok({}, `Request ${action}ed successfully`);
    }),

    getConnections: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const status = req.query.status || 'accepted'; // 'pending', 'accepted', 'blocked'
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId)
            .populate({
                path: 'connections.user',
                match: { 'connections.status': status },
                select: 'name nickname photo lastActive'
            })
            .slice('connections', [skip, limit]);

        const connections = user.connections
            .filter(conn => conn.status === status)
            .map(conn => ({
                id: conn.user._id,
                name: conn.user.name,
                nickname: conn.user.nickname,
                photo: conn.user.photo,
                lastActive: conn.user.lastActive,
                createdAt: conn.createdAt
            }));

        return res.Ok(
            { connections },
            'Connections fetched successfully'
        );
    }),

    removeConnection: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const connectionId = req.params.userId;

        await Promise.all([
            User.findByIdAndUpdate(userId, {
                $pull: { connections: { user: connectionId } }
            }),
            User.findByIdAndUpdate(connectionId, {
                $pull: { connections: { user: userId } }
            })
        ]);

        return res.Ok({}, 'Connection removed successfully');
    })
};

module.exports = userController;

