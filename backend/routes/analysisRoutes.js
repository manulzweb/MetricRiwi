const { Router } = require('express');
const analysisController = require('../controllers/analysisController');
const { requireAuth } = require('../middlewares/auth');
const { csvUpload } = require('../middlewares/upload');

const router = Router();

router.use(requireAuth);

router.post('/upload', csvUpload, analysisController.upload);
router.get('/history', analysisController.history);
router.get('/:id', analysisController.getOne);

module.exports = router;
