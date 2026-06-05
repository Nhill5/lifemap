/* ============================================================
   LifeMap — Workout logger, Onboarding, Celebration ladder
   ============================================================ */

/* ====================================================
   WORKOUT LOGGER (PR detection → full-screen bloom)
   ==================================================== */
function ScreenWorkoutLogger({ go }) {
  const D = window.LM;
  const WK = D.workout;
  const c = accent('fitness');

  // state: { [exId]: { sets: [{weight, reps, done}], extra:n } }
  const [state, setState] = useState(() =>
    Object.fromEntries(WK.exercises.map(ex => [ex.id, { sets: ex.sets.map(s => ({ weight: '', reps: '', done: false })) }])));
  const [hitPR, setHitPR] = useState({});

  const update = (exId, i, field, val) => {
    setState(s => {
      const copy = { ...s, [exId]: { sets: s[exId].sets.map((st, idx) => idx === i ? { ...st, [field]: val } : st) } };
      return copy;
    });
  };

  const toggleDone = (ex, i) => {
    setState(s => {
      const set = s[ex.id].sets[i];
      const nowDone = !set.done;
      const next = { ...s, [ex.id]: { sets: s[ex.id].sets.map((st, idx) => idx === i ? { ...st, done: nowDone } : st) } };
      // PR detection on completing a set
      const w = parseFloat(set.weight);
      if (nowDone && !isNaN(w) && w > ex.pr && !hitPR[ex.id]) {
        setHitPR(h => ({ ...h, [ex.id]: w }));
        setTimeout(() => window.LMfx.celebrate({
          tier: 'bloom', color: c,
          title: `New ${ex.name.toLowerCase()} PR \u2014 <em>${w}</em>`,
          sub: `You\u2019ve been stuck at ${ex.pr} for weeks. Today it moved.`,
        }), 180);
      }
      return next;
    });
  };

  const addSet = (exId) => setState(s => ({ ...s, [exId]: { sets: [...s[exId].sets, { weight: '', reps: '', done: false }] } }));

  const [finished, setFinished] = useState(false);
  const finish = () => {
    setFinished(true);
    const prs = Object.keys(hitPR).length;
    window.LMfx.celebrate({
      tier: 'bloom', color: c,
      title: prs ? 'Push day \u2014 <em>logged + a PR</em>' : 'Push day \u2014 <em>logged</em>',
      sub: 'Gym 1 \u2192 2 of 4 this week. Fitness just woke up.',
    });
  };

  return (
    <section className="screen active">
      <div className="back-bar reveal" style={{ '--d': '.02s' }}>
        <button className="back-btn" onClick={() => go('bucket', 'fitness')}>
          <span className="chev"><Icon name="chevron-left" size={16} /></span> Fitness
        </button>
      </div>

      <div className="wl-head reveal" style={{ '--d': '.06s' }}>
        <div>
          <div className="wl-title"><span>Push day</span> · logger</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{WK.date}</div>
      </div>
      <div className="wl-sub reveal" style={{ '--d': '.08s' }}>Last session's numbers are there to beat. Hit a new top weight and the room lights up.</div>

      {WK.exercises.map((ex, k) => (
        <div className="ex-card reveal" key={ex.id} style={{ '--d': (.12 + k * .05) + 's' }}>
          <div className="ex-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ex-name">{ex.name}</span>
              {hitPR[ex.id] && <span className="pr-flag">PR {hitPR[ex.id]}</span>}
            </div>
            <span className="ex-last">Last: <b>{ex.last}</b></span>
          </div>
          <div className="set-table">
            <div className="set-head">
              <span>Set</span><span>Previous</span><span>Weight</span><span>Reps</span><span></span>
            </div>
            {state[ex.id].sets.map((st, i) => {
              const w = parseFloat(st.weight);
              const isPR = !isNaN(w) && w > ex.pr;
              return (
                <div className="set-row" key={i}>
                  <span className="set-n">{i + 1}</span>
                  <span className="set-prev">{ex.sets[i] ? ex.sets[i].prev : '—'}</span>
                  <input className={`set-input ${isPR ? 'pr' : ''}`} inputMode="decimal" placeholder={String(ex.pr)}
                    value={st.weight} onChange={e => update(ex.id, i, 'weight', e.target.value)} />
                  <input className="set-input" inputMode="numeric" placeholder="—"
                    value={st.reps} onChange={e => update(ex.id, i, 'reps', e.target.value)} />
                  <button className={`set-check ${st.done ? 'on' : ''}`} onClick={() => toggleDone(ex, i)}>{st.done ? '\u2713' : ''}</button>
                </div>
              );
            })}
          </div>
          <button className="add-set" onClick={() => addSet(ex.id)}>+ Add set</button>
        </div>
      ))}

      <div className="wl-finish reveal" style={{ '--d': '.4s' }}>
        <Btn variant="accent" color={c} onClick={finish} disabled={finished} style={{ width: '100%', padding: '15px' }}>
          {finished ? '\u2713 Session logged' : 'Finish session'}
        </Btn>
      </div>
    </section>
  );
}

