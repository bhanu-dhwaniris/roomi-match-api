const mongoose = require("mongoose");

const matchSchema = mongoose.Schema(
    {
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }],
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        matchPercentage: {
            type: Number,
            required: true
        },
        notifiedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        acceptedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        chatEnabled: {
            type: Boolean,
            default: false
        },
        lastMessage: {
            text: String,
            sender: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            timestamp: Date
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Ensure unique matches between users
matchSchema.index({ users: 1 }, { unique: true });
matchSchema.index({ status: 1, chatEnabled: 1 });

module.exports = mongoose.model("Match", matchSchema); 