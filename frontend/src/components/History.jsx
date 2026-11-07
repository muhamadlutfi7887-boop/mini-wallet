import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, rupiah } from '../utils.js';

const FILTERS = [
  ['all', 'Semua'],
  ['in', 'Uang masuk'],
  ['out', 'Uang keluar'],
  ['topup', 'Top-up'],
  ['transfer', 'Transfer'],
];

function describe(t) {
  if (t.type === 'topup') return 'Top-up saldo';
  return t.direction === 'out' ? `Kirim ke ${t.counterpart}` : `Terima dari ${t.counterpart}`;
}

export default function History({ refreshKey, onSessionExpired }) {
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .transactions({ type, page, limit: 8 })
      .then((r) => active && (setData(r.data), setError('')))
      .catch((err) => {
        if (err.status === 401) return onSessionExpired();
        active && setError(err.message);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [type, page, refreshKey]);

  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history-head">
        <h2 id="history-title">Riwayat transaksi</h2>
        <label className="filter">
          <span>Tampilkan</span>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            {FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}
      {!data && loading && <p className="muted">Memuat riwayat…</p>}
      {data && data.items.length === 0 && (
        <p className="muted empty">Belum ada transaksi di sini. Coba top up saldo atau kirim uang ke teman.</p>
      )}
      {data && data.items.length > 0 && (
        <div className="table-wrap" aria-busy={loading}>
          <table>
            <thead>
              <tr><th>Waktu</th><th>Keterangan</th><th className="num">Nominal</th></tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.created_at)}</td>
                  <td>{describe(t)}</td>
                  <td className={`num ${t.direction}`}>{t.direction === 'in' ? '+' : '-'}Rp {rupiah(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.totalPages > 1 && (
        <nav className="pager" aria-label="Halaman riwayat">
          <button className="btn ghost" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Sebelumnya</button>
          <span>Halaman {data.page} dari {data.totalPages}</span>
          <button className="btn ghost" disabled={page >= data.totalPages || loading} onClick={() => setPage(page + 1)}>Berikutnya</button>
        </nav>
      )}
    </section>
  );
}
