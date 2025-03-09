module.exports = {
	Roles: ["ADMIN", "USER"],
	aws_cred: {
        "development": {
            "accessKeyId": process.env.AWS_SQS_ACCESS_KEY,
            "secretAccessKey": process.env.AWS_SQS_SECRET_KEY,
            "region": process.env.AWS_SQS_SECRET_REGION,
            "emailUrl": process.env.AWS_SQS_EMAIL_URL
        },
        "staging": {
            "accessKeyId": process.env.AWS_SQS_ACCESS_KEY,
            "secretAccessKey": process.env.AWS_SQS_SECRET_KEY,
            "region": process.env.AWS_SQS_SECRET_REGION,
            "emailUrl": process.env.AWS_SQS_EMAIL_URL
        },
        "production": {
            "accessKeyId": process.env.AWS_SQS_ACCESS_KEY,
            "secretAccessKey": process.env.AWS_SQS_SECRET_KEY,
            "region": process.env.AWS_SQS_SECRET_REGION,
            "emailUrl": process.env.AWS_SQS_EMAIL_URL
        }
    },
};