let app = null;

module.exports = async function handler(req, res) {
  if (!app) {
    app = require('../src/app');
  }
  return app(req, res);
};
