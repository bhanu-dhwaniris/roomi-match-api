const mongoose = require("mongoose");

const questionSchema = mongoose.Schema(
    {
        questionText: { 
            type: String, 
            required: true, 
            trim: true 
        },
        category: {
            type: String,
            enum: ['lifestyle', 'habits', 'preferences', 'personality'],
            required: true
        },
        options: [{
            text: { type: String, required: true },
            value: { type: String, required: true }
        }],
        isMandatory: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        },
        order: {
            type: Number,
            required: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Create compound index for ordering and filtering
questionSchema.index({ category: 1, order: 1, isActive: 1, isDeleted: 1 });

const Question = mongoose.model("Question", questionSchema);

// Updated default questions with mandatory flags
const defaultQuestions = [
    {
        questionText: "Do you drink alcohol?",
        category: "lifestyle",
        options: [
            { text: "Never", value: "never" },
            { text: "Occasionally", value: "occasionally" },
            { text: "Socially", value: "socially" },
            { text: "Regularly", value: "regularly" }
        ],
        isMandatory: true,
        order: 1
    },
    {
        questionText: "What's your typical bedtime?",
        category: "habits",
        options: [
            { text: "Before 10 PM", value: "early" },
            { text: "10 PM - 12 AM", value: "medium" },
            { text: "After 12 AM", value: "late" }
        ],
        isMandatory: true,
        order: 2
    },
    {
        questionText: "Do you smoke?",
        category: "lifestyle",
        options: [
            { text: "Never", value: "never" },
            { text: "Occasionally", value: "occasionally" },
            { text: "Regularly", value: "regularly" }
        ],
        order: 3
    },
    {
        questionText: "How often do you cook?",
        category: "habits",
        options: [
            { text: "Never", value: "never" },
            { text: "Sometimes", value: "sometimes" },
            { text: "Often", value: "often" },
            { text: "Daily", value: "daily" }
        ],
        order: 4
    },
    {
        questionText: "How do you prefer to spend weekends?",
        category: "preferences",
        options: [
            { text: "Staying in", value: "indoor" },
            { text: "Going out", value: "outdoor" },
            { text: "Mix of both", value: "mixed" }
        ],
        order: 5
    },
    {
        questionText: "How often do you exercise?",
        category: "lifestyle",
        options: [
            { text: "Never", value: "never" },
            { text: "1-2 times a week", value: "light" },
            { text: "3-4 times a week", value: "moderate" },
            { text: "5+ times a week", value: "heavy" }
        ],
        order: 6
    }
];

// Function to initialize default questions
Question.initializeDefaultQuestions = async function() {
    try {
        const count = await this.countDocuments();
        if (count === 0) {
            await this.insertMany(defaultQuestions);
            console.log('Default questions initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing default questions:', error);
    }
};

module.exports = Question; 