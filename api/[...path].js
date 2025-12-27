const app = require('./server');

module.exports = (req, res) => {
  // Ensure Express receives paths with '/api' prefix so routes match
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};const app = require('./server');

module.exports = (req, res) => {
  return app(req, res);
};