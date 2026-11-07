import { useRef, useState } from 'react';
import { validateAmount } from '../utils.js';
import Field from './Field.jsx';
export default function TransactionForm({ title, kind, withRecipient, maxAmount, submitLabel, successText, onSubmit }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [result, setResult] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const lock = useRef(false);

  const amountError = validateAmount(amount, { max: maxAmount, kind });
  const recipientError = withRecipient && !recipient.trim() ? 'Penerima tidak boleh kosong.' : '';
  const valid = !amountError && !recipientError;

  async function submit(e) {
    e.preventDefault();
    if (!valid || lock.current) return;
    lock.current = true;
    setLoading(true);
    setResult({ type: '', text: '' });
    setServerErrors({});
    try {
      await onSubmit({ recipient: recipient.trim(), amount: amount.trim() });
      setAmount('');
      setRecipient('');
      setTouched({});
      setResult({ type: 'success', text: successText });
    } catch (err) {
      setServerErrors(err.errors || {});
      setResult({ type: 'error', text: err.message }); 
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  return (
    <form className="tx-form" onSubmit={submit} noValidate>
      <h3>{title}</h3>
      {withRecipient && (
        <Field label="Email atau nomor HP penerima" value={recipient} autoComplete="off"
          onChange={(e) => { setRecipient(e.target.value); setTouched({ ...touched, recipient: true }); setServerErrors({}); }}
          onBlur={() => setTouched({ ...touched, recipient: true })}
          error={serverErrors.recipient || (touched.recipient ? recipientError : '')} />
      )}
      <Field label="Nominal (Rp)" value={amount} inputMode="numeric" autoComplete="off" placeholder="50000"
        onChange={(e) => { setAmount(e.target.value); setTouched({ ...touched, amount: true }); setServerErrors({}); }}
        onBlur={() => setTouched({ ...touched, amount: true })}
        error={serverErrors.amount || (touched.amount ? amountError : '')} />
      <button className="btn" type="submit" disabled={!valid || loading}>
        {loading ? 'Memproses…' : submitLabel}
      </button>
      {result.text && (
        <p className={`notice ${result.type}`} role={result.type === 'error' ? 'alert' : 'status'}>
          {result.text}
        </p>
      )}
    </form>
  );
}
