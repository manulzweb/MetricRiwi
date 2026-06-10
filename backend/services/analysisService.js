const { parse } = require('csv-parse/sync');
const analysisModel = require('../models/analysisModel');
const feedbackModel = require('../models/feedbackModel');
const { enqueueAnalysis } = require('../queues/analysisQueue');
const { AppError } = require('../middlewares/errorHandler');

const MAX_COMMENTS = 2000;
const MIN_COMMENT_LENGTH = 3;
const COMMENT_HEADERS = ['comment', 'comentario', 'comments', 'comentarios', 'feedback', 'review', 'reseña', 'texto', 'opinion', 'opinión'];

function cleanComments(rawList) {
  const seen = new Set();
  const comments = [];
  for (const raw of rawList) {
    const text = String(raw || '').trim();
    if (text.length < MIN_COMMENT_LENGTH) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    comments.push(text.slice(0, 2000));
    if (comments.length >= MAX_COMMENTS) break;
  }
  return comments;
}

function extractCommentsFromCsv(buffer) {
  let records;
  try {
    records = parse(buffer, {
      bom: true,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    throw new AppError('No se pudo leer el CSV. Verifica el formato del archivo.', 400);
  }
  if (records.length === 0) {
    throw new AppError('El CSV está vacío', 400);
  }

  // Si la primera fila parece encabezado, usar la columna de comentarios; si no, la primera columna.
  const header = records[0].map((c) => String(c).trim().toLowerCase());
  let columnIndex = header.findIndex((h) => COMMENT_HEADERS.includes(h));
  let dataRows = records;
  if (columnIndex >= 0) {
    dataRows = records.slice(1);
  } else {
    columnIndex = 0;
  }

  return cleanComments(dataRows.map((row) => row[columnIndex]));
}

function extractCommentsFromText(text) {
  return cleanComments(String(text).split(/\r?\n/));
}

async function createFromUpload({ userId, title, file, text }) {
  let comments;
  if (file) {
    comments = extractCommentsFromCsv(file.buffer);
  } else if (text && String(text).trim()) {
    comments = extractCommentsFromText(text);
  } else {
    throw new AppError('Debes subir un archivo CSV o pegar comentarios', 400);
  }

  if (comments.length === 0) {
    throw new AppError('No se encontraron comentarios válidos para analizar', 400);
  }

  const cleanTitle = (title && String(title).trim().slice(0, 255)) ||
    `Análisis del ${new Date().toLocaleDateString('es-CO')}`;

  const analysis = await analysisModel.createAnalysis(userId, cleanTitle);
  await feedbackModel.bulkInsert(analysis.id, comments);
  const job = await enqueueAnalysis(analysis.id, userId);

  return {
    analysisId: analysis.id,
    jobId: job.id,
    title: analysis.title,
    status: analysis.status,
    totalComments: comments.length,
  };
}

async function getHistory(userId) {
  return analysisModel.listByUser(userId);
}

async function getAnalysis(id, userId) {
  const analysis = await analysisModel.findByIdForUser(id, userId);
  if (!analysis) {
    throw new AppError('Análisis no encontrado', 404);
  }
  const feedbacks = await feedbackModel.listByAnalysis(id);
  return { ...analysis, feedbacks };
}

module.exports = { createFromUpload, getHistory, getAnalysis };
