// All dates are local-calendar 'YYYY-MM-DD' strings, computed on the device so "today" matches your phone.
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Rounded so DST transitions don't produce off-by-one.
export const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

export const PLAN_DAYS = 28;

/** Where `date` falls in the 4-week plan that begins on `startDate`. */
export function planPosition(startDate, date) {
  if (!startDate) return { status: 'unset' };
  const diff = diffDays(startDate, date);
  if (diff < 0) return { status: 'before', daysUntil: -diff };
  if (diff >= PLAN_DAYS) return { status: 'after' };
  const weekIdx = Math.floor(diff / 7);
  const weekStart = addDays(startDate, weekIdx * 7);
  return { status: 'active', week: weekIdx + 1, day: (diff % 7) + 1, weekStart, weekEnd: addDays(weekStart, 6) };
}

/** Highest week unlocked as of today (1 before the plan starts, 4 after it ends). */
export function unlockedWeek(startDate, date = todayISO()) {
  const p = planPosition(startDate, date);
  if (p.status === 'active') return p.week;
  if (p.status === 'after') return 4;
  return 1;
}

export function prettyDate(s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return parseISO(s).toLocaleDateString(undefined, opts);
}
