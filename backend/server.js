const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Frontend estático (SPA)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);

app.use('/api', notFoundHandler);
app.use(errorHandler);

server.listen(env.port, () => {
  console.log(`[server] FeedbackAI escuchando en http://localhost:${env.port}`);
});

module.exports = { app, server };
