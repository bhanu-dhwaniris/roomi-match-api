const mongoose = require("mongoose");
const activeUserSchema = new mongoose.Schema(
	{
		socketId: { type: String, default: null },
		userId: { type: String, required: true },
		isLoggedin: { type: Boolean, default: true },
		createdAt: { type: Date, default: Date.now },
		modifiedAt: { type: Date, default: Date.now },
		isDeleted: { type: Boolean, default: false }
	},
	{ timestamps: true }
);

module.exports = mongoose.models.activeUserSchema || mongoose.model("activeuser", activeUserSchema);
