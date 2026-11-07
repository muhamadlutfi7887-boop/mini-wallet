const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const PHONE_RE = /^08\d{8,11}$/; 

export function normalizePhone(input) {
  let p = String(input).replace(/[\s-]/g, '');
  if (p.startsWith('+62')) p = '0' + p.slice(3);
  else if (p.startsWith('62')) p = '0' + p.slice(2);
  return p;
}


export function validateAmount(raw, { max, kind = 'transfer' }) {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return { error: 'Nominal tidak boleh kosong.' };
  }
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return { error: 'Nominal harus berupa angka.' };
  }
  const s = String(raw).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { error: 'Nominal harus berupa angka.' };
  if (s.startsWith('-')) {
    return { error: kind === 'topup' ? 'Top-up tidak boleh angka negatif.' : 'Nominal tidak boleh negatif.' };
  }
  if (s.includes('.')) return { error: 'Nominal harus berupa bilangan bulat.' };
  if (/^0+$/.test(s)) return { error: 'Nominal harus lebih dari 0.' };
  if (s.replace(/^0+/, '').length > 15 || Number(s) > max) {
    return { error: 'Nominal melebihi batas maksimum transaksi.' };
  }
  return { value: Number(s) };
}

export function validateRegister(body = {}) {
  const errors = {};
  const username = String(body.username ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const phoneRaw = String(body.phone ?? '').trim();

  if (!username) errors.username = 'Username tidak boleh kosong.';
  else if (!USERNAME_RE.test(username)) errors.username = 'Username 3-30 karakter: huruf, angka, atau underscore.';

  if (!email) errors.email = 'Email tidak boleh kosong.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Format email tidak valid.';

  if (!password) errors.password = 'Password tidak boleh kosong.';
  else if (password.length < 8) errors.password = 'Password minimal 8 karakter.';
  else if (password.length > 72) errors.password = 'Password maksimal 72 karakter.';

  let phone = null;
  if (phoneRaw) {
    phone = normalizePhone(phoneRaw);
    if (!PHONE_RE.test(phone)) errors.phone = 'Nomor HP tidak valid (contoh: 081234567890).';
  }

  return { errors, data: { username, email, password, phone } };
}

export function validateLogin(body = {}) {
  const errors = {};
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email) errors.email = 'Email tidak boleh kosong.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Format email tidak valid.';
  if (!password) errors.password = 'Password tidak boleh kosong.';
  return { errors, data: { email, password } };
}

export function validateRecipient(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return { error: 'Penerima tidak boleh kosong.' };
  if (value.includes('@')) {
    const email = value.toLowerCase();
    return EMAIL_RE.test(email) ? { email } : { error: 'Format email penerima tidak valid.' };
  }
  const phone = normalizePhone(value);
  return PHONE_RE.test(phone) ? { phone } : { error: 'Isi email atau nomor HP penerima yang valid.' };
}
