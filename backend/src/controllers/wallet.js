import { config } from '../config.js';
import { AppError, validationError } from '../errors.js';
import { validateAmount, validateRecipient } from '../validators.js';
import * as walletService from '../services/wallet.js';

export async function getWallet(req, res) {
  const balance = await walletService.getBalance(req.user.id);
  res.json({
    success: true,
    data: { username: req.user.username, balance, maxAmount: config.maxAmount },
  });
}

export async function topUp(req, res) {
  const amount = validateAmount(req.body?.amount, { max: config.maxAmount, kind: 'topup' });
  if (amount.error) throw validationError({ amount: amount.error });

  const balance = await walletService.topUp(req.user.id, amount.value);
  res.status(201).json({ success: true, message: 'Top-up berhasil.', data: { balance } });
}

export async function transfer(req, res) {
  const body = req.body ?? {};
  const recipient = validateRecipient(body.recipient);
  const amount = validateAmount(body.amount, { max: config.maxAmount, kind: 'transfer' });

  const errors = {};
  if (recipient.error) errors.recipient = recipient.error;
  if (amount.error) errors.amount = amount.error;
  if (Object.keys(errors).length) throw validationError(errors);

  const balance = await walletService.transfer(req.user.id, recipient, amount.value);
  res.status(201).json({ success: true, message: 'Transfer berhasil.', data: { balance } });
}

export async function getTransactions(req, res) {
  const { type = 'all' } = req.query;
  if (!walletService.HISTORY_FILTERS.includes(type)) {
    throw validationError({ type: `Filter tidak valid. Pilihan: ${walletService.HISTORY_FILTERS.join(', ')}.` });
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

  const result = await walletService.getHistory(req.user.id, { type, page, limit });
  res.json({ success: true, data: result });
}
