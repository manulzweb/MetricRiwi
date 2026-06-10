const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/userModel');
const { AppError } = require('../middlewares/errorHandler');

const SALT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(email, password) {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new AppError('Email inválido', 400);
  }
  if (!password || password.length < 8) {
    throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
  }
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function register(email, password) {
  validateCredentials(email, password);
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await userModel.findByEmail(normalizedEmail);
  if (existing) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userModel.createUser(normalizedEmail, passwordHash);
  return { user, token: signToken(user) };
}

async function login(email, password) {
  if (!email || !password) {
    throw new AppError('Email y contraseña son obligatorios', 400);
  }

  const user = await userModel.findByEmail(email.trim().toLowerCase());
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  return {
    user: { id: user.id, email: user.email, created_at: user.created_at },
    token: signToken(user),
  };
}

module.exports = { register, login };
