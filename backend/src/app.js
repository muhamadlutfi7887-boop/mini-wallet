import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import routes from './routes.js';

const app = express();

app.set('trust proxy', 1); 
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' }));
app.use(errorHandler);

export default app;
