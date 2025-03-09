const moment = require("moment");

module.exports = function (data = [], message = "", total = "", status = 200) {
	const res = this;
	let resData = {
		timestamp: moment().unix(),
		success: true,
		message: message,
		data: data
	};
	if (total) {
		resData["total"] = total;
	}
	return res.status(status).json(resData);
};
