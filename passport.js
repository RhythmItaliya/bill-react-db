// passport.js
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");

require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  scope: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/userinfo.profile'],
  accessType: 'offline',
},
  (accessToken, refreshToken, profile, done) => {

    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