/* ====================================================
   ONBOARDING (buckets-as-onboarding, ~90s, never blank)
   ==================================================== */
function ScreenOnboarding({ go, onDone }) {
  const D = window.LM;
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(['Fitness', 'Finances', 'Work', 'School', 'Kappa']);
  const [goals, setGoals] = useState({
    Fitness: 'Lose 40 lb by December',
    Finances: 'Save $12,000 by Dec 31',
    Work: 'Ship the v1 launch by Aug 15',
    School: 'Hit a 3.8 GPA this semester',
    Kappa: 'Lead spring rush — 15 pledges',
  });
  const steps = ['Welcome', 'Buckets', 'Chief goals', 'First plan'];

  const accentFor = (name) => {
    const found = D.onboarding.suggested.find(s => s.name === name);
    return found ? found.accent : 'var(--text-dim)';
  };
  const togglePick = (name) => setPicked(p =>
    p.includes(name) ? p.filter(x => x !== name) : (p.length >= 5 ? p : [...p, name]));

  const canNext = step === 1 ? picked.length >= 3 : true;
  const next = () => { if (step < 3) setStep(step + 1); else onDone(); };

  return (
    <section className="screen active">
      <div className="ob">
        <div className="ob-progress">
          {steps.map((s, i) => (
            <div key={s} className={`seg-bar ${i < step ? 'done' : ''} ${i === step ? 'cur' : ''}`}><i /></div>
          ))}
        </div>

        <div className="ob-body">
          {step === 0 && (
            <div className="reveal" style={{ '--d': '.05s' }}>
              <div className="ob-eyebrow">LifeMap</div>
              <h1>Most apps map your life.<br /><i>This one mirrors it.</i></h1>
              <p className="lede">In ninety seconds you'll set up three to five things that matter, name one real goal for each, and walk out with a plan for tomorrow. Never a blank page.</p>
            </div>
          )}

          {step === 1 && (
            <div className="reveal" style={{ '--d': '.05s' }}>
              <div className="ob-eyebrow">Step 1 · your buckets</div>
              <h1>What are you actually trying to build?</h1>
              <p className="lede">Pick three to five. Five is the ceiling — on purpose. Focus is the feature.</p>
              <div className="chip-pick">
                {D.onboarding.suggested.map(s => (
                  <div key={s.name} className={`chip ${picked.includes(s.name) ? 'on' : ''}`} style={{ '--c': s.accent }} onClick={() => togglePick(s.name)}>
                    <span className="cd" />{s.name}
                  </div>
                ))}
              </div>
              <div className="chip-count"><b>{picked.length} of 5</b> chosen{picked.length < 3 ? ' · pick at least 3' : ''}</div>
            </div>
          )}

          {step === 2 && (
            <div className="reveal" style={{ '--d': '.05s' }}>
              <div className="ob-eyebrow">Step 2 · one goal each</div>
              <h1>Make each one specific and time-bound.</h1>
              <p className="lede">"Get fit" hides. "Lose 40 lb by December" can be measured — and that's what the mirror reflects back.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {picked.map(name => (
                  <div key={name}>
                    <div className="ob-goal-bucket" style={{ '--c': accentFor(name) }}><span className="d" />{name}</div>
                    <input className="ob-input" style={{ '--c': accentFor(name) }} value={goals[name] || ''} placeholder={`A goal for ${name}…`}
                      onChange={e => setGoals(g => ({ ...g, [name]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="reveal" style={{ '--d': '.05s' }}>
              <div className="ob-eyebrow">Step 3 · here's tomorrow</div>
              <h1>I drafted your first day.</h1>
              <p className="lede">Built from your goals, in priority order. Adjust anything — then commit. The mirror only measures what you commit to.</p>
              <div className="ob-plan-block" style={{ '--c': accent('work') }}><span className="pt">Morning deep work — v1 launch</span><span className="ps">7:30 – 9:00</span></div>
              <div className="ob-plan-block" style={{ '--c': accent('school') }}><span className="pt">Thesis draft — Chapter 4</span><span className="ps">9:00 – 10:30</span></div>
              <div className="ob-plan-block" style={{ '--c': accent('fitness') }}><span className="pt">Gym — Push day</span><span className="ps">11:00 – 12:15</span></div>
              <div className="ob-plan-block" style={{ '--c': accent('finances') }}><span className="pt">Weekly budget review</span><span className="ps">1:00 – 1:30</span></div>
              <div className="ob-hint">Looks like a lot? You can cut a block now — better than falling short later.</div>
            </div>
          )}
        </div>

        <div className="ob-foot">
          {step > 0
            ? <button className="ob-skip" onClick={() => setStep(step - 1)}>← Back</button>
            : <button className="ob-skip" onClick={onDone}>Skip the tour</button>}
          <Btn variant="primary" onClick={next} disabled={!canNext}>
            {step === 3 ? 'Commit & enter LifeMap' : step === 0 ? 'Start' : 'Continue'}
          </Btn>
        </div>
      </div>
    </section>
  );
}

/* ====================================================
   CELEBRATION LADDER (the graduated dopamine system)
   ==================================================== */
function ScreenCelebrations({ go }) {
  const tiers = [
    { id: 'soft', tier: 'Daily task', t: 'Soft fill', d: 'A calm, earned glow inside the thing you finished. No fanfare — just acknowledgment.', c: 'var(--school)' },
    { id: 'beat', tier: 'Weekly sub-goal', t: 'A noticeable beat', d: 'A small pop of scale + light. Enough to feel it, not enough to cheapen the big ones.', c: 'var(--finances)' },
    { id: 'moment', tier: 'Monthly milestone', t: 'A real moment', d: 'The screen pauses to mark it. Specific, never generic.', c: 'var(--work)' },
    { id: 'bloom', tier: 'Chief goal · PR · unlock', t: 'Full-screen bloom', d: 'The loudest tier — a bloom of light in the bucket\u2019s color. The app celebrates you harder than you would.', c: 'var(--fitness)' },
  ];
  return (
    <section className="screen active">
      <div className="back-bar reveal" style={{ '--d': '.02s' }}>
        <button className="back-btn" onClick={() => go('now')}><span className="chev"><Icon name="chevron-left" size={16} /></span> Now</button>
        <div>
          <div style={{ fontFamily: 'var(--font-voice)', fontSize: 22, fontWeight: 500, letterSpacing: '-.02em' }}>The celebration ladder</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Intensity scales with weight — so the big moments still land</div>
        </div>
      </div>
      <div className="cel-grid">
        {tiers.map((x, i) => <CelCard key={x.id} x={x} go={go} delay={.1 + i * .06} />)}
      </div>
      <VoiceLine style={{ '--d': '.5s', marginTop: 34 }}>
        Weight is set by the app, never by you. Fail a goal three times, then land it — <b>the bloom gets bigger.</b>
      </VoiceLine>
    </section>
  );
}

function CelCard({ x, delay }) {
  const [fill, trigger] = useSoftFill();
  const [beat, setBeat] = useState(false);
  const fire = () => {
    if (x.id === 'soft') { trigger(); }
    else if (x.id === 'beat') { setBeat(false); requestAnimationFrame(() => setBeat(true)); setTimeout(() => setBeat(false), 600); }
    else if (x.id === 'moment') window.LMfx.celebrate({ tier: 'moment', color: x.c, title: '2,400 words \u2014 <em>Chapter 3</em>', sub: 'A month ago this draft didn\u2019t exist.' });
    else window.LMfx.celebrate({ tier: 'bloom', color: x.c, title: 'New bench PR \u2014 <em>195</em>', sub: 'You\u2019ve chased 185 for a month. Today it moved.' });
  };
  return (
    <div className={`cel-card ${fill} ${beat ? 'beatpop' : ''}`} style={{ '--c': x.c }}>
      <div className="tier">{x.tier}</div>
      <div className="ct">{x.t}</div>
      <div className="cd">{x.d}</div>
      <Btn variant="accent" color={x.c} className="sm" onClick={fire}>Play it</Btn>
    </div>
  );
}

Object.assign(window, { ScreenWorkoutLogger, ScreenOnboarding, ScreenCelebrations, CelCard });
