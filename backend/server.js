const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { initSocket } = require('./sockets/socket');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Frontend estático (SPA)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);

app.use('/api', notFoundHandler);
app.use(errorHandler);

server.listen(env.port, () => {
  console.log(`[server] FeedbackAI escuchando en http://localhost:${env.port}`);
});

// En hosts con un solo proceso (p. ej. plan gratuito de Render) el worker
// puede ejecutarse dentro del mismo proceso que el servidor web.
if (process.env.INLINE_WORKER === 'true') {
  require('./workers/analysisWorker');
  console.log('[server] Worker de análisis ejecutándose en este mismo proceso (INLINE_WORKER=true)');
}

module.exports = { app, server, io };
