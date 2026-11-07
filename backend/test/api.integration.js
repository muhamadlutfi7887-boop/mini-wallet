
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { pool } from '../src/db.js';

const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api`;
const run = Date.now().toString(36);

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}

async function makeUser(name, phone) {
  const creds = { username: `${name}_${run}`, email: `${name}_${run}@mail.com`, password: 'password123', phone };
  const reg = await call('POST', '/auth/register', { body: creds });
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  const login = await call('POST', '/auth/login', { body: creds });
  assert.equal(login.status, 200);
  return { ...creds, cookie: login.setCookie.split(';')[0], setCookie: login.setCookie };
}

const ok = (name) => console.log('  ok  ', name);
const phoneBase = String(Date.now()).slice(-8);

try {
  let r = await call('POST', '/auth/register', { body: { username: 'abc', email: 'user@', password: 'short' } });
  assert.equal(r.status, 422); assert.ok(r.json.errors.email && r.json.errors.password); ok('register: email invalid & password < 8 -> 422');

  const a = await makeUser('alice', `0811${phoneBase}`);
  const b = await makeUser('bob', `0812${phoneBase}`);
  const c = await makeUser('carol', `0813${phoneBase}`);
  assert.match(a.setCookie, /HttpOnly/i); ok('login: JWT di httpOnly cookie');

  r = await call('POST', '/auth/register', { body: { username: a.username.toUpperCase(), email: `x_${run}@mail.com`, password: 'password123' } });
  assert.equal(r.status, 422); assert.equal(r.json.errors.username, 'Username sudah digunakan.'); ok('register: username duplikat -> 422');

  r = await call('POST', '/auth/login', { body: { email: a.email, password: 'salahsalah' } });
  assert.equal(r.status, 401); ok('login: password salah -> 401');
  for (const p of ['/wallet', '/transactions']) assert.equal((await call('GET', p)).status, 401);
  assert.equal((await call('POST', '/transfer', { body: {} })).status, 401); ok('endpoint wallet tanpa auth -> 401');

  const cases = [['', 'Nominal tidak boleh kosong.'], ['abc', 'Nominal harus berupa angka.'], ['10$%', 'Nominal harus berupa angka.'],
    ['-100', 'Top-up tidak boleh angka negatif.'], ['1.5', 'Nominal harus berupa bilangan bulat.'], ['99999999', 'Nominal melebihi batas maksimum transaksi.']];
  for (const [amount, msg] of cases) {
    r = await call('POST', '/topup', { cookie: a.cookie, body: { amount } });
    assert.equal(r.status, 422); assert.equal(r.json.message, msg);
  }
  assert.equal((await call('POST', '/topup', { cookie: a.cookie, body: {} })).json.message, 'Nominal tidak boleh kosong.');
  ok('validasi top-up: kosong, huruf, simbol, negatif, desimal, > batas');

  r = await call('POST', '/topup', { cookie: a.cookie, body: { amount: '100000' } });
  assert.equal(r.status, 201); assert.equal(r.json.data.balance, 100000); ok('top-up berhasil');

  r = await call('POST', '/transfer', { cookie: a.cookie, body: { recipient: b.email, amount: '30000' } });
  assert.equal(r.status, 201); assert.equal(r.json.data.balance, 70000); ok('transfer via email');
  r = await call('POST', '/transfer', { cookie: a.cookie, body: { recipient: `+62 812${phoneBase}`, amount: 10000 } });
  assert.equal(r.status, 201); assert.equal(r.json.data.balance, 60000); ok('transfer via nomor HP');

  r = await call('POST', '/transfer', { cookie: a.cookie, body: { recipient: b.email, amount: '999999' } });
  assert.equal(r.status, 400); assert.equal(r.json.message, 'Saldo tidak cukup.'); ok('saldo tidak boleh minus -> 400');
  r = await call('POST', '/transfer', { cookie: a.cookie, body: { recipient: a.email, amount: '1000' } });
  assert.equal(r.status, 400); ok('transfer ke diri sendiri -> 400');
  r = await call('POST', '/transfer', { cookie: a.cookie, body: { recipient: 'nobody@mail.com', amount: '1000' } });
  assert.equal(r.status, 422); ok('penerima tidak ada -> 422');
  r = await call('POST', '/transfer', { cookie: a.cookie, body: { recipient: b.email, amount: 'abc' } });
  assert.equal(r.status, 422); assert.equal(r.json.errors.amount, 'Nominal harus berupa angka.'); ok('validasi nominal transfer');

  const hist = async (u, q = '') => (await call('GET', `/transactions${q}`, { cookie: u.cookie })).json.data;
  const ha = await hist(a), hb = await hist(b), hc = await hist(c);
  assert.equal(ha.total, 3); assert.equal(hb.total, 2); assert.equal(hc.total, 0);
  assert.equal(ha.items[0].direction, 'out'); assert.equal(hb.items[0].direction, 'in'); assert.equal(hb.items[0].counterpart, a.username);
  assert.equal((await hist(a, '?type=out')).total, 2); assert.equal((await hist(a, '?type=topup')).total, 1);
  assert.equal((await call('GET', '/transactions?type=xyz', { cookie: a.cookie })).status, 422);
  ok('riwayat: User A tidak melihat mutasi User B + filter');

  await pool.query(`CREATE TRIGGER fail_tx BEFORE INSERT ON transactions FOR EACH ROW
    BEGIN IF NEW.amount = 777 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'simulasi gagal'; END IF; END`);
  try {
    const before = [(await call('GET', '/wallet', { cookie: a.cookie })).json.data.balance, (await call('GET', '/wallet', { cookie: b.cookie })).json.data.balance];
    r = await call('POST', '/transfer', { cookie: a.cookie, body: { recipient: b.email, amount: '777' } });
    assert.equal(r.status, 500);
    const after = [(await call('GET', '/wallet', { cookie: a.cookie })).json.data.balance, (await call('GET', '/wallet', { cookie: b.cookie })).json.data.balance];
    assert.deepEqual(after, before);
    ok('ROLLBACK: saldo pengirim & penerima tidak berubah saat transfer gagal');
  } finally { await pool.query('DROP TRIGGER fail_tx'); }

  const results = await Promise.all(Array.from({ length: 10 }, () => call('POST', '/transfer', { cookie: a.cookie, body: { recipient: c.email, amount: '20000' } })));
  const success = results.filter((x) => x.status === 201).length;
  const failed = results.filter((x) => x.status === 400).length;
  const balA = (await call('GET', '/wallet', { cookie: a.cookie })).json.data.balance;
  const balC = (await call('GET', '/wallet', { cookie: c.cookie })).json.data.balance;
  assert.equal(success, 3); assert.equal(failed, 7); assert.equal(balA, 0); assert.equal(balC, 60000);
  ok('race condition: 10 transfer paralel, 3 sukses, saldo tepat 0 (tidak double spending)');

  console.log('\nSemua skenario lolos.');
} catch (err) {
  console.error('\nGAGAL:', err);
  process.exitCode = 1;
} finally {
  server.close();
  await pool.end();
}
