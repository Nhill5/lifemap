/* ============================================================
   LifeMap — shared components + celebration engine
   Exposes components on window for the other Babel scripts.
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

const accent = (id) => `var(--${id})`;

/* ---------- minimal line icons (simple geometry only) ---------- */
function Icon({ name, size = 18, stroke = 1.8 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'chevron-left': return <svg {...p}><polyline points="15 18 9 12 15 6" /></svg>;
    case 'chevron-right': return <svg {...p}><polyline points="9 18 15 12 9 6" /></svg>;
    case 'plus': return <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case 'moon': return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
    case 'grid': return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'menu': return <svg {...p}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2.5" x2="8" y2="6" /><line x1="16" y1="2.5" x2="16" y2="6" /></svg>;
    case 'dumbbell': return <svg {...p}><line x1="6.5" y1="6.5" x2="17.5" y2="17.5" /><path d="M4 9 9 4M15 20l5-5" /><path d="M2.5 7.5 7.5 2.5M16.5 21.5 21.5 16.5" /></svg>;
    case 'spark': return <svg {...p}><path d="M12 3v18M3 12h18" /><path d="M12 3c.6 5.4 3.6 8.4 9 9-5.4.6-8.4 3.6-9 9-.6-5.4-3.6-8.4-9-9 5.4-.6 8.4-3.6 9-9z" fill="currentColor" stroke="none" /></svg>;
    default: return null;
  }
}

/* ---------- progress ring (for meters) ---------- */
function Ring({ pct, color }) {
  return <div className="ring" style={{ '--c': color, '--p': pct }} />;
}

/* ---------- meter rail tile ---------- */
function MeterTile({ m }) {
  const c = accent(m.bucket);
  return (
    <div className="meter">
      <Ring pct={m.pct} color={c} />
      <div className="info"><span className="v">{m.value}</span><span className="k">{m.label}</span></div>
    </div>
  );
}

/* ---------- living bucket tile (panorama) ---------- */
function BucketTile({ b, span, onOpen }) {
  const c = accent(b.id);
  const parked = b.state === 'parked';
  return (
    <div className={`bucket ${b.state} ${span ? 'span' : ''}`} style={{ '--a': c }} onClick={() => onOpen && onOpen(b.id)}>
      <div className="b-top">
        <div className="b-name"><span className="d" />{b.name}</div>
        <div className="state">{stateLabel(b.state)}</div>
      </div>
      <div className="goal">{b.chief.title}</div>
      <div className="sub">{parked ? 'Paused on purpose — back in the fall. Doesn\u2019t count against you.'
        : b.sub.map(s => s.kind === 'schedule' ? `${s.title} ${s.cadence}` : s.title).join(' · ')}</div>
      {!parked && (
        <>
          <div className="bar"><i style={{ width: b.chief.pct + '%' }} /></div>
          <div className="bar-meta"><span>{b.pace}{b.state === 'wilting' ? ' — needs a visit' : ''}</span><span>{b.chief.pct}%</span></div>
        </>
      )}
    </div>
  );
}

function stateLabel(s) {
  return s === 'parked' ? 'Resting' : s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- voice line (the mirror speaking) ---------- */
function VoiceLine({ children, style }) {
  return <p className="voice-line" style={style}>{children}</p>;
}

/* ---------- button ---------- */
function Btn({ children, variant, color, className = '', ...rest }) {
  const cls = ['btn', variant || '', className].join(' ').trim();
  const style = variant === 'accent' && color ? { '--c': color } : undefined;
  return <button className={cls} style={style} {...rest}>{children}</button>;
}

/* =======================================================
   CELEBRATION ENGINE
   window.LMfx.celebrate({ tier, title, sub, color })
   tiers: 'soft' | 'beat' | 'moment' | 'bloom'
   ======================================================= */
window.LMfx = window.LMfx || { _bloom: null };
const TweakCtx = React.createContext({ dial: 'balanced', motion: 'full', atmos: true });
window.TweakCtx = TweakCtx;
window.LMfx.celebrate = function (opts) {
  if (window.LMfx._bloom) window.LMfx._bloom(opts);
};

function useSoftFill() {
  const [on, setOn] = useState(false);
  const trigger = useCallback(() => { setOn(false); setTimeout(() => setOn(true), 20); setTimeout(() => setOn(false), 1300); }, []);
  return [on ? 'softfill' : '', trigger];
}

/* Full-screen bloom overlay — mounted once by App */
function BloomOverlay() {
  const [state, setState] = useState(null); // { tier, title, sub, color }
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    window.LMfx._bloom = (opts) => {
      // soft / beat don't take over the screen — they are handled inline by components.
      if (opts.tier === 'soft' || opts.tier === 'beat') return;
      clearTimeout(timer.current);
      setState(opts);
      setTimeout(() => setShow(true), 20);
    };
    return () => { window.LMfx._bloom = null; };
  }, []);

  const dismiss = () => { setShow(false); timer.current = setTimeout(() => setState(null), 450); };

  if (!state) return null;
  const c = state.color || 'var(--fitness)';
  const tierLabel = { moment: 'Milestone', bloom: 'Level up' }[state.tier] || 'Nice';

  // scatter particles
  const particles = Array.from({ length: 16 }).map((_, i) => {
    const ang = (i / 16) * Math.PI * 2 + (i % 2 ? .3 : 0);
    const dist = 180 + (i % 4) * 60;
    return { dx: Math.cos(ang) * dist + 'px', dy: Math.sin(ang) * dist + 'px', d: (i % 5) * 0.06 };
  });

  return (
    <div className={`bloom-overlay ${show ? 'show' : ''}`} style={{ '--c': c }} onClick={dismiss}>
      <div className="bloom-burst" />
      {particles.map((pt, i) => (
        <div key={i} className="spark-particle"
          style={{ left: '50%', top: '42%', '--dx': pt.dx, '--dy': pt.dy, animationDelay: pt.d + 's' }} />
      ))}
      <div className="bloom-core">
        <div className="bloom-tier reveal-b" style={{ '--bd': '.15s' }}>{tierLabel}</div>
        <div className="bloom-title reveal-b" style={{ '--bd': '.28s' }} dangerouslySetInnerHTML={{ __html: state.title }} />
        {state.sub && <div className="bloom-sub reveal-b" style={{ '--bd': '.42s' }}>{state.sub}</div>}
        <div className="bloom-dismiss reveal-b" style={{ '--bd': '.58s' }}>
          <Btn variant="accent" color={c} onClick={(e) => { e.stopPropagation(); dismiss(); }}>Keep going</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  accent, Icon, Ring, MeterTile, BucketTile, stateLabel, VoiceLine, Btn,
  useSoftFill, BloomOverlay, TweakCtx,
});
