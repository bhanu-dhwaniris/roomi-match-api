const { createSocket } = require("./socketConn");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

let socket = null;

const commonFunctions = {
	// Socket initialization
	fetchServer: async (server) => {
		try {
			console.log("Initializing socket connection");
			socket = await createSocket(server);
			return socket;
		} catch (error) {
			console.error("Socket initialization error:", error);
			throw error;
		}
	},

	// Password hashing
	hashPassword: async (password) => {
		try {
			const salt = await bcrypt.genSalt(12);
			return await bcrypt.hash(password, salt);
		} catch (error) {
			console.error("Password hashing error:", error);
			throw error;
		}
	},

	// Password comparison
	comparePassword: async (password, hashedPassword) => {
		try {
			console.log("hashpassword",this.hashPassword(password));
			return await bcrypt.compare(password, hashedPassword);
		} catch (error) {
			console.error("Password comparison error:", error);
			throw error;
		}
	},

	// Generate JWT token
	generateToken: async (payload, expiresIn = '30d') => {
		try {
			return jwt.sign(
				payload,
				process.env.JWT_SECRET,
				{ expiresIn }
			);
		} catch (error) {
			console.error("Token generation error:", error);
			throw error;
		}
	},

	// Verify JWT token
	verifyToken: async (token) => {
		try {
			return jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			console.error("Token verification error:", error);
			throw error;
		}
	},

	// Format user response (to avoid sending sensitive data)
	formatUserResponse: (user) => {
		return {
			id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			photo: user.photo,
			mobile: user.mobile,
			nickname: user.nickname,
			birthday: user.birthday,
			gender: user.gender,
			location: user.location,
			isVerified: user.isVerified,
			isEmailVerified: user.isEmailVerified,
			isProfileCompleted: user.isProfileCompleted,
			signedUpUser: user.signedUpUser,
			otherDetails: user.otherDetails,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		};
	},

	// Validate email format
	isValidEmail: (email) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	},

	// Validate password strength
	isStrongPassword: (password) => {
		// At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
		return passwordRegex.test(password);
	},

	// Handle async errors
	catchAsync: (fn) => {
		return (req, res, next) => {
			Promise.resolve(fn(req, res, next)).catch(next);
		};
	},

	// Generate OTP
	generateOTP: () => {
		return Math.floor(100000 + Math.random() * 900000).toString();
	},

	// Send OTP via email
	sendOTPEmail: async (email, otp) => {
		try {
			const subject = 'Email Verification OTP';
			const html = emailService.getOTPEmailTemplate(otp);
			
			await emailService.sendEmail(email, subject, html);
			return true;
		} catch (error) {
			console.error("Email sending error:", error);
			throw error;
		}
	},

	// Verify OTP
	isValidOTP: (storedOTP, storedTime) => {
		if (!storedOTP || !storedTime) return false;
		
		// Check if OTP is expired (10 minutes validity)
		const now = new Date();
		const diffInMinutes = (now - storedTime) / (1000 * 60);
		
		return diffInMinutes <= 10;
	}
};

module.exports = commonFunctions;