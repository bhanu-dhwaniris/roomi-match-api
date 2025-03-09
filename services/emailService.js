const nodemailer = require('nodemailer');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

class EmailService {
    constructor() {
        this.emailProvider = process.env.EMAIL_PROVIDER || 'nodemailer';
        
        if (this.emailProvider === 'ses') {
            // Configure AWS SES with SDK v3
            this.sesClient = new SESClient({
                region: process.env.AWS_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                }
            });
        } else {
            // Configure Nodemailer
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }
    }

    async sendEmail(to, subject, html) {
        try {
            if (this.emailProvider === 'ses') {
                const params = {
                    Source: process.env.EMAIL_FROM,
                    Destination: {
                        ToAddresses: [to]
                    },
                    Message: {
                        Subject: {
                            Data: subject,
                            Charset: 'UTF-8'
                        },
                        Body: {
                            Html: {
                                Data: html,
                                Charset: 'UTF-8'
                            }
                        }
                    }
                };

                const command = new SendEmailCommand(params);
                return await this.sesClient.send(command);
            } else {
                return await this.transporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to,
                    subject,
                    html
                });
            }
        } catch (error) {
            console.error('Email sending error:', error);
            throw error;
        }
    }

    // Email templates
    getOTPEmailTemplate(otp) {
        return `
            <h1>Email Verification</h1>
            <p>Your OTP for email verification is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
        `;
    }
}

module.exports = new EmailService(); 