/* ============================================================
   LifeMap — Weekly Mirror (showcase) + Evening Mirror
   ============================================================ */

/* ---------------- WEEKLY MIRROR ---------------- */
function ScreenWeeklyMirror({ go }) {
  const D = window.LM;
  const W = D.weekMirror;

  return (
    <section className="screen active">
      {/* 1. Headline */}
      <div className="beat reveal" style={{ '--d': '.02s' }}>
        <span className="eyebrow">Your week · {W.range}</span>
        <div className="headline">
          <span className="big">{W.headlineBig}</span>
          <span className="sub" dangerouslySetInnerHTML={{ __html: W.headlineSub }} />
        </div>
      </div>

      {/* 2. Living panorama */}
      <div className="beat reveal" style={{ '--d': '.12s' }}>
        <span className="eyebrow">Where your energy actually went</span>
        <div className="panorama-mini">
          {W.panorama.map(p => (
            <div key={p.id} className={`mini ${p.state}`} style={{ '--a': accent(p.id) }} onClick={() => go('bucket', p.id)}>
              <div className="d" />
              <div className="mn">{D.bucketById[p.id].name}</div>
              <div className="ms">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. The one gap (calm, middle of the story) */}
      <div className="beat reveal" style={{ '--d': '.22s' }}>
        <span className="eyebrow">The one gap worth seeing</span>
        <div className="gap-card">
          <div className="q" dangerouslySetInnerHTML={{ __html: W.gap.q }} />
          <div className="note">{W.gap.note}</div>
        </div>
      </div>

      {/* 4. Wins (loud lives here) */}
      <div className="beat reveal" style={{ '--d': '.32s' }}>
        <span className="eyebrow">What you earned</span>
        <div className="wins">
          {W.wins.map((w, i) => (
            <div className="win" key={i} style={{ '--c': accent(w.bucket) }}
              onClick={() => w.label === 'New PR' && window.LMfx.celebrate({ tier: 'bloom', color: accent(w.bucket), title: 'New bench PR \u2014 <em>195</em>', sub: 'You\u2019ve chased 185 for a month. Today it moved.' })}>
              <div className="spark" />
              <div className="label">{w.label}</div>
              <div className="big">{w.big}</div>
              <div className="small">{w.small}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 12 }}>Tap the PR to replay the moment.</div>
      </div>

      {/* 5. One pattern noticed */}
      <div className="beat reveal" style={{ '--d': '.42s' }}>
        <span className="eyebrow">Something I noticed</span>
        <div className="pattern">
          <div className="p-text" dangerouslySetInnerHTML={{ __html: W.pattern.text }} />
          <Btn className="sm" onClick={() => go('week')}>{W.pattern.cta}</Btn>
        </div>
      </div>

      {/* 6. Propose the week (end on agency) */}
      <div className="beat reveal" style={{ '--d': '.52s' }}>
        <span className="eyebrow">Set the week ahead</span>
        <div className="propose">
          <div className="pp" dangerouslySetInnerHTML={{ __html: W.propose.text }} />
          <div className="btn-row">
            <Btn variant="primary" onClick={() => go('week')}>Approve plan</Btn>
            <Btn onClick={() => go('week')}>Adjust</Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- EVENING MIRROR ---------------- */
function ScreenEveningMirror({ go }) {
  const D = window.LM;
  const E = D.evening;
  const [confirm, setConfirm] = useState(() => Object.fromEntries(E.confirm.map(b => [b.id, b.done])));
  const [ratings, setRatings] = useState(() => Object.fromEntries(E.meters.map(m => [m.id, m.value])));
  const [journal, setJournal] = useState('');
  const [closed, setClosed] = useState(false);

  const doneCount = Object.values(confirm).filter(Boolean).length;
  const toggle = (id) => setConfirm(s => ({ ...s, [id]: !s[id] }));

  const closeOut = () => {
    setClosed(true);
    window.LMfx.celebrate({ tier: 'moment', color: 'var(--warm)',
      title: 'Day closed \u2014 <em>5 of 6</em>', sub: 'And the gym was one of them. That\u2019s a comeback.' });
  };

  return (
    <section className="screen active">
      <div className="evening">
        <div className="evening-head reveal" style={{ '--d': '.02s' }}>
          <div className="moon" />
          <h2>Close out the day</h2>
          <p>{E.date} · thirty seconds, then rest.</p>
        </div>

        {/* Step 1 — confirm */}
        <div className="step-card reveal" style={{ '--d': '.1s' }}>
          <div className="step-eyebrow"><span className="step-num">1</span><span className="eyebrow">Confirm the day — untap anything you missed</span></div>
          {E.confirm.map(b => (
            <div key={b.id} className={`confirm-row ${confirm[b.id] ? 'on' : 'off'}`} style={{ '--c': accent(b.bucket) }} onClick={() => toggle(b.id)}>
              <span className="cdot" />
              <span className="check">{confirm[b.id] ? '\u2713' : ''}</span>
              <div className="cbody">
                <div className="t">{b.title}</div>
                <div className="s">{b.time} · {D.bucketById[b.bucket].name}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Step 1b — track-it ratings */}
        <div className="step-card reveal" style={{ '--d': '.16s' }}>
          <div className="step-eyebrow"><span className="step-num">2</span><span className="eyebrow">How'd the meters land?</span></div>
          {E.meters.map(m => (
            <div key={m.id} className="rating-row" style={{ '--c': accent(m.bucket) }}>
              <div className="rl"><span className="d" />{m.label}</div>
              <div className="seg-pills">
                {m.options.map(o => (
                  <div key={o} className={`seg-pill ${ratings[m.id] === o ? 'on' : ''}`} data-v={o}
                    onClick={() => setRatings(s => ({ ...s, [m.id]: o }))}>{o}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Step 2 — payoff */}
        <div className="step-card reveal" style={{ '--d': '.22s' }}>
          <div className="step-eyebrow"><span className="step-num">3</span><span className="eyebrow">What moved</span></div>
          <div className="payoff">
            <div className="p" style={{ '--c': 'var(--fitness)' }}><div className="pv">{doneCount}/6</div><div className="pl">Blocks completed</div></div>
            <div className="p" style={{ '--c': 'var(--warm)' }}><div className="pv">+0.1</div><div className="pl">Fitness pace ticked up</div></div>
            <div className="p" style={{ '--c': 'var(--fitness)' }}><div className="pv">Comeback</div><div className="pl">Gym, after a week off</div></div>
          </div>
          <VoiceLine style={{ marginTop: 22, textAlign: 'left', fontSize: 17 }}>{E.line}</VoiceLine>
        </div>

        {/* Step 3 — light journal */}
        <div className="step-card reveal" style={{ '--d': '.28s' }}>
          <div className="step-eyebrow"><span className="step-num">4</span><span className="eyebrow">One line, if you want it</span></div>
          <div className="journal-prompt">"{E.prompt}"</div>
          <textarea className="journal-field" placeholder="A sentence is plenty. Or skip it." value={journal} onChange={e => setJournal(e.target.value)} />
        </div>

        <div className="btn-row reveal" style={{ '--d': '.34s', marginTop: 8, justifyContent: 'space-between' }}>
          <Btn className="" onClick={() => go('now')}>Skip tonight</Btn>
          <Btn variant="primary" onClick={closeOut} disabled={closed}>{closed ? '\u2713 Day closed' : 'Close the day'}</Btn>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ScreenWeeklyMirror, ScreenEveningMirror });
