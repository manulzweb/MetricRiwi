const authService = require('../services/authService');
const userModel = require('../models/userModel');
const { AppError } = require('../middlewares/errorHandler');

async function register(req, res) {
  const { email, password } = req.body || {};
  const { user, token } = await authService.register(email, password);
  res.status(201).json({ data: { user, token } });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  const { user, token } = await authService.login(email, password);
  res.json({ data: { user, token } });
}

async function me(req, res) {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  res.json({ data: { user } });
}

module.exports = { register, login, me };
