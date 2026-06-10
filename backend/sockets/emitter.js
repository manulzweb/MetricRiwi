const { Emitter } = require('@socket.io/redis-emitter');
const { createRedisClient } = require('../config/redis');
const { roomFor } = require('./socket');

// Emisor para procesos sin servidor HTTP (worker): publica vía Redis
// y el adapter del servidor reenvía a los clientes conectados.
const emitter = new Emitter(createRedisClient());

function emitProgress(analysisId, payload) {
  emitter.to(roomFor(analysisId)).emit('job_progress', { analysisId, ...payload });
}

function emitComplete(analysisId) {
  emitter.to(roomFor(analysisId)).emit('job_complete', { analysisId });
}

function emitFailed(analysisId, message) {
  emitter.to(roomFor(analysisId)).emit('job_failed', { analysisId, message });
}

module.exports = { emitProgress, emitComplete, emitFailed };
