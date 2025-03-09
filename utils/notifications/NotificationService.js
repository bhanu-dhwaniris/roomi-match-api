const Notification = require('../../models/Notification');

class NotificationService {
    constructor(io) {
        this.io = io;
    }

    async sendNotification(users, title, message, data = {}) {
        try {
            // Store notification in database
            const notifications = users.map(user => ({
                userId: user._id,
                title,
                message,
                data,
                type: data.type || 'general',
                isRead: false
            }));
            
            await Notification.insertMany(notifications);

            // Send real-time notification via socket
            for (const user of users) {
                this.io.to(user._id.toString()).emit('notification', {
                    title,
                    message,
                    data
                });
            }
        } catch (error) {
            console.error('Notification error:', error);
        }
    }
}

module.exports = NotificationService; 