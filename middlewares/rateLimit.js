const rateLimit = require("express-rate-limit");

module.exports.rate_limit = rateLimit({
	windowMs: 1 * 60 * 500, // 1 minute
	max: (req) => (req.url.split("/").includes("login") ? 100 : 1000), // Limit each IP to 1 or 100 requests per minute based on the URL
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	message: "You have exceeded your limit.",
	legacyHeaders: false // Disable the `X-RateLimit-*` headers
});
