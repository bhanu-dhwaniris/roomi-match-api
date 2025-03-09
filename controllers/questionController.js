const Question = require('../models/Question');
const UserResponse = require('../models/UserResponse');
const User = require('../models/User');
const { catchAsync } = require('../utils/commonFunctions');
const mongoose = require('mongoose');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const notificationService = require('../utils/notifications');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const questionController = {
    getQuestions: catchAsync(async (req, res) => {
        const questions = await Question.find({ 
            isActive: true, 
            isDeleted: false 
        })
        .sort({ order: 1 });

        // Separate mandatory and optional questions
        const mandatoryQuestions = questions.filter(q => q.isMandatory);
        const optionalQuestions = questions.filter(q => !q.isMandatory);

        return res.Ok(
            { 
                mandatory: mandatoryQuestions,
                optional: optionalQuestions
            },
            'Questions fetched successfully'
        );
    }),

    submitResponses: catchAsync(async (req, res) => {
        const { responses } = req.body;
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!Array.isArray(responses) || responses.length === 0) {
            return res.BadRequest({}, 'Invalid responses format');
        }

        // Validate responses and build maps
        const answerMap = new Map();
        const preferenceMap = new Map();
        const matchCriteria = {
            gender: user.gender,
            answers: []
        };

        // Validate and process responses
        for (const response of responses) {
            const question = await Question.findById(response.questionId);
            if (!question || question.isDeleted || !question.isActive) {
                return res.BadRequest({}, 'Invalid question ID');
            }

            const validOption = question.options.find(opt => opt.value === response.answer);
            if (!validOption) {
                return res.BadRequest({}, `Invalid answer for question: ${question.questionText}`);
            }

            answerMap.set(response.questionId.toString(), response.answer);
            preferenceMap.set(response.questionId.toString(), response.preference);

            // Add to match criteria if preference is 'same'
            if (response.preference === 'same') {
                matchCriteria.answers.push({
                    questionId: response.questionId.toString(),
                    value: response.answer
                });
            }
        }

        try {
            const userResponse = await UserResponse.findOneAndUpdate(
                { userId },
                {
                    $set: {
                        answerMap,
                        preferenceMap,
                        matchCriteria,
                        mandatoryQuestionsCompleted: true
                    }
                },
                { upsert: true, new: true }
            );

            return res.Ok(
                { userResponse },
                'Responses submitted successfully'
            );
        } catch (error) {
            console.error('Response submission error:', error);
            return res.DbError({}, 'Error submitting responses');
        }
    }),

    getUserResponses: catchAsync(async (req, res) => {
        const userId = req.user._id;

        const userResponses = await UserResponse.findOne({ userId })
            .populate('responses.questionId');

        if (!userResponses) {
            return res.Ok(
                { 
                    responses: [],
                    mandatoryQuestionsCompleted: false
                },
                'No responses found'
            );
        }

        return res.Ok(
            { 
                responses: userResponses.responses,
                mandatoryQuestionsCompleted: userResponses.mandatoryQuestionsCompleted
            },
            'Responses fetched successfully'
        );
    }),

    // New method to find matching users
    findMatches: catchAsync(async (req, res) => {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const lastId = req.query.lastId || null;

        const userResponse = await UserResponse.findOne({ userId });
        if (!userResponse?.mandatoryQuestionsCompleted) {
            return res.BadRequest({}, 'Please complete all mandatory questions first');
        }

        // Build match query
        const matchQuery = {
            userId: { $ne: userId },
            mandatoryQuestionsCompleted: true,
            'matchCriteria.gender': userResponse.matchCriteria.gender
        };

        if (lastId) {
            matchQuery._id = { $lt: mongoose.Types.ObjectId(lastId) };
        }

        // Add criteria for 'same' preference answers
        if (userResponse.matchCriteria.answers.length > 0) {
            matchQuery['$and'] = userResponse.matchCriteria.answers.map(({ questionId, value }) => ({
                [`answerMap.${questionId}`]: value
            }));
        }

        // Find matches using aggregation
        const matches = await UserResponse.aggregate([
            { $match: matchQuery },
            { $sort: { _id: -1 } },
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 1,
                    user: {
                        id: '$userDetails._id',
                        name: '$userDetails.name',
                        photo: '$userDetails.photo',
                        gender: '$userDetails.gender',
                        nickname: '$userDetails.nickname',
                        location: '$userDetails.location'
                    },
                    answers: '$answerMap'
                }
            }
        ]);

        // Process matches and create notifications
        const processedMatches = [];
        for (const match of matches) {
            try {
                // Check if match already exists
                const existingMatch = await Match.findOne({
                    users: { $all: [userId, match.user.id] },
                    isDeleted: false
                });

                if (!existingMatch) {
                    // Create new match
                    const newMatch = await Match.create({
                        users: [userId, match.user.id],
                        matchPercentage: 100,
                        notifiedUsers: [userId]
                    });

                    // Get user's FCM tokens
                    const matchedUser = await User.findById(match.user.id);
                    
                    // Send notification using WebSocket
                    await notificationService.sendNotification(
                        [matchedUser],
                        'New Match!',
                        'Someone has matched with you!',
                        {
                            type: NOTIFICATION_TYPES.MATCH_FOUND,
                            matchId: newMatch._id.toString()
                        }
                    );

                    match.matchId = newMatch._id;
                } else {
                    match.matchId = existingMatch._id;
                }

                processedMatches.push(match);
            } catch (error) {
                console.error('Error processing match:', error);
                // Continue with other matches if one fails
                continue;
            }
        }

        const hasMore = processedMatches.length > limit;
        const finalMatches = processedMatches.slice(0, limit);
        const nextCursor = finalMatches.length > 0 ? finalMatches[finalMatches.length - 1]._id : null;

        return res.Ok(
            {
                matches: finalMatches,
                pagination: {
                    hasMore,
                    nextCursor,
                    limit
                }
            },
            'Matches found successfully'
        );
    })
};

module.exports = questionController; 