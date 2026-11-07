import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './middleware.js';
import * as auth from './controllers/auth.js';
import * as wallet from './controllers/wallet.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' },
});

const router = Router();

router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/logout', auth.logout);

router.get('/auth/me', requireAuth, auth.me);
router.get('/wallet', requireAuth, wallet.getWallet);
router.post('/topup', requireAuth, wallet.topUp);
router.post('/transfer', requireAuth, wallet.transfer);
router.get('/transactions', requireAuth, wallet.getTransactions);

export default router;
