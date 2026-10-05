import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { prettyDate, todayISO } from '../dates.js';
import { Es, Ipa, Segmented } from '../components.jsx';

const blank = (week) => ({ es: '', ipa: '', note: '', week, source: '' });

export default function Bank({ unlocked, notify, param }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [week, setWeek] = useState(0); // 0 = all
  const [adding, setAdding] = useState(param === 'add');
  const [form, setForm] = useState(blank(unlocked));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (param === 'add') setAdding(true);
  }, [param]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (week) params.set('week', week);
    const t = setTimeout(() => {
      api(`/sentences?${params}`).then(setItems).catch((e) => notify(e.message));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, week, notify]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api('/sentences', {
        method: 'POST',
        body: { ...form, week: Number(form.week) || null, minedOn: todayISO() },
      });
      setItems((list) => [created, ...(list || [])]);
      // Keep week + source so mining several sentences from one source is quick.
      setForm((f) => ({ ...blank(f.week), source: f.source }));
      notify('Sentence saved');
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete “${s.es}”?`)) return;
    try {
      await api(`/sentences/${s.id}`, { method: 'DELETE' });
      setItems((list) => list.filter((x) => x.id !== s.id));
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <div className="stack">
      <header className="row between">
        <h1>Sentence bank</h1>
        <button className="btn primary" onClick={() => setAdding((a) => !a)}>
          {adding ? 'Close' : '＋ Add'}
        </button>
      </header>

      {adding && (
        <form className="card stack-sm" onSubmit={submit}>
          <label className="field">
            <span>Spanish *</span>
            <textarea lang="es" rows={2} value={form.es} onChange={set('es')} required autoFocus spellCheck />
          </label>
          <label className="field">
            <span>IPA (optional)</span>
            <input className="ipa-input" value={form.ipa} onChange={set('ipa')} placeholder="ˈa.βlo" />
          </label>
          <label className="field">
            <span>Note</span>
            <input value={form.note} onChange={set('note')} placeholder="meaning, why it's useful…" />
          </label>
          <div className="row gap">
            <label className="field grow">
              <span>Week</span>
              <select value={form.week} onChange={set('week')}>
                <option value="">—</option>
                {[1, 2, 3, 4].map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow2">
              <span>Source</span>
              <input value={form.source} onChange={set('source')} placeholder="podcast, show, book…" />
            </label>
          </div>
          <button className="btn primary block" disabled={busy || !form.es.trim()}>
            {busy ? 'Saving…' : 'Save sentence'}
          </button>
        </form>
      )}

      <input
        type="search"
        className="search"
        placeholder="Search sentences, notes, sources…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Segmented
        options={[{ value: 0, label: 'All' }, ...[1, 2, 3, 4].map((w) => ({ value: w, label: `W${w}` }))]}
        value={week}
        onChange={setWeek}
      />

      {items === null ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted center">No sentences yet{q || week ? ' matching that filter' : ''}.</p>
      ) : (
        <ul className="list">
          {items.map((s) => (
            <li key={s.id} className="card sentence">
              <div className="sentence-main">
                <Es className="sentence-es">{s.es}</Es>
                {s.ipa && (
                  <div>
                    <Ipa>{s.ipa}</Ipa>
                  </div>
                )}
                {s.note && <div className="small">{s.note}</div>}
                <div className="meta small muted">
                  {s.week && <span className="pill">W{s.week}</span>}
                  {s.source && <span>{s.source}</span>}
                  <span>{prettyDate(s.minedOn)}</span>
                </div>
              </div>
              <button className="icon-btn subtle" onClick={() => remove(s)} aria-label="Delete sentence">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
