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
const { googleUsers, users } = require('../../models');
const { corsOptions } = require('../../configuration/config');

require('dotenv').config();
const NEW_TOKEN = uuidv1();

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

        const existingUsername = await users.findOne({ where: { username: req.body.username } });
        if (existingUsername) {
            return res.status(400).json({ existingUsername: true, success: false });
        }

        const existingEmail = await users.findOne({ where: { email: req.body.email } });
        if (existingEmail) {
            return res.status(400).json({ existingEmail: true, success: false });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const newUser = {
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            email_verified: false,
            token: NEW_TOKEN,
        };

        const verificationToken = jwt.sign({ userUUID: newUser.uuid }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const verificationLink = `${corsOptions.origin}/auth/verify-email?token=${verificationToken}`;

        const emailSubject = 'Verify Your Email Address';
        const emailBody = `Dear ${newUser.username},\n\nPlease click on the following link to verify your email address:\n${verificationLink}\n\nThank you,\nThe YourApp Team`;

        try {
            await sendMail(newUser.email, emailSubject, emailBody);
        } catch (error) {
            console.error('Error sending verification email:', error);
            return res.status(500).json({ error: 'Error sending verification email', success: false });
        }

        await users.create(newUser);

        return res.status(201).json({ message: 'User registered successfully. Please check your email for verification instructions.', success: true });
    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await users.findOne({ where: { uuid: decoded.userUUID } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ email_verified: true });

        return res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Error verifying email:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;