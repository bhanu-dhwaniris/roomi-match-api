const mongoose = require("mongoose");

const personalitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
});

const Personality = mongoose.model("Personality", personalitySchema);

module.exports = Personality;


