import 'dotenv/config';

function required(key) {
  if (!process.env[key]) throw new Error(`Environment variable ${key} wajib diisi (lihat .env.example)`);
  return process.env[key];
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  isProd: process.env.NODE_ENV === 'production',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cookieSameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
  maxAmount: Number(process.env.MAX_TRANSACTION_AMOUNT) || 10_000_000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mini_wallet',
  },
};
