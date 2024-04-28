// configuration/config.js
module.exports = {
  corsOptions: {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  },
  cookieSecret: 'QWERTYUIOPLKJHGFDSAZXCVBNM',
};