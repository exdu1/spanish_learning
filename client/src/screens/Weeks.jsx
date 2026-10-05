import React, { useEffect, useState } from 'react';
import { Check, Es, Ipa, Progress, Segmented, StageBanner } from '../components.jsx';

export default function Weeks({ content, checks, setCheck, unlocked, param }) {
  const initial = param === 'exit' ? 'exit' : Number(param) >= 1 && Number(param) <= 4 ? Number(param) : unlocked;
  const [tab, setTab] = useState(initial);
  useEffect(() => setTab(initial), [param]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = [
    ...content.weeks.map((w) => ({ value: w.week, label: `W${w.week}` })),
    { value: 'exit', label: 'Exit' },
  ];

  return (
    <div className="stack">
      <Segmented options={options} value={tab} onChange={setTab} />
      {tab === 'exit' ? (
        <ExitCriteria content={content} checks={checks} setCheck={setCheck} />
      ) : (
        <Week week={content.weeks[tab - 1]} checks={checks} setCheck={setCheck} current={tab === unlocked} />
      )}
    </div>
  );
}

function Week({ week, checks, setCheck, current }) {
  const done = week.checklist.filter((c) => checks.has(c.id)).length;
  return (
    <>
      <header>
        <div className="eyebrow">
          Week {week.week}
          {current && <span className="pill">current</span>}
        </div>
        <h1>{week.title}</h1>
        <p className="muted">{week.summary}</p>
      </header>

      <section className="card stack-sm">
        <div className="row between">
          <h2>Checklist</h2>
          <span className="muted tabular">
            {done}/{week.checklist.length}
          </span>
        </div>
        <Progress value={done} max={week.checklist.length} label="Checklist progress" />
        {week.checklist.map((c) => (
          <Check key={c.id} label={c.label} checked={checks.has(c.id)} onChange={(v) => setCheck(c.id, v)} />
        ))}
      </section>

      {week.tables?.map((t) => (
        <section key={t.id} className="stack-sm">
          <h2>{t.title}</h2>
          <div className="verb-grid">
            {t.verbs.map((v) => (
              <div key={v.verb} className="card verb-card">
                <h3>
                  <Es>{v.verb}</Es>
                </h3>
                <table className="conj">
                  <tbody>
                    {v.forms.map((f, i) => (
                      <tr key={i}>
                        <th scope="row">
                          <Es>{t.persons[i]}</Es>
                        </th>
                        <td>
                          <Es className="form">{f.es}</Es>
                          <Ipa>{f.ipa}</Ipa>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {week.note && <p className="muted small">{week.note}</p>}
        </section>
      ))}

      {week.verbs && week.week === 1 && (
        <section className="card stack-sm">
          <h2>Verbs this week</h2>
          <div className="chips">
            {week.verbs.map((v) => (
              <Es key={v} className="chip">
                {v}
              </Es>
            ))}
          </div>
        </section>
      )}

      {week.pronouns && (
        <section className="card stack-sm">
          <h2>Pronouns</h2>
          <table className="simple">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Indirect object</th>
              </tr>
            </thead>
            <tbody>
              {week.pronouns.map((p) => (
                <tr key={p.subject}>
                  <td>
                    <Es>{p.subject}</Es>
                  </td>
                  <td>
                    <Es className="form">{p.io}</Es>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {week.gustarVerbs && (
        <section className="card stack-sm">
          <h2>Gustar-frame verbs</h2>
          <p className="muted small">The thing liked is the subject: one thing → singular, several → plural.</p>
          <table className="simple">
            <thead>
              <tr>
                <th>Verb</th>
                <th>+ singular</th>
                <th>+ plural</th>
              </tr>
            </thead>
            <tbody>
              {week.gustarVerbs.map((g) => (
                <tr key={g.inf}>
                  <td>
                    <Es>{g.inf}</Es>
                    <div className="muted small">{g.en}</div>
                  </td>
                  <td>
                    <Es className="form">me {g.sg}</Es>
                  </td>
                  <td>
                    <Es className="form">me {g.pl}</Es>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {week.chunks?.length > 0 && (
        <section className="card stack-sm">
          <h2>Chunks</h2>
          <ul className="chunk-list">
            {week.chunks.map((c) => (
              <li key={c.es}>
                <Es className="form">{c.es}</Es>
                <span className="muted">{c.en}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ExitCriteria({ content, checks, setCheck }) {
  const done = content.exit.filter((c) => checks.has(c.id)).length;
  const all = done === content.exit.length;
  return (
    <>
      {all && <StageBanner />}
      <header>
        <div className="eyebrow">Exit criteria</div>
        <h1>Ready for Stage 2?</h1>
        <p className="muted">Tick each one only when you can do it cold.</p>
      </header>
      <section className="card stack-sm">
        <div className="row between">
          <h2>Criteria</h2>
          <span className="muted tabular">
            {done}/{content.exit.length}
          </span>
        </div>
        <Progress value={done} max={content.exit.length} label="Exit criteria" />
        {content.exit.map((c) => (
          <Check key={c.id} label={c.label} checked={checks.has(c.id)} onChange={(v) => setCheck(c.id, v)} />
        ))}
      </section>
    </>
  );
}
