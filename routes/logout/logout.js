const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sessions, users, googleUsers } = require('../../models');
const jwt = require('jsonwebtoken');
const axios = require('axios');

require('dotenv').config();

router.post('/', async function (req, res, next) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User Id is required' });
        }

        const token = userId && userId._Xtoken;

        if (!token) {
            return res.status(400).json({ success: false, error: 'JWT token is required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ success: false, error: 'Invalid JWT token' });
        }

        if (!decoded || !decoded.uuid) {
            return res.status(401).json({ success: false, error: 'Invalid JWT token' });
        }

        let user = await users.findOne({
            where: { uuid: decoded.uuid }
        });

        let isGoogleUser = false;

        if (!user) {
            user = await googleUsers.findOne({
                where: { uuid: decoded.uuid }
            });
            isGoogleUser = true;
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const allSessions = await sessions.findAll({
            where: { userId: user.id },
            order: [['createdAt', 'DESC']]
        });

        const lastSession = allSessions[0];

        await sessions.destroy({
            where: {
                userId: user.id,
                id: { [Op.ne]: lastSession.id }
            }
        });

        if (isGoogleUser && user.googleToken) {
            const response = await axios.post(`https://oauth2.googleapis.com/revoke?token=${user.googleToken}`);
            if (response.status === 200) {
                console.log({ success: true });
            } else {
                console.log({ success: false });
            }
        }

        return res.status(200).json({ success: true, message: 'Logout successful' });

    } catch (err) {
        console.error('Error logging out:', err);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
