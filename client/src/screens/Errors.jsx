import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { prettyDate, todayISO } from '../dates.js';
import { Es } from '../components.jsx';

const blank = () => ({ day: todayISO(), said: '', correct: '', pattern: '' });

export default function Errors({ notify, param }) {
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(param === 'add');
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = () => api('/errors').then(setData).catch((e) => notify(e.message));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (param === 'add') setAdding(true);
  }, [param]);

  const patterns = useMemo(() => [...new Set((data?.errors || []).map((e) => e.pattern))], [data]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/errors', { method: 'POST', body: form });
      setForm((f) => ({ ...blank(), day: f.day }));
      notify('Error logged');
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api(`/errors/${row.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <div className="stack">
      <header className="row between">
        <h1>Error log</h1>
        <button className="btn primary" onClick={() => setAdding((a) => !a)}>
          {adding ? 'Close' : '＋ Add'}
        </button>
      </header>

      {data?.top?.length > 0 && (
        <section className="card stack-sm">
          <h2>Top patterns</h2>
          <ol className="top-patterns">
            {data.top.map((t) => (
              <li key={t.pattern}>
                <span>{t.pattern}</span>
                <span className="count tabular">×{t.count}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {adding && (
        <form className="card stack-sm" onSubmit={submit}>
          <label className="field">
            <span>Date</span>
            <input type="date" value={form.day} onChange={set('day')} required />
          </label>
          <label className="field">
            <span>What I said</span>
            <input lang="es" value={form.said} onChange={set('said')} required placeholder="yo es cansado" />
          </label>
          <label className="field">
            <span>Correct form</span>
            <input lang="es" value={form.correct} onChange={set('correct')} required placeholder="estoy cansado" />
          </label>
          <label className="field">
            <span>Pattern tag</span>
            <input
              list="patterns"
              value={form.pattern}
              onChange={set('pattern')}
              required
              placeholder="ser vs estar"
              autoCapitalize="none"
            />
            <datalist id="patterns">
              {patterns.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          {patterns.length > 0 && (
            <div className="chips">
              {patterns.slice(0, 8).map((p) => (
                <button type="button" key={p} className="chip" onClick={() => setForm((f) => ({ ...f, pattern: p }))}>
                  {p}
                </button>
              ))}
            </div>
          )}
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      )}

      {data === null ? (
        <p className="muted">Loading…</p>
      ) : data.errors.length === 0 ? (
        <p className="muted center">No errors logged yet. Mistakes are data!</p>
      ) : (
        <ul className="list">
          {data.errors.map((row) => (
            <li key={row.id} className="card error-row">
              <div className="grow">
                <div className="said">
                  <Es>{row.said}</Es>
                </div>
                <div className="correct">
                  → <Es>{row.correct}</Es>
                </div>
                <div className="meta small muted">
                  <span className="pill">{row.pattern}</span>
                  <span>{prettyDate(row.day)}</span>
                </div>
              </div>
              <button className="icon-btn subtle" onClick={() => remove(row)} aria-label="Delete entry">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
