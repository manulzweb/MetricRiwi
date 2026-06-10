const pool = require('../config/db');

async function bulkInsert(analysisId, contents) {
  const { rows } = await pool.query(
    `INSERT INTO feedbacks (analysis_id, content)
     SELECT $1, unnest($2::text[])
     RETURNING id, content`,
    [analysisId, contents]
  );
  return rows;
}

async function listByAnalysis(analysisId) {
  const { rows } = await pool.query(
    `SELECT id, content, sentiment, created_at
     FROM feedbacks
     WHERE analysis_id = $1
     ORDER BY created_at ASC, id ASC`,
    [analysisId]
  );
  return rows;
}

async function updateSentiments(pairs) {
  // pairs: [{ id, sentiment }]
  if (pairs.length === 0) return;
  await pool.query(
    `UPDATE feedbacks f
     SET sentiment = u.sentiment
     FROM unnest($1::uuid[], $2::varchar[]) AS u(id, sentiment)
     WHERE f.id = u.id`,
    [pairs.map((p) => p.id), pairs.map((p) => p.sentiment)]
  );
}

module.exports = { bulkInsert, listByAnalysis, updateSentiments };
