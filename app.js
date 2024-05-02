// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const path = require('path');
const createError = require('http-errors');
const logger = require('morgan');
const passportSetup = require("./passport");
const passport = require("passport");
const config = require('./configuration/config');
const app = express();

// Middleware
app.use(cors(config.corsOptions));
app.use(bodyParser.json());
app.use(cookieParser(config.cookieSecret));

app.options('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", 'http://localhost:5173');
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", ['X-Requested-With', 'content-type', 'credentials']);
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.status(200);
  next()
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(passport.initialize());

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/userAuth', authRoutes);

const profileRoute = require("./routes/profileRoutes");
app.use('/profile', profileRoute);

const oauthRouter = require('./routes/gsiApi/oauth');
const keysRouter = require('./routes/gsiApi/getKeys');
app.use('/oauth', oauthRouter);
app.use('/getkeys', keysRouter);

const passportRoute = require("./routes/googlepassport/auth");
app.use('/auth', passportRoute);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;