import { useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); 
  useEffect(() => {
    api.me().then((r) => setUser(r.data.user)).catch(() => setUser(null));
  }, []);

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
  }

  if (user === undefined) return <p className="boot">Memuat…</p>;
  if (!user) return <Login onLoggedIn={setUser} />;
  return <Dashboard user={user} onLogout={logout} onSessionExpired={() => setUser(null)} />;
}
