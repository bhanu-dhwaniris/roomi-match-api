const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const { 
    hashPassword, 
    comparePassword, 
    generateToken, 
    formatUserResponse,
    isValidEmail,
    isStrongPassword,
    catchAsync,
    generateOTP,
    sendOTPEmail,
    isValidOTP
} = require('../utils/commonFunctions');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authController = {
    signup: catchAsync(async (req, res) => {
        const { name, email, password } = req.body;

        // Validate email and password
        if (!isValidEmail(email)) {
            return res.BadRequest({}, 'Invalid email format');
        }

        if (!isStrongPassword(password)) {
            return res.BadRequest({}, 'Password must be at least 8 characters long and contain uppercase, lowercase, special characters and numbers');
        }

        // Check if verified user exists
        const existingVerifiedUser = await User.findOne({ 
            email, 
            isDeleted: false,
            isEmailVerified: true 
        });

        if (existingVerifiedUser) {
            return res.Conflict({}, 'Email already registered');
        }

        // Check rate limiting for existing unverified user
        const existingUser = await User.findOne({ email, isDeleted: false });
        if (existingUser && !existingUser.canResendOTP()) {
            return res.TooManyRequests({}, 'Too many signup attempts. Please try again.');
        }

        try {
            const otp = generateOTP();
            const now = new Date();

            // Upsert the user
            const user = await User.findOneAndUpdate(
                { email, isDeleted: false },
                {
                    $set: {
                        name,
                        password: await hashPassword(password),
                        role: "USER",
                        signedUpUser: true,
                        isVerified: false,
                        isEmailVerified: false,
                        'otp.code': await hashPassword(otp),
                        'otp.generatedAt': now,
                        'otp.attempts': 0,
                        'otp.lastAttempt': null,
                        'otp.lastResend': now,
                        'otp.resendCount': existingUser ? (existingUser.otp?.resendCount || 0) + 1 : 1
                    }
                },
                { 
                    new: true,
                    upsert: true
                }
            );

            // Send OTP email
            try {
                await sendOTPEmail(email, otp);
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                return res.InternalError({}, 'Failed to send verification email. Please try again.');
            }


            return res.Ok(
                {
                    message: 'Please verify your email with the OTP sent to your email address',
                    email: user.email
                }, 
                'OTP sent successfully',
                null,
                201
            );
        } catch (error) {
            console.error('Signup error:', error);
            return res.DbError({}, 'Error during signup process');
        }
    }),

    verifyEmail: catchAsync(async (req, res) => {
        const { email, otp } = req.body;

        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.BadRequest({}, 'Invalid email');
        }

        if (user.isEmailVerified) {
            return res.BadRequest({}, 'Email already verified');
        }

        // Check if user can attempt verification
        if (!user.canVerifyOTP()) {
            return res.TooManyRequests({}, 'Too many verification attempts. Please try again later.');
        }

        // Update attempt counter
        user.otp.attempts += 1;
        user.otp.lastAttempt = new Date();
        await user.save();

        // Verify OTP validity period
        if (!isValidOTP(user.otp.code, user.otp.generatedAt)) {
            return res.BadRequest({}, 'OTP has expired');
        }

        // Verify OTP
        const isValidOTPResult = await comparePassword(otp, user.otp.code);
        if (!isValidOTPResult) {
            return res.BadRequest({}, 'Invalid OTP');
        }

        try {
            // Update user verification status
            user.isEmailVerified = true;
            user.isVerified = true;
            user.otp = { 
                code: null, 
                generatedAt: null,
                attempts: 0,
                lastAttempt: null,
                resendCount: 0,
                lastResend: null
            };
            await user.save();

            // Generate token
            const token = await generateToken({ userId: user._id });

            return res.Ok(
                {
                    token,
                    user: formatUserResponse(user)
                },
                'Email verified successfully'
            );
        } catch (error) {
            console.log(error);
            return res.DbError({}, 'Error verifying email');
        }
    }),

    resendOTP: catchAsync(async (req, res) => {
        const { email } = req.body;

        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.BadRequest({}, 'Invalid email');
        }

        if (user.isEmailVerified) {
            return res.BadRequest({}, 'Email already verified');
        }

        // Check if user can request new OTP
        if (!user.canResendOTP()) {
            return res.TooManyRequests({}, 'Too many OTP requests. Please try again later.');
        }

        try {
            const otp = generateOTP();
            
            // Update user's OTP
            user.otp = {
                ...user.otp,
                code: await hashPassword(otp),
                generatedAt: new Date(),
                resendCount: (user.otp.resendCount || 0) + 1,
                lastResend: new Date(),
                attempts: 0,
                lastAttempt: null
            };
            await user.save();

            // Send new OTP email
            await sendOTPEmail(email, otp);

            return res.Ok(
                {
                    message: 'New OTP has been sent to your email address',
                    email: user.email
                },
                'OTP resent successfully'
            );
        } catch (error) {
            console.log(error);
            return res.DbError({}, 'Error resending OTP');
        }
    }),

    login: catchAsync(async (req, res) => {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.BadRequest({}, 'Invalid email or password');
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.UnAuthorized({}, 'Invalid email or password');
        }

        try {
            // Generate token
            const token = await generateToken({ userId: user._id });

            return res.Ok(
                {
                    token,
                    user: formatUserResponse(user)
                },
                'Login successful'
            );
        } catch (error) {
            return res.InternalError({}, 'Error generating authentication token');
        }
    }),

    googleLogin: catchAsync(async (req, res) => {
        const { idToken } = req.body;

        if (!idToken) {
            return res.BadRequest({}, 'Google token is required');
        }

        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const { email, name, picture } = ticket.getPayload();

            let user = await User.findOne({ email, isDeleted: false });
            
            if (!user) {
                user = await User.create({
                    name,
                    email,
                    role: 'user',
                    photo: picture,
                    signedUpUser: true,
                    isVerified: true,
                    isEmailVerified: true
                });
            }

            const token = await generateToken({ userId: user._id });

            return res.Ok(
                {
                    token,
                    user: formatUserResponse(user)
                },
                'Google login successful'
            );
        } catch (error) {
            console.error('Google login error:', error);
            if (error.message.includes('Token used too late')) {
                return res.BadRequest({}, 'Google token has expired');
            }
            return res.InternalError({}, 'Error processing Google login');
        }
    }),

    facebookLogin: catchAsync(async (req, res) => {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.BadRequest({}, 'Facebook access token is required');
        }

        try {
            // Verify Facebook token and get user data
            const response = await axios.get(
                `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
            );

            const { email, name, picture } = response.data;

            if (!email) {
                return res.BadRequest({}, 'Email is required from Facebook');
            }

            // Find or create user
            let user = await User.findOne({ email, isDeleted: false });
            
            if (!user) {
                user = await User.create({
                    name,
                    email,
                    role: 'user',
                    photo: picture?.data?.url,
                    signedUpUser: true,
                    isVerified: true,
                    isEmailVerified: true
                });
            }

            const token = await generateToken({ userId: user._id });

            return res.Ok(
                {
                    token,
                    user: formatUserResponse(user)
                },
                'Facebook login successful'
            );
        } catch (error) {
            console.error('Facebook login error:', error);
            return res.InternalError({}, 'Error processing Facebook login');
        }
    }),

    // Example of a protected route handler
    getProfile: catchAsync(async (req, res) => {
        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.BadRequest({}, 'User not found');
            }

            return res.Ok(
                { user: formatUserResponse(user) },
                'Profile fetched successfully'
            );
        } catch (error) {
            return res.DbError({}, 'Error fetching user profile');
        }
    })
};

module.exports = authController; 