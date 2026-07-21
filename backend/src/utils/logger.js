const env = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = env.nodeEnv === 'production' ? 'info' : 'debug';

function log(level, message, meta = {}) {
  if (LEVELS[level] > LEVELS[currentLevel]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
