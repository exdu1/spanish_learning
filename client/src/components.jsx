import React from 'react';

export function Check({ checked, onChange, label, sub }) {
  return (
    <label className={checked ? 'check checked' : 'check'}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="box" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className="check-text">
        <span>{label}</span>
        {sub && <small className="muted">{sub}</small>}
      </span>
    </label>
  );
}

export function Progress({ value, max, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100)) || 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'seg active' : 'seg'}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Es = ({ children, className = '' }) => (
  <span lang="es" className={className}>
    {children}
  </span>
);

export const Ipa = ({ children }) => (children ? <span className="ipa">[{children}]</span> : null);

export function StageBanner() {
  return (
    <div className="banner">
      <strong>🎉 Stage 2 unlocked</strong>
      <span>All exit criteria met. ¡Enhorabuena!</span>
    </div>
  );
}

export const fmtMinutes = (m) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h} h ${mm} min` : `${mm} min`;
};
