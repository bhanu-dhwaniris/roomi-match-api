const mongoose = require("mongoose");
const validator = require("../utils/validator");
const { Roles } = require("../configs");

const Email = {
	type: String,
	trim: true,
	lowercase: true,
	required: true,
	index: true,
	validate: {
		validator: validator.validateEmail,
		message: "Please fill a valid email address",
		isAsync: false
	}
};
const Role = {
	type: String,
	enum: {
		values: Roles
	},
	required: true
};
const userSchema = mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		mobile: { type: String, index: true, required: false },
		email: Email,
		password: { type: String},
		role: Role,
		signedUpUser: { type: Boolean, default: null },
		retryTimeStamp: { type: Date, default: null },
		retryCount: { type: Number, default: null },
		photo: { type: String, default: null },
		otherDetails: { type: Object, default: null },
		isVerified: { type: Boolean, default: true },
		isDeleted: { type: Boolean, default: false },
		lastActive: { type: Date, default: null },
		// isVerifiedEmail: { type: Boolean, default: false },
		createdAt: { type: Date, default: Date.now },
		modifiedAt: { type: Date, default: Date.now },
		otp: { 
			code: { type: String, default: null },
			generatedAt: { type: Date, default: null },
			attempts: { type: Number, default: 0 },
			lastAttempt: { type: Date, default: null },
			resendCount: { type: Number, default: 0 },
			lastResend: { type: Date, default: null }
		},
		isEmailVerified: { type: Boolean, default: false },
		nickname: { type: String, trim: true },
		birthday: { type: Date },
		gender: { 
			type: String, 
			enum: ['male', 'female', 'other'],
			default: null
		},
		address:  { 
			city: { type: String, default: null },
			state: { type: String, default: null }
		 },
		isProfileCompleted: { type: Boolean, default: false },
		traits:{type: [mongoose.Schema.Types.ObjectId], ref: 'Personality'},
		connections: [{
			user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			status: { 
				type: String, 
				enum: ['pending', 'accepted', 'blocked'],
				default: 'pending'
			},
			initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			createdAt: { type: Date, default: Date.now }
		}],
		skippedMatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
		// notifySetting: {
		// 	type: {
		// 		status: { type: [String], default: [] },
		// 		isDisable: { type: Boolean, default: true },
		// 		isSilent: { type: Boolean, default: true }
		// 	},
		// 	default: null
		// },
	},
	{ timestamps: true }
);



userSchema.methods.canResendOTP = function() {
	const now = new Date();
	const lastResend = this.otp.lastResend;
	
	// Allow only 3 resend requests within 1 hour
	if (this.otp.resendCount >= 3) {
		if (lastResend && (now - lastResend) < 3600000) { // 1 hour in milliseconds
			return false;
		}
		// Reset counter after 1 hour
		this.otp.resendCount = 0;
	}
	
	// Minimum 1 minute gap between resend requests
	if (lastResend && (now - lastResend) < 60000) { // 1 minute in milliseconds
		return false;
	}
	
	return true;
};

userSchema.methods.canVerifyOTP = function() {
	const now = new Date();
	const lastAttempt = this.otp.lastAttempt;
	
	// Allow only 5 verification attempts within 15 minutes
	if (this.otp.attempts >= 5) {
		if (lastAttempt && (now - lastAttempt) < 900000) { // 15 minutes in milliseconds
			return false;
		}
		// Reset counter after 15 minutes
		this.otp.attempts = 0;
	}
	
	// Minimum 30 seconds gap between attempts
	if (lastAttempt && (now - lastAttempt) < 30000) { // 30 seconds in milliseconds
		return false;
	}
	
	return true;
};

var User = (module.exports = mongoose.models.User || mongoose.model("User", userSchema));
