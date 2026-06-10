const multer = require('multer');
const { AppError } = require('./errorHandler');

const ACCEPTED_MIMES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]);

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const isCsvName = file.originalname.toLowerCase().endsWith('.csv');
    if (ACCEPTED_MIMES.has(file.mimetype) || isCsvName) {
      return cb(null, true);
    }
    cb(new AppError('El archivo debe ser un CSV', 400));
  },
}).single('file');

// Envuelve multer para traducir sus errores al formato de la app.
function csvUpload(req, res, next) {
  uploadCsv(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('El archivo supera el límite de 2MB', 400));
    }
    next(err);
  });
}

module.exports = { csvUpload };
