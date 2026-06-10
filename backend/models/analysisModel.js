const pool = require('../config/db');

async function createAnalysis(userId, title) {
  const { rows } = await pool.query(
    `INSERT INTO analyses (user_id, title)
     VALUES ($1, $2)
     RETURNING id, title, status, created_at`,
    [userId, title]
  );
  return rows[0];
}

async function listByUser(userId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.status, a.sentiment_score, a.created_at,
            COUNT(f.id)::int AS feedback_count
     FROM analyses a
     LEFT JOIN feedbacks f ON f.analysis_id = a.id
     WHERE a.user_id = $1
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
    [userId]
  );
  return rows;
}

async function findByIdForUser(id, userId) {
  const { rows } = await pool.query(
    `SELECT id, title, status, sentiment_score, positive_themes,
            negative_themes, recommended_actions, created_at
     FROM analyses
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM analyses WHERE id = $1', [id]);
  return rows[0] || null;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE analyses SET status = $2 WHERE id = $1', [id, status]);
}

async function saveResults(id, { sentimentScore, positiveThemes, negativeThemes, recommendedActions }) {
  await pool.query(
    `UPDATE analyses
     SET status = 'completed',
         sentiment_score = $2,
         positive_themes = $3,
         negative_themes = $4,
         recommended_actions = $5
     WHERE id = $1`,
    [
      id,
      sentimentScore,
      JSON.stringify(positiveThemes),
      JSON.stringify(negativeThemes),
      JSON.stringify(recommendedActions),
    ]
  );
}

module.exports = {
  createAnalysis,
  listByUser,
  findByIdForUser,
  findById,
  updateStatus,
  saveResults,
};
