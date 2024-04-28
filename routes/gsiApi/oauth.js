const express = require('express');
const router = express.Router();
const { googleUsers, sessions } = require('../../models');
const { OAuth2Client } = require('google-auth-library');
const session = require('express-session');
const sendMail = require('../../mail/mailer');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const sessionOptions = {
  name: 'sessionID',
  secret: process.env.SESSION_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 3600000,
    sameSite: 'strict',
  },
};

router.use(session(sessionOptions));

async function saveUserData(userData) {
  try {
    const savedUser = await googleUsers.create({
      name: userData.name,
      email: userData.email,
      email_verified: userData.email_verified,
      nickname: userData.nickname,
      picture: userData.picture,
      sub: userData.sub,
    });
    return savedUser;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
}

async function saveSessionData(sessionId, userId, expires, data) {
  try {
    const savedSession = await sessions.create({
      sessionId: sessionId,
      userId: userId,
      expires: expires,
      data: data,
    });
    return savedSession;
  } catch (error) {
    console.error('Error saving session data:', error);
    throw error;
  }
}

async function generateJwtToken(user) {
  try {
    const token = jwt.sign({ uuid: user.uuid }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // console.log('jwt', token);
    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw error;
  }
}

async function handleLogin(userData, req, res) {
  try {
    const existingUser = await googleUsers.findOne({ where: { email: userData.email } });

    const token = await generateJwtToken(existingUser || userData);

    const savedUser = existingUser || await saveUserData(userData);

    console.log('Session Data:', req.session);
    await saveSessionData(req.sessionID, savedUser.id, new Date(req.session.cookie.expires), JSON.stringify(req.session));

    const responseData = { user: savedUser, token: token, sessionId: req.sessionID };
    res.status(200).json(responseData);

    if (!existingUser) {
      sendMail(userData.email, 'Welcome to Our Platform!', `Dear ${userData.name},\n\nWelcome to Our Platform! Your account has been successfully created.\n\nIf you have any questions or need assistance, feel free to contact us.\n\nThank you for joining us!\n\nThe YourApp Team`)
        .then(() => {
          console.log('Email sent successfully.');
        })
        .catch((error) => {
          console.error('Error sending email:', error);
        });
    }

  } catch (err) {
    console.error('Error handling login:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}


async function setupSession(req, res) {
  try {
    await req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        throw err;
      }
    });
  } catch (err) {
    console.error('Error setting up session:', err);
    throw err;
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  const code = req.query.code;

  try {
    const redirectURL = "http://127.0.0.1:8080/oauth";
    const oAuth2Client = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      redirectURL
    );

    const ticket = await oAuth2Client.verifyIdToken({ idToken: code, audience: process.env.CLIENT_ID });
    const userData = ticket.getPayload();

    req.session.accessToken = oAuth2Client.credentials.access_token;

    const loginData = await handleLogin(userData, req, res);

    await setupSession(req, res);

    res.status(200).json(loginData);

  } catch (err) {
    console.log('Error logging in with OAuth2 user', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router; 