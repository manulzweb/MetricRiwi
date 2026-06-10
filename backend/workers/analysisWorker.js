const { Worker } = require('bullmq');
const { createRedisClient } = require('../config/redis');
const { ANALYSIS_QUEUE_NAME } = require('../queues/analysisQueue');
const analysisModel = require('../models/analysisModel');
const feedbackModel = require('../models/feedbackModel');
const aiService = require('../services/aiService');
const { emitProgress, emitComplete, emitFailed } = require('../sockets/emitter');

const CHUNK_SIZE = 25;

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function computeSentimentScore(tally) {
  const total = tally.positive + tally.negative + tally.neutral;
  if (total === 0) return 0;
  return Math.round(((tally.positive + tally.neutral * 0.5) / total) * 10000) / 100;
}

async function processAnalysis(job) {
  const { analysisId } = job.data;

  const analysis = await analysisModel.findById(analysisId);
  if (!analysis) {
    throw new Error(`Análisis ${analysisId} no existe`);
  }

  const feedbacks = await feedbackModel.listByAnalysis(analysisId);
  const total = feedbacks.length;

  await analysisModel.updateStatus(analysisId, 'processing');
  emitProgress(analysisId, {
    processed: 0,
    total,
    percent: 0,
    statusText: `Preparando análisis de ${total} comentarios...`,
  });

  const tally = { positive: 0, negative: 0, neutral: 0 };
  const positiveCounts = {};
  const negativeCounts = {};
  let processed = 0;

  for (const batch of chunk(feedbacks, CHUNK_SIZE)) {
    const results = await aiService.classifyChunk(batch.map((f) => f.content));

    await feedbackModel.updateSentiments(
      batch.map((f, i) => ({ id: f.id, sentiment: results[i].sentiment }))
    );

    results.forEach((r) => {
      tally[r.sentiment] += 1;
      if (r.sentiment === 'positive') {
        positiveCounts[r.theme] = (positiveCounts[r.theme] || 0) + 1;
      } else if (r.sentiment === 'negative') {
        negativeCounts[r.theme] = (negativeCounts[r.theme] || 0) + 1;
      }
    });

    processed += batch.length;
    emitProgress(analysisId, {
      processed,
      total,
      percent: Math.round((processed / total) * 90), // el 10% final es la síntesis
      statusText: `Analizando comentario ${processed} de ${total}...`,
    });
  }

  emitProgress(analysisId, {
    processed,
    total,
    percent: 95,
    statusText: 'Generando insights y acciones recomendadas...',
  });

  const summary = await aiService.summarize({
    positiveCounts,
    negativeCounts,
    sampleComments: feedbacks.map((f) => f.content),
  });

  await analysisModel.saveResults(analysisId, {
    sentimentScore: computeSentimentScore(tally),
    positiveThemes: summary.positiveThemes,
    negativeThemes: summary.negativeThemes,
    recommendedActions: summary.recommendedActions,
  });

  emitProgress(analysisId, { processed: total, total, percent: 100, statusText: 'Análisis completado' });
  emitComplete(analysisId);
}

const worker = new Worker(ANALYSIS_QUEUE_NAME, processAnalysis, {
  connection: createRedisClient(),
  concurrency: 2,
  // Límite global de jobs por segundo para no saturar la API de IA.
  limiter: { max: 2, duration: 1000 },
});

worker.on('ready', () => {
  console.log(`[worker] Escuchando la cola "${ANALYSIS_QUEUE_NAME}" (IA: ${aiService.useMock() ? 'mock' : 'Claude'})`);
});

worker.on('failed', async (job, err) => {
  console.error(`[worker] Job ${job?.id} falló (intento ${job?.attemptsMade}):`, err.message);
  // Solo marcar como fallido cuando se agotan los reintentos.
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    try {
      await analysisModel.updateStatus(job.data.analysisId, 'failed');
      emitFailed(job.data.analysisId, 'El análisis falló. Intenta de nuevo más tarde.');
    } catch (updateErr) {
      console.error('[worker] No se pudo marcar el análisis como fallido:', updateErr.message);
    }
  }
});

worker.on('error', (err) => {
  console.error('[worker] Error:', err.message);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
