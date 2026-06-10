const { Queue } = require('bullmq');
const { createRedisClient } = require('../config/redis');

const ANALYSIS_QUEUE_NAME = 'feedback-analysis';

const analysisQueue = new Queue(ANALYSIS_QUEUE_NAME, {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

async function enqueueAnalysis(analysisId, userId) {
  return analysisQueue.add('analyze', { analysisId, userId });
}

module.exports = { analysisQueue, enqueueAnalysis, ANALYSIS_QUEUE_NAME };
