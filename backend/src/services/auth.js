import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { AppError, validationError } from '../errors.js';

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);
export async function register({ username, email, phone, password }) {
  const [dups] = await pool.query(
    'SELECT username, email, phone FROM users WHERE username = ? OR email = ? OR phone = ?',
    [username, email, phone],
  );
  const errors = {};
  for (const d of dups) {
    if (d.username.toLowerCase() === username.toLowerCase()) errors.username = 'Username sudah digunakan.';
    if (d.email === email) errors.email = 'Email sudah terdaftar.';
    if (phone && d.phone === phone) errors.phone = 'Nomor HP sudah terdaftar.';
  }
  if (Object.keys(errors).length) throw validationError(errors);

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      'INSERT INTO users (username, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [username, email, phone, passwordHash],
    );
    return { id: result.insertId, username, email, phone };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const field = ['username', 'email', 'phone'].find((f) => err.sqlMessage?.includes(f)) ?? 'email';
      throw validationError({ [field]: 'Data sudah digunakan.' });
    }
    throw err;
  }
}

export async function login({ email, password }) {
  const [rows] = await pool.query('SELECT id, username, email, password_hash FROM users WHERE email = ?', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'Email atau password salah.');
  return { id: user.id, username: user.username, email: user.email };
}
