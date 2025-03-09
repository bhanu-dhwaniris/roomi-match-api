const badRequest = require("../response/badRequest");
const dbError = require("../response/dbError");
const internalError = require("../response/internalError");
const unAuthorized = require("../response/unAuthorized");
const conflict = require("../response/conflict");
const ok = require("../response/ok");
const tooManyRequests = require("../response/tooManyRequests");

module.exports = (req, res, next) => {
	res["Ok"] = ok;
	res["BadRequest"] = badRequest;
	res["DbError"] = dbError;
	res["InternalError"] = internalError;
	res["UnAuthorized"] = unAuthorized;
	res["Conflict"] = conflict;
	res["TooManyRequests"] = tooManyRequests;
	next();
};
