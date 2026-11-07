import { useRef, useState } from 'react';
import { api } from '../api.js';
import { validateAuth } from '../utils.js';
import Field from './Field.jsx';

const EMPTY = { username: '', email: '', phone: '', password: '' };

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const lock = useRef(false);

  const errors = validateAuth(mode, form);
  const valid = Object.keys(errors).length === 0;
  const shown = (name) => serverErrors[name] || (touched[name] ? errors[name] : '');

  const bind = (name) => ({
    value: form[name],
    onChange: (e) => {
      setForm({ ...form, [name]: e.target.value });
      setTouched({ ...touched, [name]: true });
      setServerErrors({ ...serverErrors, [name]: '' });
    },
    onBlur: () => setTouched({ ...touched, [name]: true }),
  });

  function switchMode(next) {
    setMode(next);
    setForm({ ...EMPTY, email: form.email });
    setTouched({});
    setServerErrors({});
    setMessage({ type: '', text: '' });
  }

  async function submit(e) {
    e.preventDefault();
    if (!valid || lock.current) return; 
    lock.current = true;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (mode === 'register') {
        await api.register({ username: form.username, email: form.email, phone: form.phone, password: form.password });
        setMode('login');
        setForm({ ...EMPTY, email: form.email });
        setTouched({});
        setMessage({ type: 'success', text: 'Akun berhasil dibuat. Silakan masuk.' });
      } else {
        const res = await api.login({ email: form.email, password: form.password });
        onLoggedIn(res.data.user);
      }
    } catch (err) {
      setServerErrors(err.errors || {});
      if (!Object.keys(err.errors || {}).length) setMessage({ type: 'error', text: err.message });
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  const isLogin = mode === 'login';
  return (
    <main className="auth">
      <section className="auth-brand">
        <h1>Mini Wallet</h1>
        <p>Isi saldo, kirim uang ke teman, dan lihat setiap mutasi dalam satu tempat.</p>
      </section>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>{isLogin ? 'Masuk ke akunmu' : 'Buat akun baru'}</h2>
        {message.text && (
          <p className={`notice ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
        {!isLogin && <Field label="Username" autoComplete="username" {...bind('username')} error={shown('username')} />}
        <Field label="Email" type="email" autoComplete="email" {...bind('email')} error={shown('email')} />
        {!isLogin && (
          <Field label="Nomor HP (opsional)" inputMode="tel" autoComplete="tel" {...bind('phone')} error={shown('phone')}
            hint="Dipakai teman untuk mengirim uang ke kamu." />
        )}
        <Field label="Password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'}
          {...bind('password')} error={shown('password')} hint={isLogin ? undefined : 'Minimal 8 karakter.'} />
        <button className="btn" type="submit" disabled={!valid || loading}>
          {loading ? 'Memproses…' : isLogin ? 'Masuk' : 'Buat akun'}
        </button>
        <p className="switch">
          {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button type="button" className="link" onClick={() => switchMode(isLogin ? 'register' : 'login')}>
            {isLogin ? 'Daftar' : 'Masuk'}
          </button>
        </p>
      </form>
    </main>
  );
}
