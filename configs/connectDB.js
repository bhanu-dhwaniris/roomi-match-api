const mongoose = require('mongoose');

const connectDB = ()=>{
    mongoose
	.connect(process.env.CONNECTION_STRING)
	.then(() => console.log("mongodb running on 27017"))
	.catch((err) => console.log(err));
}

module.exports = connectDB;