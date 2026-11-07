import { COOKIE_NAME, cookieOptions, signToken } from '../middleware.js';
import { validationError } from '../errors.js';
import { validateLogin, validateRegister } from '../validators.js';
import * as authService from '../services/auth.js';

export async function register(req, res) {
  const { errors, data } = validateRegister(req.body);
  if (Object.keys(errors).length) throw validationError(errors);

  const user = await authService.register(data);
  res.status(201).json({ success: true, message: 'Registrasi berhasil. Silakan login.', data: { user } });
}

export async function login(req, res) {
  const { errors, data } = validateLogin(req.body);
  if (Object.keys(errors).length) throw validationError(errors);

  const user = await authService.login(data);
  const token = signToken(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ success: true, message: 'Login berhasil.', data: { user, token } });
}

export function logout(req, res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
  res.json({ success: true, message: 'Logout berhasil.' });
}

export function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}
