// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const emailVerificationRoutes = require('./register/emailVerificationRoutes');
const emailLoginRoutes = require('./login/emailLoginRoutes');
const userLogoutRoutes = require('./logout/logout');

// Mount email verification routes
router.use('/email', emailVerificationRoutes);

router.use('/email', emailLoginRoutes);

router.use('/logout', userLogoutRoutes);

module.exports = router;