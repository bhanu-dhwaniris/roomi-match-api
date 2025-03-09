const Match = require('../models/Match');
const Message = require('../models/Message');
const { catchAsync } = require('../utils/commonFunctions');

const chatController = {
    getMatches: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const lastSync = req.query.lastSync ? new Date(parseInt(req.query.lastSync)) : null;

        // Get all matches with just the last message
        const matches = await Match.find({
            users: userId,
            chatEnabled: true,
            isDeleted: false
        })
        .populate('users', 'name photo nickname')
        .populate('lastMessage.sender', 'name photo nickname')
        .select('users status lastMessage chatEnabled')
        .sort({ 'lastMessage.timestamp': -1 });

        // Only get unread message counts
        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    matchId: { $in: matches.map(m => m._id) },
                    readBy: { $ne: userId }
                }
            },
            {
                $group: {
                    _id: '$matchId',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format response
        const matchesWithCounts = matches.map(match => ({
            _id: match._id,
            users: match.users,
            status: match.status,
            chatEnabled: match.chatEnabled,
            lastMessage: match.lastMessage,
            unreadCount: unreadCounts.find(c => c._id.equals(match._id))?.count || 0
        }));

        return res.Ok(
            { 
                matches: matchesWithCounts,
                syncTimestamp: Date.now()
            },
            'Matches fetched successfully'
        );
    }),

    getMessages: catchAsync(async (req, res) => {
        const { matchId } = req.params;
        const userId = req.user._id;
        const beforeTimestamp = req.query.beforeTimestamp; // For pagination
        const limit = parseInt(req.query.limit) || 20;

        const match = await Match.findOne({
            _id: matchId,
            users: userId,
            chatEnabled: true
        });

        if (!match) {
            return res.BadRequest({}, 'Match not found or chat not enabled');
        }

        // Query builder for messages
        const query = { matchId };
        if (beforeTimestamp) {
            query.createdAt = { $lt: new Date(parseInt(beforeTimestamp)) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('sender', 'name photo nickname');

        return res.Ok(
            { 
                messages: messages.reverse(),
                hasMore: messages.length === limit
            },
            'Messages fetched successfully'
        );
    }),

    syncMessages: catchAsync(async (req, res) => {
        const { matchId, lastSyncTimestamp } = req.params;
        const userId = req.user._id;

        const match = await Match.findOne({
            _id: matchId,
            users: userId,
            chatEnabled: true
        });

        if (!match) {
            return res.BadRequest({}, 'Match not found or chat not enabled');
        }

        // Get messages after last sync
        const messages = await Message.find({
            matchId,
            createdAt: { $gt: new Date(parseInt(lastSyncTimestamp)) }
        })
        .sort({ createdAt: 1 })
        .populate('sender', 'name photo nickname');

        return res.Ok(
            { messages },
            'Messages synced successfully'
        );
    }),

    resendFailedMessages: catchAsync(async (req, res) => {
        const { messages } = req.body;
        const userId = req.user._id;
        const results = [];

        for (const msg of messages) {
            try {
                const match = await Match.findOne({
                    _id: msg.matchId,
                    users: userId,
                    chatEnabled: true
                });

                if (!match) {
                    results.push({
                        clientMessageId: msg.clientMessageId,
                        status: 'failed',
                        error: 'Match not found'
                    });
                    continue;
                }

                const message = await Message.create({
                    matchId: msg.matchId,
                    sender: userId,
                    text: msg.text,
                    readBy: [userId],
                    clientMessageId: msg.clientMessageId,
                    status: 'sent'
                });

                results.push({
                    clientMessageId: msg.clientMessageId,
                    messageId: message._id,
                    status: 'sent'
                });
            } catch (error) {
                results.push({
                    clientMessageId: msg.clientMessageId,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return res.Ok({ results }, 'Failed messages processed');
    })
};

module.exports = chatController; 