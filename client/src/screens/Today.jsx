import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { addDays, planPosition, prettyDate, todayISO } from '../dates.js';
import { Check, Es, Ipa, Progress, StageBanner, fmtMinutes } from '../components.jsx';

const TIMER_KEY = 'activeTimer';

function readTimer() {
  try {
    return JSON.parse(localStorage.getItem(TIMER_KEY)) || null;
  } catch {
    return null;
  }
}
function writeTimer(t) {
  try {
    t ? localStorage.setItem(TIMER_KEY, JSON.stringify(t)) : localStorage.removeItem(TIMER_KEY);
  } catch {}
}

const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export default function Today({ content, startDate, checks, notify, reload }) {
  const today = todayISO();
  const [viewDate, setViewDate] = useState(today);
  const [logs, setLogs] = useState({}); // `${day}|${block}` -> { minutes, done }
  const [yesterday, setYesterday] = useState([]);
  const [timer, setTimer] = useState(readTimer);
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef(false);

  const pos = planPosition(startDate, viewDate);
  const rangeFrom = pos.status === 'active' ? pos.weekStart : viewDate;
  const rangeTo = pos.status === 'active' ? pos.weekEnd : viewDate;
  const blocks = pos.status === 'active' && pos.day === 7
    ? content.blocks.filter((b) => b.id === 'input')
    : content.blocks;
  const week = pos.status === 'active' ? content.weeks[pos.week - 1] : null;
  const exitDone = content.exit.every((c) => checks.has(c.id));

  const loadLogs = useCallback(async () => {
    try {
      const rows = await api(`/logs?from=${rangeFrom}&to=${rangeTo}`);
      setLogs(Object.fromEntries(rows.map((r) => [`${r.day}|${r.block}`, { minutes: r.minutes, done: r.done }])));
    } catch (e) {
      notify(e.message);
    }
  }, [rangeFrom, rangeTo, notify]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    api(`/sentences?minedOn=${addDays(viewDate, -1)}`)
      .then(setYesterday)
      .catch(() => setYesterday([]));
  }, [viewDate]);

  // Refresh when returning to the app (e.g. after logging on another device).
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && loadLogs();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadLogs]);

  const entry = (day, block) => logs[`${day}|${block}`] || { minutes: 0, done: false };

  const save = async (day, block, patch) => {
    const next = { ...entry(day, block), ...patch };
    setLogs((l) => ({ ...l, [`${day}|${block}`]: next }));
    try {
      await api(`/logs/${day}/${block}`, { method: 'PUT', body: next });
    } catch (e) {
      notify(`Couldn't save: ${e.message}`);
      loadLogs();
    }
  };

  // ---- Timer ----
  useEffect(() => {
    if (!timer) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!timer) return;
    const target = content.blocks.find((b) => b.id === timer.block)?.minutes || 0;
    const base = timer.day === viewDate ? entry(timer.day, timer.block).minutes : 0;
    if (!buzzed.current && base * 60000 + (now - timer.startedAt) >= target * 60000) {
      buzzed.current = true;
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
    }
  });

  const stopTimer = async () => {
    const t = timer;
    if (!t) return;
    setTimer(null);
    writeTimer(null);
    const added = Math.round((Date.now() - t.startedAt) / 60000);
    if (added <= 0) return;
    try {
      // Read the latest value from the server in case the timer's day isn't on screen.
      const [row] = await api(`/logs?from=${t.day}&to=${t.day}`).then((r) => r.filter((x) => x.block === t.block));
      const cur = row || { minutes: 0, done: false };
      const target = content.blocks.find((b) => b.id === t.block)?.minutes || 0;
      const minutes = cur.minutes + added;
      const done = cur.done || minutes >= target;
      await api(`/logs/${t.day}/${t.block}`, { method: 'PUT', body: { minutes, done } });
      notify(`+${added} min logged`);
      loadLogs();
    } catch (e) {
      notify(`Couldn't save timer: ${e.message}`);
    }
  };

  const startTimer = async (block) => {
    if (timer) await stopTimer();
    const t = { day: viewDate, block, startedAt: Date.now() };
    buzzed.current = false;
    setNow(Date.now());
    setTimer(t);
    writeTimer(t);
  };

  // ---- Totals ----
  const weekMinutes = Object.values(logs).reduce((s, e) => s + e.minutes, 0);
  const dayMinutes = blocks.reduce((s, b) => s + entry(viewDate, b.id).minutes, 0);
  const target = content.weeklyTargetMinutes;

  return (
    <div className="stack">
      {exitDone && <StageBanner />}

      <div className="day-nav">
        <button className="icon-btn" onClick={() => setViewDate(addDays(viewDate, -1))} aria-label="Previous day">
          ‹
        </button>
        <div className="day-nav-center">
          {pos.status === 'active' ? (
            <h1>
              Week {pos.week} · Day {pos.day}
            </h1>
          ) : (
            <h1>{viewDate === today ? 'Today' : prettyDate(viewDate)}</h1>
          )}
          <div className="muted">
            {prettyDate(viewDate, { weekday: 'long', month: 'long', day: 'numeric' })}
            {viewDate !== today && (
              <>
                {' · '}
                <button className="linklike" onClick={() => setViewDate(today)}>
                  back to today
                </button>
              </>
            )}
          </div>
        </div>
        <button className="icon-btn" onClick={() => setViewDate(addDays(viewDate, 1))} aria-label="Next day">
          ›
        </button>
      </div>

      {pos.status === 'unset' && <StartDateCard notify={notify} reload={reload} />}
      {pos.status === 'before' && (
        <div className="card notice">
          The plan starts in <strong>{pos.daysUntil}</strong> day{pos.daysUntil === 1 ? '' : 's'} (
          {prettyDate(startDate)}). You can still log practice here.
        </div>
      )}
      {pos.status === 'after' && (
        <div className="card notice">
          The 4-week plan is over. Check your <a href="#/weeks/exit">exit criteria</a>. You can keep logging here.
        </div>
      )}

      {pos.status === 'active' && (
        <section className="card">
          <div className="row between">
            <span className="label">This week</span>
            <span className="tabular">
              <strong>{fmtMinutes(weekMinutes)}</strong> <span className="muted">/ {target / 60} h</span>
            </span>
          </div>
          <Progress value={weekMinutes} max={target} label="Weekly minutes" />
          <div className="row between small muted">
            <span>Today: {fmtMinutes(dayMinutes)}</span>
            <a href="#/weeks">
              Week {pos.week}: {week.title} →
            </a>
          </div>
        </section>
      )}

      {pos.status === 'active' && pos.day === 7 && (
        <p className="muted center">Day 7 is a light day: input only.</p>
      )}

      {blocks.map((b, i) => {
        const e = entry(viewDate, b.id);
        const running = timer && timer.block === b.id && timer.day === viewDate;
        const elapsed = running ? now - timer.startedAt : 0;
        const reached = running && e.minutes * 60000 + elapsed >= b.minutes * 60000;
        return (
          <section key={b.id} className={`card block ${e.done ? 'is-done' : ''} ${running ? 'is-running' : ''}`}>
            <div className="block-head">
              <Check
                checked={e.done}
                onChange={(done) => save(viewDate, b.id, { done })}
                label={
                  <>
                    <span className="block-num">{pos.status === 'active' && pos.day === 7 ? '' : `${i + 1}. `}</span>
                    {b.label}
                  </>
                }
                sub={`${b.minutes} min`}
              />
            </div>

            <div className="block-controls">
              <div className="stepper" aria-label={`${b.label} minutes`}>
                <button onClick={() => save(viewDate, b.id, { minutes: Math.max(0, e.minutes - 5) })} aria-label="Minus 5 minutes">
                  −5
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={e.minutes}
                  onChange={(ev) => setLogs((l) => ({ ...l, [`${viewDate}|${b.id}`]: { ...e, minutes: Math.max(0, Number(ev.target.value) || 0) } }))}
                  onBlur={(ev) => save(viewDate, b.id, { minutes: Math.max(0, Number(ev.target.value) || 0) })}
                  aria-label="Minutes"
                />
                <span className="unit">min</span>
                <button onClick={() => save(viewDate, b.id, { minutes: e.minutes + 5 })} aria-label="Plus 5 minutes">
                  +5
                </button>
              </div>
              <button
                className={`btn timer ${running ? 'running' : ''} ${reached ? 'reached' : ''}`}
                onClick={() => (running ? stopTimer() : startTimer(b.id))}
              >
                {running ? `■ ${clock(elapsed)}` : '▶ Timer'}
              </button>
            </div>

            {b.id === 'shadow' && (
              <div className="block-extra">
                {yesterday.length ? (
                  <ul className="mini-list">
                    {yesterday.slice(0, 5).map((s) => (
                      <li key={s.id}>
                        <Es>{s.es}</Es> <Ipa>{s.ipa}</Ipa>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">
                    No sentences mined yesterday. Pick 2–3 from the <a href="#/bank">bank</a>.
                  </p>
                )}
              </div>
            )}
            {b.id === 'swap' && week && (
              <div className="block-extra small">
                Target: <strong>{week.title}</strong> · <a href="#/drill">Open drill →</a>
              </div>
            )}
            {b.id === 'input' && (
              <div className="block-extra small">
                <a href="#/bank/add">＋ Add a mined sentence</a>
              </div>
            )}
            {b.id === 'errors' && (
              <div className="block-extra small">
                <a href="#/errors/add">＋ Log an error</a>
              </div>
            )}
          </section>
        );
      })}

      {timer && timer.day !== viewDate && (
        <button className="btn block" onClick={stopTimer}>
          ■ Stop timer running on {prettyDate(timer.day)} ({clock(now - timer.startedAt)})
        </button>
      )}
    </div>
  );
}

function StartDateCard({ notify, reload }) {
  const [date, setDate] = useState(todayISO());
  const save = async () => {
    try {
      await api('/settings', { method: 'PUT', body: { startDate: date } });
      reload();
    } catch (e) {
      notify(e.message);
    }
  };
  return (
    <div className="card stack">
      <strong>When does your plan start?</strong>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button className="btn primary block" onClick={save} disabled={!date}>
        Set start date
      </button>
    </div>
  );
}
