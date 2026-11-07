import { pool, withTransaction } from '../db.js';
import { AppError } from '../errors.js';

const NOT_FOUND = () => new AppError(422, 'Penerima tidak ditemukan.', { recipient: 'Penerima tidak ditemukan.' });

export async function getBalance(userId) {
  const [rows] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);
  return rows[0].balance;
}

export async function topUp(userId, amount) {
  return withTransaction(async (conn) => {
    await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    await conn.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
    await conn.query('INSERT INTO transactions (type, receiver_id, amount) VALUES (?, ?, ?)', ['topup', userId, amount]);
    const [rows] = await conn.query('SELECT balance FROM users WHERE id = ?', [userId]);
    return rows[0].balance;
  });
}

export async function transfer(senderId, recipient, amount) {
  const [found] = await pool.query(
    recipient.email ? 'SELECT id FROM users WHERE email = ?' : 'SELECT id FROM users WHERE phone = ?',
    [recipient.email ?? recipient.phone],
  );
  const receiver = found[0];
  if (!receiver) throw NOT_FOUND();
  if (receiver.id === senderId) throw new AppError(400, 'Tidak bisa transfer ke diri sendiri.');

  return withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT id, balance FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE', [
      senderId,
      receiver.id,
    ]);
    const sender = rows.find((r) => r.id === senderId);
    if (rows.length !== 2 || !sender) throw NOT_FOUND();
    if (sender.balance < amount) throw new AppError(400, 'Saldo tidak cukup.');

    await conn.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, senderId]);
    await conn.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, receiver.id]);
    await conn.query('INSERT INTO transactions (type, sender_id, receiver_id, amount) VALUES (?, ?, ?, ?)', [
      'transfer',
      senderId,
      receiver.id,
      amount,
    ]);
    return sender.balance - amount;
  });
}

const FILTERS = {
  all: { sql: '1 = 1', needsUser: false },
  in: { sql: 't.receiver_id = ?', needsUser: true },
  out: { sql: 't.sender_id = ?', needsUser: true },
  topup: { sql: "t.type = 'topup'", needsUser: false },
  transfer: { sql: "t.type = 'transfer'", needsUser: false },
};
export const HISTORY_FILTERS = Object.keys(FILTERS);

export async function getHistory(userId, { type, page, limit }) {
  const filter = FILTERS[type];
  const where = `(t.sender_id = ? OR t.receiver_id = ?) AND ${filter.sql}`;
  const params = [userId, userId, ...(filter.needsUser ? [userId] : [])];

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`, params);
  const [rows] = await pool.query(
    `SELECT t.id, t.type, t.amount, t.created_at, t.sender_id,
            s.username AS sender_username, r.username AS receiver_username
       FROM transactions t
       LEFT JOIN users s ON s.id = t.sender_id
       JOIN users r ON r.id = t.receiver_id
      WHERE ${where}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );

  const items = rows.map((t) => {
    const outgoing = t.sender_id === userId;
    return {
      id: t.id,
      type: t.type,
      direction: outgoing ? 'out' : 'in',
      amount: t.amount,
      counterpart: t.type === 'topup' ? null : outgoing ? t.receiver_username : t.sender_username,
      created_at: t.created_at,
    };
  });
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
