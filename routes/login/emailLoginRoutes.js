// routes/login/emailLoginRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendMail = require('../../mail/mailer');
const session = require('express-session');
const { v4: uuidv4, v1: uuidv1 } = require('uuid');
const { users, sessions, googleUsers } = require('../../models');
const { corsOptions } = require('../../configuration/config');

require('dotenv').config();

const SESSION_ID = uuidv4();
const NEW_TOKEN = uuidv1();
const CLIENT_URL = `${corsOptions.origin}/auth`;

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

// Login API
router.post('/login', [
    body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid request data', success: false });
        }

        const { email, password } = req.body;

        const user = await users.findOne({ where: { email } });
        if (!user) {
            await bcrypt.hash('fakePassword', 10);
            return res.status(401).json({ notFoundUser: true, success: false });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await bcrypt.hash('fakePassword', 10);
            return res.status(401).json({ wrongPassword: true, success: false });
        }

        if (!user.email_verified) {
            return res.status(401).json({ emailNotVerified: true, success: false });
        }

        const existingSession = await sessions.findOne({ where: { userId: user.id, sessionEnd: false } });
        if (existingSession) {
            await existingSession.update({ sessionEnd: true });
        }

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

        try {
            await sendMail(user.email, 'Successful Login Notification', `Dear ${user.username},\n\nYour account was successfully logged in at ${new Date().toLocaleString()}.\n\nIf you did not perform this action, please contact us immediately.\n\nThank you,\nThe YourApp Team`);
            console.log('Login email notification sent successfully');
        } catch (error) {
            console.error('Error sending login email notification:', error);
        }

    } catch (error) {
        console.error('Error logging in user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post(
    '/verify',
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: "Bad Request", message: errors.array()[0].msg, success: false });
            }

            const { uuid, token } = req.body;
            if (!uuid || !token) {
                return res.status(400).json({ error: "Bad Request", message: "UUID and token are required" });
            }

            let decodedUUID, decodedTOKEN;
            try {
                decodedUUID = jwt.verify(uuid, process.env.JWT_SECRET);
                decodedTOKEN = jwt.verify(token, process.env.ONE_TIME_TOKEN_SECRET);
            } catch (error) {
                return res.status(401).json({ error: "Unauthorized", message: "Invalid token", success: false });
            }

            if (typeof decodedUUID !== 'object' || typeof decodedTOKEN !== 'object') {
                return res.status(401).json({ error: "Unauthorized", message: "Invalid token", success: false });
            }

            let user = await users.findOne({ where: { uuid: decodedUUID.uuid } });

            if (!user) {
                user = await googleUsers.findOne({ where: { uuid: decodedUUID.uuid } });
            }

            if (!user) {
                return res.status(404).json({ error: "Not Found", message: "User not found", success: false });
            }

            if (decodedTOKEN.token !== user.token) {
                return res.status(401).json({ error: "Unauthorized", message: "Tokens do not match", success: false });
            }

            const updatedUser = await user.update({ token: NEW_TOKEN });
            if (!updatedUser) {
                return res.status(500).json({ error: "Internal Server Error", message: "Failed to update token", success: false });
            }

            return res.status(200).json({ message: "Token verified and updated successfully", success: true });
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Internal Server Error", message: "An error occurred while processing your request." });
        }
    }
);


module.exports = router;