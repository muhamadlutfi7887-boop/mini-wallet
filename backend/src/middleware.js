import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { pool } from './db.js';
import { AppError } from './errors.js';

export const COOKIE_NAME = 'token';

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
  });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd || config.cookieSameSite === 'none',
    sameSite: config.cookieSameSite,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw new AppError(401, 'Silakan login terlebih dahulu.');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Sesi tidak valid atau sudah kedaluwarsa. Silakan login ulang.');
  }

  const [rows] = await pool.query('SELECT id, username, email FROM users WHERE id = ?', [payload.sub]);
  if (!rows[0]) throw new AppError(401, 'Akun tidak ditemukan. Silakan login ulang.');
  req.user = rows[0];
  next();
}
