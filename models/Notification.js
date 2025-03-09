const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        type: {
            type: String,
            enum: ['match', 'message', 'system'],
            required: true
        },
        title: String,
        message: String,
        data: {
            matchId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Match'
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema); 