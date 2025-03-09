const mongoose = require("mongoose");

const userResponseSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Store answers as key-value pairs for faster querying
        answerMap: {
            type: Map,
            of: String,
            default: new Map()
        },
        // Store preferences separately
        preferenceMap: {
            type: Map,
            of: String,
            default: new Map()
        },
        mandatoryQuestionsCompleted: {
            type: Boolean,
            default: false
        },
        matchCriteria: {
            gender: String,  // Store the gender they want to match with
            answers: [{      // Store only the 'same' preference answers for matching
                questionId: String,
                value: String
            }]
        }
    },
    { timestamps: true }
);

// Indexes for faster matching
userResponseSchema.index({ 'matchCriteria.gender': 1 });
userResponseSchema.index({ 'matchCriteria.answers.questionId': 1, 'matchCriteria.answers.value': 1 });

module.exports = mongoose.model("UserResponse", userResponseSchema); 