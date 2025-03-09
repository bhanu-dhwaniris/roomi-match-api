const moment = require("moment");

module.exports = function (data = [], message = "", status = 429) {
    const res = this;
    let resData = {
        timestamp: moment().unix(),
        success: false,
        message: message,
        data: data
    };
    return res.status(status).json(resData);
}; 