const Notification = require('../models/Notification');
const { catchAsync } = require('../utils/commonFunctions');

const notificationController = {
    getNotifications: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('data.userId', 'name photo nickname');

        const totalCount = await Notification.countDocuments({ userId });

        return res.Ok(
            {
                notifications,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount
                }
            },
            'Notifications fetched successfully'
        );
    }),

    markAsRead: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const notificationId = req.params.id;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { $set: { isRead: true } },
            { new: true }
        );

        if (!notification) {
            return res.BadRequest({}, 'Notification not found');
        }

        return res.Ok(
            { notification },
            'Notification marked as read'
        );
    })
};

module.exports = notificationController; 