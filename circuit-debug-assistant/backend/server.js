// backend/server.js
// Express server for AI-Driven Hardware Doctor.
//  - Holds the Gemini API key server-side (see src/geminiClient.js) —
//    the browser never sees it.
//  - Exposes POST /api/chat, which the frontend calls instead of hitting
//    Gemini directly.
//  - Serves the static frontend (../frontend) so the whole app runs from a
//    single `npm start` in dev. In production you can instead point any
//    static host at frontend/ and just run this server for /api/*, as long
//    as CORS_ALLOWED_ORIGINS is set.

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { callGemini } from './src/geminiClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (allowedOrigins.length > 0) {
  app.use('/api', cors({ origin: allowedOrigins }));
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasApiKey: !!process.env.GEMINI_API_KEY });
});

app.post('/api/chat', async (req, res) => {
  const { systemPrompt, history, model } = req.body || {};
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return res.status(400).json({ error: 'systemPrompt (string) is required' });
  }
  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'history (array) is required' });
  }
  try {
    const { text } = await callGemini({ systemPrompt, history, model });
    res.json({ text });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'AI request failed' });
  }
});

// Static frontend (dev convenience — see file header).
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI-Driven Hardware Doctor backend listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set — /api/chat will fail. Copy backend/.env.example to backend/.env and fill it in.');
  }
});
