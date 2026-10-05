import './env.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { pool, query } from './db.js';
import { migrateAndSeed } from './migrate.js';
import { requireAuth, isAuthed, login, logout } from './auth.js';
import { WEEKS, EXIT_CRITERIA, DAILY_BLOCKS } from './seed/content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../client/dist');
const PORT = process.env.PORT || 3000;

const BLOCK_IDS = new Set(DAILY_BLOCKS.map((b) => b.id));
const CHECK_IDS = new Set([
  ...WEEKS.flatMap((w) => w.checklist.map((c) => c.id)),
  ...EXIT_CRITERIA.map((c) => c.id),
]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Wrap async handlers so errors reach the error middleware.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const optStr = (v, max) => str(v, max) || null;
const weekOrNull = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null;
};

// ---- Health (public) ----
app.get('/health', h(async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, db: 'unreachable' });
  }
}));

// ---- Auth (public) ----
app.post('/api/login', login);
app.post('/api/logout', logout);
app.get('/api/me', (req, res) => res.json({ authed: isAuthed(req) }));

// ---- Everything else requires auth ----
const api = express.Router();
api.use(requireAuth);

// Initial app state in one round trip.
api.get('/state', h(async (req, res) => {
  const [content, settings, checks] = await Promise.all([
    query('SELECT key, data FROM content'),
    query('SELECT key, value FROM settings'),
    query('SELECT item_id FROM checks WHERE done'),
  ]);
  res.json({
    content: Object.fromEntries(content.rows.map((r) => [r.key, r.data])),
    settings: Object.fromEntries(settings.rows.map((r) => [r.key, r.value])),
    checks: checks.rows.map((r) => r.item_id),
  });
}));

api.put('/settings', h(async (req, res) => {
  const { startDate } = req.body || {};
  if (!DATE_RE.test(startDate || '')) return bad(res, 'startDate must be YYYY-MM-DD');
  await query(
    `INSERT INTO settings (key, value) VALUES ('startDate', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [startDate],
  );
  res.json({ ok: true });
}));

api.put('/checks/:id', h(async (req, res) => {
  const { id } = req.params;
  if (!CHECK_IDS.has(id)) return bad(res, 'unknown checklist item');
  await query(
    `INSERT INTO checks (item_id, done) VALUES ($1, $2)
     ON CONFLICT (item_id) DO UPDATE SET done = EXCLUDED.done, updated_at = now()`,
    [id, Boolean(req.body?.done)],
  );
  res.json({ ok: true });
}));

// Daily block logs
api.get('/logs', h(async (req, res) => {
  const { from, to } = req.query;
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) return bad(res, 'from/to must be YYYY-MM-DD');
  const { rows } = await query(
    'SELECT day, block, minutes, done FROM block_logs WHERE day BETWEEN $1 AND $2 ORDER BY day',
    [from, to],
  );
  res.json(rows);
}));

api.put('/logs/:day/:block', h(async (req, res) => {
  const { day, block } = req.params;
  if (!DATE_RE.test(day)) return bad(res, 'bad date');
  if (!BLOCK_IDS.has(block)) return bad(res, 'unknown block');
  const minutes = Math.max(0, Math.min(600, Math.round(Number(req.body?.minutes) || 0)));
  const done = Boolean(req.body?.done);
  await query(
    `INSERT INTO block_logs (day, block, minutes, done) VALUES ($1, $2, $3, $4)
     ON CONFLICT (day, block) DO UPDATE SET minutes = EXCLUDED.minutes, done = EXCLUDED.done, updated_at = now()`,
    [day, block, minutes, done],
  );
  res.json({ day, block, minutes, done });
}));

// Sentence bank
api.get('/sentences', h(async (req, res) => {
  const params = [];
  const where = [];
  const q = str(req.query.q, 200);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(es ILIKE $${params.length} OR note ILIKE $${params.length} OR source ILIKE $${params.length} OR ipa ILIKE $${params.length})`);
  }
  const week = weekOrNull(req.query.week);
  if (week) {
    params.push(week);
    where.push(`week = $${params.length}`);
  }
  if (DATE_RE.test(req.query.minedOn || '')) {
    params.push(req.query.minedOn);
    where.push(`mined_on = $${params.length}`);
  }
  const limit = Math.min(500, Number(req.query.limit) || 500);
  const { rows } = await query(
    `SELECT id, es, ipa, note, week, source, mined_on AS "minedOn", created_at AS "createdAt"
     FROM sentences ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC LIMIT ${limit}`,
    params,
  );
  res.json(rows);
}));

api.post('/sentences', h(async (req, res) => {
  const b = req.body || {};
  const es = str(b.es, 1000);
  if (!es) return bad(res, 'Spanish sentence is required');
  const minedOn = DATE_RE.test(b.minedOn || '') ? b.minedOn : null;
  const { rows } = await query(
    `INSERT INTO sentences (es, ipa, note, week, source, mined_on)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
     RETURNING id, es, ipa, note, week, source, mined_on AS "minedOn", created_at AS "createdAt"`,
    [es, optStr(b.ipa, 1000), optStr(b.note, 2000), weekOrNull(b.week), optStr(b.source, 500), minedOn],
  );
  res.status(201).json(rows[0]);
}));

api.delete('/sentences/:id', h(async (req, res) => {
  await query('DELETE FROM sentences WHERE id = $1', [Number(req.params.id) || 0]);
  res.json({ ok: true });
}));

// Error log
api.get('/errors', h(async (req, res) => {
  const [list, top] = await Promise.all([
    query(`SELECT id, day, said, correct, pattern FROM errors ORDER BY day DESC, id DESC LIMIT 500`),
    query(`SELECT pattern, COUNT(*)::int AS count FROM errors
           GROUP BY pattern ORDER BY count DESC, MAX(created_at) DESC LIMIT 3`),
  ]);
  res.json({ errors: list.rows, top: top.rows });
}));

api.post('/errors', h(async (req, res) => {
  const b = req.body || {};
  const said = str(b.said, 1000);
  const correct = str(b.correct, 1000);
  const pattern = str(b.pattern, 100).toLowerCase();
  if (!said || !correct || !pattern) return bad(res, 'said, correct and pattern are required');
  const day = DATE_RE.test(b.day || '') ? b.day : null;
  const { rows } = await query(
    `INSERT INTO errors (day, said, correct, pattern) VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4)
     RETURNING id, day, said, correct, pattern`,
    [day, said, correct, pattern],
  );
  res.status(201).json(rows[0]);
}));

api.delete('/errors/:id', h(async (req, res) => {
  await query('DELETE FROM errors WHERE id = $1', [Number(req.params.id) || 0]);
  res.json({ ok: true });
}));

app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// ---- Frontend ----
if (fs.existsSync(DIST)) {
  // Vite's hashed bundles can be cached forever; everything else revalidates.
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(DIST, { index: false }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

async function main() {
  await migrateAndSeed();
  const server = app.listen(PORT, () => console.log(`listening on :${PORT}`));
  const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('startup failed', err);
  process.exit(1);
});
