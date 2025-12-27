const app = require('./server');

module.exports = (req, res) => {
  return app(req, res);
};// Export the Express app directly as a Vercel function handler
const app = require('./server');
module.exports = app;
