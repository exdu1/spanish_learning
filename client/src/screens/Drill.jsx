import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Es, Ipa } from '../components.jsx';

const ENDINGS = {
  ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
  er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
};
const conjugate = (inf, i) => inf.slice(0, -2) + ENDINGS[inf.slice(-2)][i];

const THINGS = {
  sg: ['el café', 'la música', 'el fútbol', 'este libro', 'la playa', 'cocinar'],
  pl: ['los perros', 'las películas', 'los idiomas', 'las fiestas', 'los lunes'],
};
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Build a pool of card generators from each week's content. */
function buildPool(weeks) {
  const pool = [];
  for (const w of weeks) {
    const table = w.tables?.[0];
    if (w.week === 1 && table) {
      const ipaByForm = Object.fromEntries(table.verbs.flatMap((v) => v.forms.map((f) => [f.es, f.ipa])));
      pool.push({
        week: 1,
        make: () => {
          const verb = rand(w.verbs);
          const i = Math.floor(Math.random() * 6);
          const answer = conjugate(verb, i);
          return { week: 1, prompt: verb, person: table.persons[i], answer, ipa: ipaByForm[answer] };
        },
      });
    } else if (table) {
      pool.push({
        week: w.week,
        make: () => {
          const v = rand(table.verbs);
          const i = Math.floor(Math.random() * 6);
          return { week: w.week, prompt: v.verb, person: table.persons[i], answer: v.forms[i].es, ipa: v.forms[i].ipa };
        },
      });
    }
    if (w.pronouns) {
      pool.push({
        week: w.week,
        make: () => {
          const p = rand(w.pronouns);
          return { week: w.week, prompt: 'indirect-object pronoun', person: p.subject, answer: p.io };
        },
      });
    }
    if (w.gustarVerbs) {
      pool.push({
        week: w.week,
        make: () => {
          const p = rand(w.pronouns);
          const g = rand(w.gustarVerbs);
          const n = Math.random() < 0.5 ? 'sg' : 'pl';
          const thing = rand(THINGS[n]);
          return {
            week: w.week,
            prompt: `${g.inf} · ${thing}`,
            person: p.subject,
            answer: `${p.io} ${g[n]} ${thing}`,
          };
        },
      });
    }
  }
  return pool;
}

export default function Drill({ content, unlocked }) {
  const [onlyUnlocked, setOnlyUnlocked] = useState(() => {
    try {
      return localStorage.getItem('drillOnlyUnlocked') !== 'false';
    } catch {
      return true;
    }
  });
  const [card, setCard] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const pool = useMemo(() => {
    const weeks = content.weeks.filter((w) => !onlyUnlocked || w.week <= unlocked);
    return buildPool(weeks);
  }, [content, onlyUnlocked, unlocked]);

  const next = useCallback(() => {
    if (!pool.length) return setCard(null);
    let c;
    // Avoid showing the exact same card twice in a row.
    for (let tries = 0; tries < 5; tries++) {
      c = rand(pool).make();
      if (!card || c.answer !== card.answer) break;
    }
    setCard(c);
    setRevealed(false);
  }, [pool, card]);

  useEffect(() => {
    next();
  }, [pool]); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = (right) => {
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }));
    next();
  };

  const toggle = (v) => {
    setOnlyUnlocked(v);
    try {
      localStorage.setItem('drillOnlyUnlocked', String(v));
    } catch {}
  };

  const maxWeek = onlyUnlocked ? Math.min(unlocked, 3) : 3;
  const weeksIn = maxWeek === 1 ? 'Week 1 tables' : `Weeks 1–${maxWeek} tables`;

  return (
    <div className="stack">
      <header className="row between">
        <div>
          <h1>Quick drill</h1>
          <p className="muted small">{weeksIn}</p>
        </div>
        <div className="score tabular" aria-label="Session score">
          {score.right}/{score.total}
        </div>
      </header>

      <label className="switch">
        <input type="checkbox" checked={onlyUnlocked} onChange={(e) => toggle(e.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
        <span>Only weeks unlocked so far</span>
      </label>

      {card ? (
        <>
          <button className={`card drill-card ${revealed ? 'revealed' : ''}`} onClick={() => setRevealed(true)}>
            <span className="eyebrow">Week {card.week}</span>
            <span className="drill-person">
              <Es>{card.person}</Es>
            </span>
            <span className="drill-prompt">
              <Es>{card.prompt}</Es>
            </span>
            <span className="drill-answer" aria-live="polite">
              {revealed ? (
                <>
                  <Es className="form">{card.answer}</Es>
                  <Ipa>{card.ipa}</Ipa>
                </>
              ) : (
                <span className="muted">Tap to reveal</span>
              )}
            </span>
          </button>

          {revealed ? (
            <div className="row gap">
              <button className="btn block bad" onClick={() => mark(false)}>
                ✗ Missed
              </button>
              <button className="btn block good" onClick={() => mark(true)}>
                ✓ Knew it
              </button>
            </div>
          ) : (
            <button className="btn block" onClick={next}>
              Skip
            </button>
          )}
        </>
      ) : (
        <p className="muted">Nothing to drill yet.</p>
      )}
    </div>
  );
}
