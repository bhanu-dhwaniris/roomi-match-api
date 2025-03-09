const mongoose = require("mongoose");
// require("../utils/connectDB");
const stateSchema = mongoose.Schema({
	name: { type: String, required: true, index: true },
	code: { type: String, required: true, index: true },
	regionalName: { type: String, default: "" },
	isDeleted: { type: Boolean, default: false },
	createdAt: { type: Date, default: Date.now },
	modifiedAt: { type: Date, default: Date.now }
});

//Create a compound index on code and stateCode fields.
stateSchema.index({name:1, code: 1});
module.exports = mongoose.model("State", stateSchema);
