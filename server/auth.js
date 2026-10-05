// Single-password auth. The session cookie is a signed expiry timestamp; no session table needed.
// The signing key includes APP_PASSWORD, so changing the password logs out every device.
import crypto from 'node:crypto';

const COOKIE = 'sid';
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const isProd = process.env.NODE_ENV === 'production';

function key() {
  const secret = process.env.SESSION_SECRET || 'dev-only-secret';
  return `${secret}:${process.env.APP_PASSWORD || ''}`;
}

const sign = (value) => crypto.createHmac('sha256', key()).update(value).digest('base64url');

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function isAuthed(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'unauthorized' });
}

// Basic brute-force protection: 10 failed attempts per IP per 15 minutes.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;

export function login(req, res) {
  const ip = req.ip;
  const now = Date.now();
  const rec = failures.get(ip);
  if (rec && now - rec.first < WINDOW_MS && rec.count >= 10) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'APP_PASSWORD is not configured on the server.' });

  const given = String(req.body?.password ?? '');
  // Compare hashes so lengths always match for timingSafeEqual.
  const h = (s) => crypto.createHash('sha256').update(s).digest('hex');
  if (!safeEqual(h(given), h(expected))) {
    const r = rec && now - rec.first < WINDOW_MS ? rec : { first: now, count: 0 };
    r.count += 1;
    failures.set(ip, r);
    return res.status(401).json({ error: 'Wrong password' });
  }

  failures.delete(ip);
  const exp = String(now + MAX_AGE_MS);
  res.cookie(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
  res.json({ ok: true });
}

export function logout(req, res) {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
}
