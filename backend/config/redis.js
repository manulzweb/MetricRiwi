const Redis = require('ioredis');
const env = require('./env');

// BullMQ exige maxRetriesPerRequest: null en sus conexiones.
function createRedisClient(options = {}) {
  return new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...options,
  });
}

module.exports = { createRedisClient };
