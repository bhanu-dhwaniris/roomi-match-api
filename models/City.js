const mongoose = require("mongoose");
// require("../utils/connectDB");
const { Schema } = mongoose;
const citySchema = mongoose.Schema(
    {
        name: { type: String, required: true, index: true },
        regionalName: { type: String, default: "" },
        isDeleted: { type: Boolean, default: false },
        state:{
			type: Schema.Types.ObjectId,
			ref: "State",
			default: null
		},
        stateCode: { type: String, required: true, index: true },
        createdAt: { type: Date, default: Date.now },
        modifiedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

//Create a compound index on code and stateCode fields.
citySchema.index({stateCode: 1});
module.exports = mongoose.model("City", citySchema);
