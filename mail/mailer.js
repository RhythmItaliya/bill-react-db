const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify SMTP connection
transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP connection success:', success);
    }
});

const sendMail = async (to, subject, html) => {
    try {
        // Validate email address
        if (!to || !subject || !html) {
            throw new Error('Invalid parameters. Please provide valid "to", "subject", and "html" values.');
        }

        // Send email
        const info = await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: to,
            subject: subject,
            html: html,
        });

        // console.log('Email sent successfully:', info);
    } catch (error) {
        console.error('Error sending email:', error.message);
        // throw new Error('Failed to send email. Please try again later.');
    }
};

module.exports = sendMail;