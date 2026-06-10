const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { createRedisClient } = require('../config/redis');
const analysisModel = require('../models/analysisModel');

function roomFor(analysisId) {
  return `analysis:${analysisId}`;
}

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  // Adapter Redis: permite que el worker (proceso aparte) emita a las salas.
  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Autenticación JWT en el handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No autenticado'));
    }
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    // El cliente se suscribe al progreso de un análisis específico.
    socket.on('join_room', async (analysisId, ack) => {
      try {
        const analysis = await analysisModel.findByIdForUser(analysisId, socket.data.userId);
        if (!analysis) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Análisis no encontrado' });
          return;
        }
        await socket.join(roomFor(analysisId));
        if (typeof ack === 'function') ack({ ok: true, status: analysis.status });
      } catch (err) {
        console.error('[socket] Error en join_room:', err.message);
        if (typeof ack === 'function') ack({ ok: false, error: 'Error interno' });
      }
    });

    socket.on('leave_room', (analysisId) => {
      socket.leave(roomFor(analysisId));
    });
  });

  return io;
}

module.exports = { initSocket, roomFor };
