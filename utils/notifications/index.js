const NotificationService = require('./NotificationService');
const { io } = require('../socketConn'); // Import your socket instance

const notificationService = new NotificationService(io);

module.exports = notificationService; 