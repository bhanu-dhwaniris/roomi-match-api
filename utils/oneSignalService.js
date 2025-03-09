const OneSignal = require('onesignal-node');

const client = new OneSignal.Client(
    process.env.ONESIGNAL_APP_ID,
    process.env.ONESIGNAL_API_KEY
);

const sendPushNotification = async (playerIds, title, message, data = {}) => {
    try {
        const notification = {
            include_player_ids: playerIds,
            contents: {
                'en': message
            },
            headings: {
                'en': title
            },
            data,
            android_channel_id: "matches"
        };

        const response = await client.createNotification(notification);
        return response;
    } catch (error) {
        console.error('Push notification error:', error);
        return null;
    }
};

module.exports = {
    sendPushNotification
}; 