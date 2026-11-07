import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAmount, validateRegister, validateRecipient, normalizePhone } from '../src/validators.js';

const opts = { max: 10_000_000 };
const topup = { ...opts, kind: 'topup' };

test('nominal tidak valid ditolak dengan pesan spesifik', () => {
  assert.equal(validateAmount('abc', opts).error, 'Nominal harus berupa angka.');
  assert.equal(validateAmount('', opts).error, 'Nominal tidak boleh kosong.');
  assert.equal(validateAmount('   ', opts).error, 'Nominal tidak boleh kosong.');
  assert.equal(validateAmount(undefined, opts).error, 'Nominal tidak boleh kosong.');
  assert.equal(validateAmount('10@#', opts).error, 'Nominal harus berupa angka.');
  assert.equal(validateAmount('1e5', opts).error, 'Nominal harus berupa angka.');
  assert.equal(validateAmount('Rp10.000', opts).error, 'Nominal harus berupa angka.');
  assert.equal(validateAmount('-5000', topup).error, 'Top-up tidak boleh angka negatif.');
  assert.equal(validateAmount(1500.5, opts).error, 'Nominal harus berupa bilangan bulat.');
  assert.equal(validateAmount('0', opts).error, 'Nominal harus lebih dari 0.');
  assert.equal(validateAmount('10000001', opts).error, 'Nominal melebihi batas maksimum transaksi.');
  assert.equal(validateAmount('99999999999999999999', opts).error, 'Nominal melebihi batas maksimum transaksi.');
  assert.equal(validateAmount({}, opts).error, 'Nominal harus berupa angka.');
});

test('nominal valid menjadi integer', () => {
  assert.equal(validateAmount('50000', opts).value, 50000);
  assert.equal(validateAmount(25000, opts).value, 25000);
  assert.equal(validateAmount('10000000', opts).value, 10_000_000);
});

test('register: email, password, dan username divalidasi', () => {
  const bad = validateRegister({ username: 'julio', email: 'user@', password: 'short' });
  assert.equal(bad.errors.email, 'Format email tidak valid.');
  assert.equal(bad.errors.password, 'Password minimal 8 karakter.');
  const ok = validateRegister({ username: 'julio', email: 'Julio@Mail.com', password: 'password123', phone: '+62 812-3456-7890' });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.data.email, 'julio@mail.com');
  assert.equal(ok.data.phone, '081234567890');
});

test('penerima transfer: email atau nomor HP', () => {
  assert.deepEqual(validateRecipient('A@b.com'), { email: 'a@b.com' });
  assert.deepEqual(validateRecipient('6281234567890'), { phone: '081234567890' });
  assert.ok(validateRecipient('user@').error);
  assert.ok(validateRecipient('').error);
  assert.equal(normalizePhone('0812 3456 7890'), '081234567890');
});
