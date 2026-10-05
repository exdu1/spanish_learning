import React, { useState } from 'react';
import { api } from '../api.js';
import { addDays, prettyDate } from '../dates.js';
import { Segmented } from '../components.jsx';

function getTheme() {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch {
    return 'system';
  }
}

export default function Settings({ startDate, notify, reload, onLogout }) {
  const [date, setDate] = useState(startDate || '');
  const [theme, setThemeState] = useState(getTheme);

  const saveDate = async () => {
    try {
      await api('/settings', { method: 'PUT', body: { startDate: date } });
      notify('Start date saved');
      reload();
    } catch (e) {
      notify(e.message);
    }
  };

  const setTheme = (t) => {
    setThemeState(t);
    try {
      t === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', t);
    } catch {}
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  };

  const logout = async () => {
    await api('/logout', { method: 'POST' }).catch(() => {});
    onLogout();
  };

  return (
    <div className="stack">
      <h1>Settings</h1>

      <section className="card stack-sm">
        <h2>Plan start date</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {date && (
          <p className="muted small">
            Week 1 starts {prettyDate(date)} · the plan ends {prettyDate(addDays(date, 27))}
          </p>
        )}
        <button className="btn primary block" onClick={saveDate} disabled={!date || date === startDate}>
          Save
        </button>
      </section>

      <section className="card stack-sm">
        <h2>Appearance</h2>
        <Segmented
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </section>

      <section className="card stack-sm">
        <h2>Exit criteria</h2>
        <a className="btn block" href="#/weeks/exit">
          Open exit checklist →
        </a>
      </section>

      <button className="btn block" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
