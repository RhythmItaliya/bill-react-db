// routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const userProfile = require('./profile/userProfile');
const updateProfile = require('./profile/updateProfile');

router.use('/users', userProfile);
router.use('/update', updateProfile);

module.exports = router;