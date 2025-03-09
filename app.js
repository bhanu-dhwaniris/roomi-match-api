const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { fetchServer } = require("./utils/commonFunctions");

// Uncomment the route import and usage
const route = require("./routes");
const app = express();
const response = require("./response/send");
const mongoose = require("mongoose");
const cors = require("cors");
const expressSanitizer = require("express-sanitizer");
const log = require("morgan");
const { rate_limit } = require("./middlewares/rateLimit");
const connectDB = require("./configs/connectDB");

connectDB();


// @Base Url
app.use((req, res, next) => {
	req["currentUrl"] = `${req.protocol + "://" + req.headers.host}`;
	next();
});

app.use(log("dev"));
const urls = process.env.ALLOWED_DOMAINS || "http://localhost:3000";

app.use(
	cors({
		origin: urls.split(","),
		optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
	})
);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(expressSanitizer());
app.set('view engine', 'ejs');
app.set('views','./views');

app.use(express.static('public'));

app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "DELETE", "GET, POST, PUT");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	res.setHeader("Access-Control-Allow-Credentials", true);
	// res.setHeader("Content-Security-Policy", csp);
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "SAMEORIGIN");
	res.setHeader("X-XSS-Protection", "1; mode=block");
	res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	res.setHeader("Referrer-Policy", "same-origin");
	res.setHeader("Feature-Policy", 'geolocation "self"; camera "none"');
	next();
});

app.use(response);



app.get("/", (req,res)=>{
	return res.Ok({},"Welcome !!")
});

// Uncomment this line to enable the routes
app.use("/api/v1", rate_limit, route);

let server = http.createServer(app);

// connect with socket
fetchServer(server);

app.use(function (error,req, res, next) {
	return res.BadRequest({},error.message);
});


app.use(function (req, res, next) {
	return res.BadRequest({},"Sorry, this is an invalid URL.");
});

// Add graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM signal received: closing HTTP server');
	server.close(() => {
		console.log('HTTP server closed');
		mongoose.connection.close(false, () => {
			console.log('MongoDB connection closed');
			process.exit(0);
		});
	});
});

server.listen(process.env.PORT || 3000, function () {
	console.log("Express app running on port " + (process.env.PORT || 3000));
});