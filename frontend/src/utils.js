const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const rupiah = (n) => new Intl.NumberFormat('id-ID').format(n);
export const formatDate = (iso) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export function validateAmount(raw, { max, kind = 'transfer' }) {
  const s = String(raw ?? '').trim();
  if (s === '') return 'Nominal tidak boleh kosong.';
  if (!/^-?\d+(\.\d+)?$/.test(s)) return 'Nominal harus berupa angka.';
  if (s.startsWith('-')) return kind === 'topup' ? 'Top-up tidak boleh angka negatif.' : 'Nominal tidak boleh negatif.';
  if (s.includes('.')) return 'Nominal harus berupa bilangan bulat.';
  if (/^0+$/.test(s)) return 'Nominal harus lebih dari 0.';
  if (s.replace(/^0+/, '').length > 15 || Number(s) > max) return 'Nominal melebihi batas maksimum transaksi.';
  return '';
}

export function validateAuth(mode, f) {
  const e = {};
  const email = f.email.trim();
  if (!email) e.email = 'Email tidak boleh kosong.';
  else if (!EMAIL_RE.test(email)) e.email = 'Format email tidak valid.';
  if (!f.password) e.password = 'Password tidak boleh kosong.';
  else if (mode === 'register' && f.password.length < 8) e.password = 'Password minimal 8 karakter.';
  if (mode === 'register') {
    const username = f.username.trim();
    if (!username) e.username = 'Username tidak boleh kosong.';
    else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) e.username = 'Username 3-30 karakter: huruf, angka, atau underscore.';
    const phone = f.phone.replace(/[\s-]/g, '');
    if (phone && !/^(08|\+628|628)\d{7,11}$/.test(phone)) e.phone = 'Nomor HP tidak valid (contoh: 081234567890).';
  }
  return e;
}
