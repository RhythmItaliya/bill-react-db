// routes/profile/userProfile.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { googleUsers, users } = require('../../models');

require('dotenv').config();

router.post('/', async (req, res) => {
    try {
        const { token } = req.body;
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

        const [googleUserData, userData] = await Promise.all([
            googleUsers.findOne({ where: { uuid: uuid } }),
            users.findOne({ where: { uuid: uuid } })
        ]);

        if (!googleUserData && !userData) {
            return res.status(404).send({ error: "User not found", success: false });
        }

        let responseData = {};
        if (googleUserData) {
            responseData = extractUserData(googleUserData);
        } else if (userData) {
            responseData = extractUserData(userData);
        }

        return res.status(200).json({ responseData, success: true });
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).send({ error: "Internal Server Error" });
    }
});

function extractUserData(user) {
    return {
        name: user.name,
        username: user.username,
        email: user.email,
        picture: user.picture,
        email_verified: user.email_verified,
        setUsername: user.setUsername,
    };
}

module.exports = router;