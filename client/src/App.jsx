import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { todayISO, unlockedWeek } from './dates.js';
import Login from './screens/Login.jsx';
import Today from './screens/Today.jsx';
import Weeks from './screens/Weeks.jsx';
import Drill from './screens/Drill.jsx';
import Bank from './screens/Bank.jsx';
import Errors from './screens/Errors.jsx';
import Settings from './screens/Settings.jsx';

const TABS = [
  { id: 'today', label: 'Today', icon: '☀︎' },
  { id: 'weeks', label: 'Weeks', icon: '▦' },
  { id: 'drill', label: 'Drill', icon: '⚡︎' },
  { id: 'bank', label: 'Bank', icon: '❝' },
  { id: 'errors', label: 'Errors', icon: '✎' },
];
const ROUTES = new Set([...TABS.map((t) => t.id), 'settings']);

function useHashRoute() {
  const read = () => {
    const [route, param] = window.location.hash.replace(/^#\/?/, '').split('/');
    return { route: ROUTES.has(route) ? route : 'today', param };
  };
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => {
      setLoc(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return loc;
}

export default function App() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [state, setState] = useState(null);
  const [toast, setToast] = useState(null);
  const { route, param } = useHashRoute();

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(notify.t);
    notify.t = setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      setState(await api('/state'));
    } catch (e) {
      notify(e.message);
    }
  }, [notify]);

  useEffect(() => {
    api('/me')
      .then((r) => setAuthed(r.authed))
      .catch(() => setAuthed(false));
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener('app:unauthorized', onUnauthorized);
    return () => window.removeEventListener('app:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  if (authed === null) return <div className="splash">Cargando…</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  if (!state) return <div className="splash">Cargando…</div>;

  const startDate = state.settings.startDate || null;
  const checks = new Set(state.checks);

  const setCheck = async (id, done) => {
    const next = new Set(checks);
    done ? next.add(id) : next.delete(id);
    setState((s) => ({ ...s, checks: [...next] }));
    try {
      await api(`/checks/${id}`, { method: 'PUT', body: { done } });
    } catch (e) {
      notify(`Couldn't save: ${e.message}`);
      load();
    }
  };

  const ctx = {
    content: state.content,
    startDate,
    checks,
    setCheck,
    notify,
    unlocked: unlockedWeek(startDate, todayISO()),
    reload: load,
    param,
  };

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/today" className="brand">
          Etapa&nbsp;1
        </a>
        <a href="#/settings" className="icon-btn" aria-label="Settings">
          ⚙︎
        </a>
      </header>

      <main className="content">
        {route === 'today' && <Today {...ctx} />}
        {route === 'weeks' && <Weeks {...ctx} />}
        {route === 'drill' && <Drill {...ctx} />}
        {route === 'bank' && <Bank {...ctx} />}
        {route === 'errors' && <Errors {...ctx} />}
        {route === 'settings' && <Settings {...ctx} onLogout={() => setAuthed(false)} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <a key={t.id} href={`#/${t.id}`} className={route === t.id ? 'tab active' : 'tab'}>
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tab-label">{t.label}</span>
          </a>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}
