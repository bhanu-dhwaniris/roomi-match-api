const mongoose = require("mongoose");
const notifyToUser = new mongoose.Schema(
	{
		userId: { type: String, required: true },
		notificationId: { type: String, required: true },
		isView: { type: Boolean, default: false },
		createdAt: { type: Date, default: Date.now },
		modifiedAt: { type: Date, default: Date.now },
		isDeleted: { type: Boolean, default: false }
	},
	{ timestamps: true }
);

module.exports = mongoose.models.notifyToUser || mongoose.model("Notifytouser", notifyToUser);
