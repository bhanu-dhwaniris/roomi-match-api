const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
    {
        matchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Match',
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true
        },
        readBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        clientMessageId: {  // For handling offline messages
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
            default: 'sending'
        }
    },
    { timestamps: true }
);

messageSchema.index({ matchId: 1, createdAt: -1 });
messageSchema.index({ clientMessageId: 1 }, { unique: true });

module.exports = mongoose.model("Message", messageSchema); 