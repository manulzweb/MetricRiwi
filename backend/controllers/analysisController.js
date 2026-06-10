const analysisService = require('../services/analysisService');

async function upload(req, res) {
  const { title, text } = req.body || {};
  const result = await analysisService.createFromUpload({
    userId: req.user.id,
    title,
    file: req.file,
    text,
  });
  // 202: el análisis quedó encolado; el progreso llega por Socket.io.
  res.status(202).json({ data: result });
}

async function history(req, res) {
  const analyses = await analysisService.getHistory(req.user.id);
  res.json({ data: { analyses } });
}

async function getOne(req, res) {
  const analysis = await analysisService.getAnalysis(req.params.id, req.user.id);
  res.json({ data: { analysis } });
}

module.exports = { upload, history, getOne };
