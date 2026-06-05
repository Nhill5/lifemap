/* ============================================================
   LifeMap — app shell, router, navigation, screen directory
   ============================================================ */

const ZOOM = [
  { id: 'now', label: 'Now' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'buckets', label: 'Buckets' },
];

const DIRECTORY = [
  { id: 'now', t: 'Now / Next', s: 'Daily default — one block in focus', c: 'var(--school)' },
  { id: 'day', t: 'Day timeline', s: 'The whole day, by bucket', c: 'var(--work)' },
  { id: 'week', t: 'Week grid', s: 'Conventional week calendar', c: 'var(--finances)' },
  { id: 'buckets', t: 'Buckets panorama', s: 'Five living domains', c: 'var(--fitness)' },
  { id: 'bucket', t: 'Bucket detail', s: 'Zoom into Fitness', c: 'var(--fitness)', arg: 'fitness' },
  { id: 'week-mirror', t: 'Weekly Mirror', s: 'The showcase — your week as a story', c: 'var(--kappa)' },
  { id: 'evening', t: 'Evening mirror', s: '30-sec close-out + journal', c: 'var(--warm)' },
  { id: 'logger', t: 'Workout logger', s: 'Log sets · PR detection', c: 'var(--fitness)' },
  { id: 'onboarding', t: 'Onboarding', s: 'Buckets-as-onboarding', c: 'var(--school)' },
  { id: 'celebrations', t: 'Celebration ladder', s: 'Soft fill → full-screen bloom', c: 'var(--finances)' },
];

const WIDE = ['week'];

function ScreenWrap({ rkey, children }) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    setSeen(false);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setSeen(true)));
    const t = setTimeout(() => setSeen(true), 80);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, [rkey]);
  return <div className={`screen-wrap ${seen ? 'seen' : ''}`}>{children}</div>;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dial": "balanced",
  "motion": "full",
  "atmos": true,
  "breathe": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lm.route') || 'null');
      if (saved && saved.screen) return saved;
    } catch (e) {}
    return { screen: 'now', arg: null };
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('lm.route', JSON.stringify(route)); } catch (e) {}
  }, [route]);

  const go = useCallback((screen, arg = null) => {
    setMenuOpen(false);
    setRoute({ screen, arg });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  useEffect(() => { window.__go = go; }, [go]);

  // apply tweaks to the document
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--motion', t.motion === 'calm' ? '0.7' : '1');
    document.body.classList.toggle('no-motion', t.motion === 'off');
    document.body.classList.toggle('no-atmos', !t.atmos);
    document.body.classList.toggle('no-breathe', !t.breathe);
  }, [t.motion, t.atmos, t.breathe]);

  const { screen, arg } = route;
  const onZoom = ZOOM.some(z => z.id === screen) || screen === 'bucket';
  const wide = WIDE.includes(screen);

  // map screen -> component
  let body;
  switch (screen) {
    case 'now': body = <ScreenNow go={go} />; break;
    case 'day': body = <ScreenDay go={go} />; break;
    case 'week': body = <ScreenWeek go={go} />; break;
    case 'buckets': body = <ScreenBuckets go={go} />; break;
    case 'bucket': body = <ScreenBucketDetail go={go} bucketId={arg || 'fitness'} />; break;
    case 'week-mirror': body = <ScreenWeeklyMirror go={go} />; break;
    case 'evening': body = <ScreenEveningMirror go={go} />; break;
    case 'logger': body = <ScreenWorkoutLogger go={go} />; break;
    case 'celebrations': body = <ScreenCelebrations go={go} />; break;
    case 'onboarding': body = <ScreenOnboarding go={go} onDone={() => go('now')} />; break;
    default: body = <ScreenNow go={go} />;
  }

  // Onboarding takes the full shell minus chrome
  const isOnboarding = screen === 'onboarding';

  return (
    <TweakCtx.Provider value={t}>
    <div className={`app ${wide ? 'wide' : ''}`}>
      <BloomOverlay />

      <header className="top">
        <div className="wordmark" onClick={() => go('now')}>
          <div className="mark" />
          <b>Life<i>Map</i></b>
        </div>
        <div className="top-right">
          {!isOnboarding && (
            <div className="gpa-pill" onClick={() => go('week-mirror')}>
              <span className="n">{window.LM.today.gpa}</span>
              <span className="l">Life&nbsp;GPA · this week</span>
            </div>
          )}
          <button className="icon-btn" title="Evening mirror" onClick={() => go('evening')}><Icon name="moon" size={17} /></button>
          <button className="icon-btn" title="All screens" onClick={() => setMenuOpen(true)}><Icon name="menu" size={18} /></button>
        </div>
      </header>

      {!isOnboarding && (
        <div className="nav-row">
          <nav className="seg">
            {ZOOM.map(z => (
              <button key={z.id} className={(screen === z.id || (z.id === 'buckets' && screen === 'bucket')) ? 'on' : ''} onClick={() => go(z.id)}>{z.label}</button>
            ))}
            <button className={`mirror ${screen === 'week-mirror' ? 'on' : ''}`} onClick={() => go('week-mirror')}>Weekly Mirror</button>
          </nav>
          {onZoom && (
            <div className="zoom-hint">
              <span>Zoom</span>
              <span className="you-are">· you are here: <b style={{ color: 'var(--text)' }}>{screen === 'bucket' ? 'Bucket' : ZOOM.find(z => z.id === screen)?.label}</b></span>
            </div>
          )}
        </div>
      )}

      <ScreenWrap rkey={screen + (arg || '')}>
        {body}
      </ScreenWrap>

      {/* screen directory */}
      <div className={`menu-overlay ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)}>
        <div className="menu-panel" onClick={e => e.stopPropagation()}>
          <h3>All ten screens</h3>
          <div className="mh-sub">Jump anywhere — this is one connected app.</div>
          <div className="menu-grid">
            {DIRECTORY.map(d => (
              <div key={d.id + (d.arg || '')} className="menu-item" style={{ '--c': d.c }}
                onClick={() => go(d.id === 'week-mirror' ? 'week-mirror' : d.id, d.arg || null)}>
                <span className="mi-dot" />
                <div className="mi-body"><div className="mt">{d.t}</div><div className="ms">{d.s}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Coaching" />
        <TweakRadio label="Accountability dial" value={t.dial}
          options={['gentle', 'balanced', 'drill']}
          onChange={(v) => setTweak('dial', v)} />
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.5, marginTop: -2 }}>
          Changes how hard the mirror pushes when you're on-track. Slip &amp; recovery moments stay warm no matter what. Open <b style={{ color: 'var(--text-dim)' }}>Now</b> to hear it.
        </div>
        <TweakSection label="Feel" />
        <TweakRadio label="Motion" value={t.motion}
          options={['off', 'calm', 'full']}
          onChange={(v) => setTweak('motion', v)} />
        <TweakToggle label="Ambient breathe" value={t.breathe}
          onChange={(v) => setTweak('breathe', v)} />
        <TweakToggle label="Atmosphere (glow + grain)" value={t.atmos}
          onChange={(v) => setTweak('atmos', v)} />
      </TweaksPanel>
    </div>
    </TweakCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
