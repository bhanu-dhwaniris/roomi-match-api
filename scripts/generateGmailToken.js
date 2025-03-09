const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
    process.env.clientId,
    process.env.clientSecret,
    'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
    refresh_token: process.env.refreshToken
});

async function getAccessToken() {
    const { token } = await oauth2Client.getAccessToken();
    console.log('Access Token:', token);
}

getAccessToken(); 