// routes/register/emailVerificationRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const passwordValidator = require('password-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { v4: uuidv4, v1: uuidv1 } = require('uuid');
const sendMail = require('../../mail/mailer');
const { googleUsers, users, otps, sessions } = require('../../models');
const { corsOptions } = require('../../configuration/config');
const session = require('express-session');

require('dotenv').config();
const NEW_TOKEN = uuidv1();
const SESSION_ID = uuidv4();
const CLIENT_URL = `${corsOptions.origin}/auth`;
const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

router.use(session({
    name: SESSION_ID,
    genid: (req) => {
        return uuidv4();
    },
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 25 * 60 * 60 * 1000,
        secure: true,
        // httpOnly: true,
    }
}));

const passwordSchema = new passwordValidator();
passwordSchema
    .is().min(8)
    .is().max(100)
    .has().uppercase()
    .has().lowercase()
    .has().digits()
    .has().symbols()
    .has().not().spaces();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').notEmpty().withMessage('Email is required')
        .matches(emailRegex).withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .custom((value) => {
            if (!passwordSchema.validate(value)) {
                throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one symbol');
            }
            return true;
        }),
], async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), success: false });
        }

        const { username, email, password } = req.body;

        const [userByUsernameResult, googleUserByUsernameResult] = await Promise.allSettled([
            users.findOne({ where: { username } }),
            googleUsers.findOne({ where: { nickname: username } })
        ]);

        if (userByUsernameResult.status === "fulfilled" && userByUsernameResult.value) {
            return res.status(400).json({ existingUsername: true, success: false });
        }

        if (googleUserByUsernameResult.status === "fulfilled" && googleUserByUsernameResult.value) {
            return res.status(400).json({ existingUsername: true, success: false });
        }

        const [userByEmailResult, googleUserByEmailResult] = await Promise.allSettled([
            users.findOne({ where: { email } }),
            googleUsers.findOne({ where: { email } })
        ]);

        if (userByEmailResult.status === "fulfilled" && userByEmailResult.value) {
            return res.status(400).json({ existingEmail: true, success: false });
        }

        if (googleUserByEmailResult.status === "fulfilled" && googleUserByEmailResult.value) {
            return res.status(400).json({ existingEmail: true, success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            username: username,
            email: email,
            password: hashedPassword,
            email_verified: false,
            token: NEW_TOKEN,
        };

        const createdUser = await users.create(newUser);

        const generatedOTP = generateOTP();
        const expirationTime = new Date(Date.now() + OTP_EXPIRATION_TIME);

        await otps.create({
            otp: generatedOTP,
            userId: createdUser.id,
            expiresAt: expirationTime
        });


        const emailSubject = 'Verify Your Email Address';
        const emailBody = `Dear ${newUser.username},\n\nPlease use the following OTP to verify your email address: ${generatedOTP}\n\nThank you,\nThe YourApp Team`;
        await sendMail(newUser.email, emailSubject, emailBody);

        try {
            await sendMail(newUser.email, emailSubject, emailBody);
            res.status(201).json({ success: true, emailSend: true });
        } catch (error) {
            console.error('Error sending verification email:', error);
            return res.status(400).json({ success: false, emailSendFail: true });
        }
    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).json({ error: 'Internal server error', success: false });
    }
});

router.post('/two-step-verification/verify', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await users.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found.', success: false });
        }

        const otpRecord = await otps.findOne({
            where: {
                userId: user.id,
                otp: otp,
                expiresAt: { [Op.gt]: new Date() }
            }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid OTP.', success: false });
        }

        if (otpRecord.isExpires) {
            return res.status(400).json({ message: 'OTP is isExpired.', success: false });
        }

        if (otpRecord.isVerified) {
            return res.status(400).json({ message: 'OTP already verified.', success: false });
        }

        otpRecord.isVerified = true;
        await otps.update({ isVerified: true }, { where: { id: otpRecord.id } });

        const allOtpsVerified = await otps.count({
            where: {
                userId: user.id,
                isVerified: false
            }
        }) === 0;

        if (allOtpsVerified) {
            await users.update({ email_verified: true }, { where: { id: user.id } });

            await otps.update({ isExpires: true }, { where: { userId: user.id } });

            const sessionData = {
                sessionId: SESSION_ID,
                userId: user.id,
                expires: new Date(Date.now() + 25 * 60 * 60 * 1000),
                data: JSON.stringify({
                    sessionId: SESSION_ID,
                    userUuid: user.uuid,
                    expires: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    createdAt: new Date().toISOString()
                })
            };

            const session = await sessions.create(sessionData);

            const token = jwt.sign({ uuid: user.uuid }, process.env.JWT_SECRET);

            const oneTimeToken = jwt.sign({ token: user.token }, process.env.ONE_TIME_TOKEN_SECRET);

            const redirectData = {
                name: user.username,
                token: token,
                email: user.email,
                sessionName: sessionData.sessionId,
                sessionExpire: sessionData.expires,
                oneTimeToken: oneTimeToken
            };

            const queryString = Object.keys(redirectData).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(redirectData[key])}`).join('&');
            const redirectQueryString = `${CLIENT_URL}?${queryString}`;

            res.status(200).json({ success: true, redirectQueryString });
        } else {
            res.status(400).json({ message: 'Not all OTPs have been verified yet.', success: false });
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Internal server error.', success: false });
    }
});


router.post('/resend-verificationCode', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await users.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found.', success: false });
        }

        // Expire the old OTP
        await otps.update({ isExpires: true }, { where: { userId: user.id } });

        // Generate a new OTP
        const generatedOTP = generateOTP();
        const expirationTime = new Date(Date.now() + OTP_EXPIRATION_TIME);

        // Create a new OTP record
        await otps.create({
            otp: generatedOTP,
            userId: user.id,
            expiresAt: expirationTime
        });

        const emailSubject = 'Resend Verification Code';
        const emailBody = `Dear ${user.username},\n\nYour new OTP is: ${generatedOTP}\n\nThank you,\nThe YourApp Team`;

        try {
            await sendMail(user.email, emailSubject, emailBody);
            return res.status(201).json({ success: true, emailSent: true });
        } catch (error) {
            console.error('Error sending verification email:', error);
            return res.status(400).json({ success: false, emailSendFail: true });
        }
    } catch (error) {
        console.error('Error resending verification code:', error);
        return res.status(500).json({ message: 'Internal server error.', success: false });
    }
});



module.exports = router;