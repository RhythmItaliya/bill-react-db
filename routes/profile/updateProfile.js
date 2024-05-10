// routes/profile/updateProfile.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { users, googleUsers } = require('../../models');

require('dotenv').config();

router.put('/users/:uuid', async (req, res) => {
    try {
        const { token, email, username } = req.body;

        if (!token) {
            return res.status(400).json({ error: "Bad Request", message: "Token is required", success: false });
        }

        let decodedUUID;
        try {
            decodedUUID = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: "Unauthorized", message: "Invalid token", success: false });
        }

        const { uuid } = decodedUUID;

        let user = await users.findOne({ where: { uuid: uuid } });
        let isGoogleUser = false;

        if (!user) {
            user = await googleUsers.findOne({ where: { uuid: uuid } });
            isGoogleUser = true;
        }

        if (!user) {
            return res.status(404).json({ error: "User not found", message: "User does not exist", success: false });
        }

        if (email && email !== user.email) {
            const existingEmailUser = await users.findOne({ where: { email: email } });
            const existingGoogleEmailUser = await googleUsers.findOne({ where: { email: email } });

            if (existingEmailUser || existingGoogleEmailUser) {
                return res.status(400).json({ error: "Email already exists", message: "The provided email is already in use", success: false });
            }
        }

        if (username && username !== user.username) {
            const existingUsernameUser = await users.findOne({ where: { username: username } });
            const existingGoogleUsernameUser = await googleUsers.findOne({ where: { username: username } });

            if (existingUsernameUser || existingGoogleUsernameUser) {
                return res.status(400).json({ error: "Username already exists", message: "The provided username is already in use", success: false });
            }
        }

        const userData = {
            name: req.body.name,
            username: req.body.username,
            email: req.body.email,
            email_verified: req.body.email_verified || false,
            picture: req.body.picture,
            setUsername: !!req.body.username,
        };

        if (isGoogleUser) {
            await googleUsers.update(userData, { where: { uuid: uuid } });
        } else {
            await users.update(userData, { where: { uuid: uuid } });
        }

        res.status(200).json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error", message: "Something went wrong", success: false });
    }
});


router.get('/password-set', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: "Bad Request", message: "Token is required", success: false });
        }

        let decodedUUID;

        try {
            decodedUUID = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: "Unauthorized", message: "Invalid token", success: false });
        }

        const { uuid } = decodedUUID;

        try {
            let user = await users.findOne({ where: { uuid: uuid } });

            if (!user) {
                user = await googleUsers.findOne({ where: { uuid: uuid } });
            }

            if (!user) {
                return res.status(404).json({ error: "Not Found", message: "User not found", success: false });
            }

            const passwordSet = !!user.setPassword;

            res.status(200).json({ passwordSet, success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error", message: "Something went wrong", success: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error", message: "Something went wrong", success: false });
    }
});



router.post('/verify-old-password', async (req, res) => {
    try {
        const { token, oldPassword } = req.body;

        if (!token || !oldPassword) {
            return res.status(400).json({ error: "Bad Request", message: "Token and old password are required", success: false });
        }

        let decodedUUID;

        try {
            decodedUUID = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: "Unauthorized", message: "Invalid token", success: false });
        }

        const { uuid } = decodedUUID;

        let user = await users.findOne({ where: { uuid: uuid } });

        if (!user) {
            user = await googleUsers.findOne({ where: { uuid: uuid } });
        }

        if (!user) {
            return res.status(404).json({ error: "User not found", message: "User does not exist", success: false });
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid Password", message: "Old password is incorrect", success: false });
        }

        res.status(200).json({ message: "Old password verified successfully", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error", message: "Something went wrong", success: false });
    }
});


router.put('/new-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: "Bad Request", message: "Token and new password are required", success: false });
        }

        let decodedUUID;

        try {
            decodedUUID = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: "Unauthorized", message: "Invalid token", success: false });
        }

        const { uuid } = decodedUUID;

        let user = await users.findOne({ where: { uuid: uuid } });

        if (!user) {
            user = await googleUsers.findOne({ where: { uuid: uuid } });
        }

        if (!user) {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user = await users.create({ uuid: uuid, password: hashedNewPassword });
            return res.status(201).json({ message: "New user created with password", success: true });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedNewPassword, setPassword: true });

        res.status(200).json({ message: "Password updated successfully", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error", message: "Something went wrong", success: false });
    }
});

module.exports = router;