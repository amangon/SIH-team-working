import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import { connectDB } from './config/db.js';
import { initSockets } from './sockets/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import { UPLOAD_DIR } from './services/storage.js';

const app = express();
const server = http.createServer(app);

// Render proxy fix
app.set("trust proxy", 1);

/* ── Security & parsing middleware ── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests' },
}));

/* ── Static uploads (local storage driver) ── */
app.use('/uploads', express.static(UPLOAD_DIR));

/* ── Routes ── */
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

/* ── Boot ── */
const PORT = process.env.PORT || 5050;
connectDB()
  .then(() => {
    initSockets(server);
    server.listen(PORT, () => console.log(`✓ TeamSync AI API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('✗ Failed to start:', err.message);
    process.exit(1);
  });
