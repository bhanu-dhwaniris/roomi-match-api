const mongoose = require("mongoose");
// require("../utils/connectDB");
const OtpSchema = mongoose.Schema(
	{
		mobile: { type: String },
		email: { type: String, required: true },
		otp: { type: String, required: true },
		createdAt: { type: Date, default: Date.now },
		expireAt: { type: Date, default: Date.now }
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Otp", OtpSchema);