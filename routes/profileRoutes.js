// routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const userProfile = require('./profile/userProfile');

router.use('/users', userProfile);

module.exports = router;
