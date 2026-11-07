import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { rupiah } from '../utils.js';
import TransactionForm from './TransactionForm.jsx';
import History from './History.jsx';

export default function Dashboard({ user, onLogout, onSessionExpired }) {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.wallet()
      .then((r) => { setWallet(r.data); setError(''); })
      .catch((err) => (err.status === 401 ? onSessionExpired() : setError(err.message)));
  }, [refreshKey]);

  async function run(action) {
    try {
      await action();
    } catch (err) {
      if (err.status === 401) onSessionExpired();
      throw err; 
    }
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="dash">
      <header className="topbar">
        <strong>Mini Wallet</strong>
        <div>
          <span>{user.username}</span>
          <button className="btn ghost" onClick={onLogout}>Keluar</button>
        </div>
      </header>

      <main>
        <aside className="side">
          <section className="balance" aria-label="Saldo">
            <p>Saldo kamu</p>
            {wallet ? (
              <output><span>Rp</span> {rupiah(wallet.balance)}</output>
            ) : (
              <output className="loading">{error || 'Memuat…'}</output>
            )}
          </section>
          {wallet && (
            <>
              <TransactionForm title="Top up saldo" kind="topup" maxAmount={wallet.maxAmount}
                submitLabel="Top up saldo" successText="Saldo berhasil ditambah."
                onSubmit={({ amount }) => run(() => api.topup(amount))} />
              <TransactionForm title="Kirim uang" kind="transfer" withRecipient maxAmount={wallet.maxAmount}
                submitLabel="Kirim uang" successText="Uang terkirim."
                onSubmit={({ recipient, amount }) => run(() => api.transfer(recipient, amount))} />
              <p className="muted limit">Maksimal Rp {rupiah(wallet.maxAmount)} per transaksi.</p>
            </>
          )}
        </aside>
        <History refreshKey={refreshKey} onSessionExpired={onSessionExpired} />
      </main>
    </div>
  );
}
