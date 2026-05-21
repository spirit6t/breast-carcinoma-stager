import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createEmptyCase, MODES } from './caseModel.js';
import { suggestSpecimenCpt, computeIhcBilling } from './billing.js';
import { assembleReport } from './reportAssembler.js';
import { runAgent } from './agent.js';
import { saveDiagnosticComment } from './pathology/airtableClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const STATIC_DIR = path.join(__dirname, '../client/dist');

// Serve built React app in production
if (process.env.NODE_ENV === 'production') {
  if (existsSync(STATIC_DIR)) {
    console.log(`[static] serving client from ${STATIC_DIR}`);
  } else {
    console.error(`[ERROR] client/dist not found at ${STATIC_DIR} — client was not built`);
  }
  app.use(express.static(STATIC_DIR));
}

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, modes: Object.values(MODES), ajcc: '8' })
);

app.post('/api/case/new', (req, res) => {
  res.json(createEmptyCase(req.body?.mode));
});

app.post('/api/billing/specimen-cpt', (req, res) => {
  const { designation } = req.body || {};
  res.json(suggestSpecimenCpt(designation) || { cpt: null });
});

app.post('/api/billing/ihc', (req, res) => {
  res.json({ billing: computeIhcBilling(req.body?.ihc || []) });
});

app.post('/api/report', (req, res) => {
  const c = req.body?.case;
  if (!c) return res.status(400).json({ error: 'case required' });
  try {
    res.json({ reportText: assembleReport(c) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/agent/step', async (req, res) => {
  try {
    const { provider, apiKey, model, caseState, userMessage, history } = req.body || {};
    if (!caseState) return res.status(400).json({ error: 'caseState required' });
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
    const out = await runAgent({ provider, apiKey, model, caseState, userMessage, history });
    res.json(out);
  } catch (e) {
    console.error('[agent] error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Save AI-generated diagnostic comment to Airtable PathPattern
app.post('/api/airtable/save-comment', async (req, res) => {
  try {
    const { name, commentText, note } = req.body || {};
    if (!name || !commentText) return res.status(400).json({ error: 'name and commentText required' });
    const result = await saveDiagnosticComment({ name, commentText, note });
    res.json(result);
  } catch (e) {
    console.error('[airtable] save-comment error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// SPA fallback — must come after all API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) =>
    res.sendFile(path.join(STATIC_DIR, 'index.html'))
  );
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Breast Stager API on http://localhost:${PORT}`);
});
