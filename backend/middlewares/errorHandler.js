// Error de aplicación con código HTTP asociado.
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({
    error: {
      message: status >= 500 ? 'Error interno del servidor' : err.message,
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Recurso no encontrado' } });
}

module.exports = { AppError, errorHandler, notFoundHandler };
