const admin = require('firebase-admin');
// const serviceAccount = require('../config/firebase-service-account.json');

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

const sendPushNotification = async (tokens, title, body, data = {}) => {
    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // For Flutter apps
            },
            tokens,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'matches'
                }
            },
            apns: {
                payload: {
                    aps: {
                        'content-available': 1
                    }
                }
            }
        };

        const response = await admin.messaging().sendMulticast(message);
        return response;
    } catch (error) {
        console.error('Push notification error:', error);
        return null;
    }
};

module.exports = {
    sendPushNotification
}; 