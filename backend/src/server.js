import app from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

try {
  await pool.query('SELECT 1');
} catch (err) {
  console.error('Gagal terhubung ke MySQL. Cek DB_* di .env dan pastikan schema.sql sudah dijalankan.\n', err.message);
  process.exit(1);
}

app.listen(config.port, () => console.log(`Mini Wallet API jalan di http://localhost:${config.port}`));
