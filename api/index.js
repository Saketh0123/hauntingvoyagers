// Wrap Express app with serverless-http so Vercel treats this file as a function.
// This avoids platform-level NOT_FOUND when rewriting all /api/* paths here.
const serverless = require('serverless-http');
const app = require('./server');

module.exports = serverless(app);
