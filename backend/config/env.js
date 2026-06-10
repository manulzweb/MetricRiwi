require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgres://feedbackai:feedbackai@localhost:5432/feedbackai',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-no-usar-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
  mockAi: process.env.MOCK_AI === 'true',
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-secret-no-usar-en-produccion') {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

module.exports = env;
