// const { systemConfig } = require("../configs");

const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const validateEmail = function (email) {
	return re.test(email);
};

const isValid = function (value) {
	if (typeof value === "undefined" || value === null) return false;
	if (typeof value === "string" && value.trim().length === 0) return false;
	return true;
};

// const isValidRole = function (role) {
// 	return systemConfig.roleEnumArray.indexOf(role) !== -1;
// };

const isValidRequestBody = function (requestBody) {
	return Object.keys(requestBody).length > 0;
};

module.exports = {
	validateEmail,
	emailRegex: re,
	isValid,
	// isValidRole,
	isValidRequestBody
};
