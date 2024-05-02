const router = require("express").Router();
const passport = require("passport");
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const session = require('express-session');
const { v4: uuidv4, v1: uuidv1 } = require('uuid');
const jwt = require('jsonwebtoken');
const { googleUsers, sessions } = require('../../models');
const sendMail = require('../../mail/mailer');
const { corsOptions } = require("../../configuration/config");

require('dotenv').config();

const CLIENT_URL = `${corsOptions.origin}/auth`;

const SESSION_ID = uuidv4();
const NEW_TOKEN = uuidv1();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.SESSION_KEY || !process.env.JWT_SECRET) {
  throw new Error("Environment variables are not properly configured.");
}

const oauth2Client = new OAuth2({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: `${corsOptions.origin}/auth/google/callback`,
});

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
    httpOnly: true,
  }
}));

router.use(passport.initialize());
router.use(passport.session());

router.get("/login/success", (req, res) => {
  if (req.user) {
    res.status(200).json({
      success: true,
      message: "successful",
    });
  } else {
    res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }
});

router.get("/login/failed", (req, res) => {
  res.status(401).json({
    success: false,
    message: "Authentication failed",
  });
});

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect(CLIENT_URL);
});

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login/failed",
  }),

  async (req, res) => {
    if (req.user) {

      // console.log(req.user);

      const accessToken = req.user.accessToken;
      const refreshToken = req.user.refreshToken;

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const people = google.people({
        version: 'v1',
        auth: oauth2Client,
      });

      people.people.get({
        resourceName: 'people/114910138494166000684',
        personFields: 'addresses,ageRanges,biographies,birthdays,calendarUrls,clientData,coverPhotos,emailAddresses,events,externalIds,genders,imClients,interests,locales,locations,memberships,metadata,miscKeywords,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,sipAddresses,skills,urls,userDefined',
      }, async (err, response) => {
        if (err) {
          console.error('Error fetching user profile:', err);
          return res.status(500).json({ success: false, message: "Error fetching user profile" });
        }

        try {
          const sub = req.user._json.sub;
          const displayName = req.user._json.name;
          const email = req.user._json.email;
          const picture = req.user._json.picture;
          const email_verified = req.user._json.email_verified;

          // Find existing user by email
          let existingUser = await googleUsers.findOne({ where: { email: email } });

          if (!existingUser) {
            const userProfile = {
              name: displayName,
              email: email,
              email_verified: email_verified,
              picture: picture,
              setPassword: false,
              setUsername: false,
              sub: sub,
              googleToken: accessToken,
              token: NEW_TOKEN,
            };
            const newUser = await googleUsers.create(userProfile);
            existingUser = newUser;
          } else {
            await googleUsers.update(
              {
                name: displayName,
                email: email,
                email_verified: email_verified,
                picture: picture,
                sub: sub,
                googleToken: accessToken,
                token: NEW_TOKEN
              },
              { where: { email: email } }
            );
            existingUser = await googleUsers.findOne({ where: { email: email } });
          }

          const existingSession = await sessions.findOne({ where: { userId: existingUser.id, sessionEnd: false } });
          if (existingSession) {
            await existingSession.update({ sessionEnd: true });
          }

          const token = await jwt.sign({ uuid: existingUser.uuid }, process.env.JWT_SECRET);

          const token2 = await jwt.sign({ auth: existingUser.auth }, process.env.JWT_SECRET_TOKEN);

          const oneTimeToken = await jwt.sign({ token: existingUser.token }, process.env.ONE_TIME_TOKEN_SECRET);

          const sessionData = {
            sessionId: SESSION_ID,
            userId: existingUser.id,
            expires: new Date(Date.now() + 25 * 60 * 60 * 1000),
            data: JSON.stringify({
              sessionId: SESSION_ID,
              userUuid: existingUser.uuid,
              expires: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
              createdAt: new Date().toISOString()
            })
          };

          const session = await sessions.create(sessionData);

          const redirectData = {
            name: displayName,
            token: token,
            token2: token2,
            email: email,
            sessionName: sessionData.sessionId,
            sessionExpire: sessionData.expires,
            oneTimeToken: oneTimeToken
          };

          const queryString = Object.keys(redirectData).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(redirectData[key])}`).join('&');
          res.redirect(`${CLIENT_URL}?${queryString}`);

          try {
            await sendMail(existingUser.email, 'Successful Login Notification', `Dear ${existingUser.name},\n\nYour account was successfully logged in at ${new Date().toLocaleString()}.\n\nIf you did not perform this action, please contact us immediately.\n\nThank you,\nThe YourApp Team`);
            console.log('Login email notification sent successfully');
          } catch (error) {
            console.error('Error sending login email notification:', error);
          }

        } catch (error) {
          console.error('Error saving user profile:', error);
          return res.status(500).json({ success: false, message: "Error saving user profile" });
        }

      });
    } else {
      res.status(401).json({
        success: false,
        message: "Authentication failed",
      });
    }
  }
);

module.exports = router;