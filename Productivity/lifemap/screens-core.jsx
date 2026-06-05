/* ============================================================
   LifeMap — core zoom screens: Now / Next, Day timeline, Week grid
   ============================================================ */

/* ---------------- NOW / NEXT FOCUS ---------------- */
function ScreenNow({ go }) {
  const D = window.LM;
  const tw = React.useContext(window.TweakCtx);
  const cur = D.blocks.find(b => b.status === 'now');
  const next = D.blocks.filter(b => b.start > cur.end && b.status === 'planned').sort((a, b) => a.start - b.start)[0];
  const [fill, trigger] = useSoftFill();
  const [done, setDone] = useState(false);

  // progress through current block
  const total = cur.end - cur.start;
  const elapsed = Math.min(total, Math.max(0, D.NOW_MIN - cur.start));
  const pct = Math.round((elapsed / total) * 100);

  const finishBlock = () => {
    if (done) return;
    setDone(true);
    trigger();
    window.LMfx.celebrate({ tier: 'moment', color: accent(cur.bucket),
      title: 'Chapter 4 \u2014 <em>drafted</em>', sub: 'That was the last hard chapter. Thesis is in reach.' });
  };

  return (
    <section className="screen active">
      <div className="now-head reveal" style={{ '--d': '.02s' }}>
        <div className="date">{D.today.weekday} <span>· {D.today.date}</span></div>
        <div className="clock">{D.today.clock}</div>
      </div>

      <div className="rail reveal" style={{ '--d': '.08s' }}>
        {D.rail.map(m => <MeterTile key={m.id} m={m} />)}
      </div>

      <div className={`hero-block reveal ${fill}`} style={{ '--c': accent(cur.bucket), '--d': '.16s' }}>
        <span className="tag"><span className="dot" />School · right now</span>
        <h1>{cur.title}</h1>
        <div className="time"><b>{D.fmtTime(cur.start)} – {D.fmtTime(cur.end)}</b> &nbsp;·&nbsp; {done ? 'done' : `${elapsed} min in, ${total - elapsed} left`}</div>
        <div className="progress"><i style={{ width: (done ? 100 : pct) + '%' }} /></div>
        <div className="progress-meta"><span>{done ? 'Logged. Nice work.' : 'Stay with it.'}</span><span>this is the thing</span></div>
        <div className="hero-actions">
          <Btn variant="accent" color={accent(cur.bucket)} onClick={finishBlock} disabled={done}>
            {done ? '\u2713 Block complete' : 'Mark this block done'}
          </Btn>
        </div>
      </div>

      <div className="next reveal" style={{ '--c2': accent(next.bucket), '--d': '.24s' }} onClick={() => go('bucket', next.bucket)}>
        <span className="nb" />
        <div className="body">
          <div className="lead">Next</div>
          <div className="t">{next.title} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>· Fitness</span></div>
        </div>
        <div className="s" style={{ color: 'var(--text-dim)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{D.fmtTime(next.start)}</div>
      </div>

      <div className="collapsed reveal" style={{ '--d': '.30s' }} onClick={() => go('day')}>
        ↓ &nbsp;4 more blocks today — tap to see the full day
      </div>

      <VoiceLine style={{ '--d': '.38s' }} >
        {tw.dial === 'gentle' && (<>You came back strong after yesterday.<br /><b>Two blocks down before noon — no need to rush the rest.</b></>)}
        {(tw.dial === 'balanced' || !tw.dial) && (<>You came back strong after yesterday.<br /><b>Two blocks down before noon — that's your rhythm.</b></>)}
        {tw.dial === 'drill' && (<>It's 9:41. Two done, four still on the board.<br /><b>Don't coast now — the hard one's still in front of you.</b></>)}
      </VoiceLine>
    </section>
  );
}

/* ---------------- DAY TIMELINE ---------------- */
function ScreenDay({ go }) {
  const D = window.LM;
  const startH = 6, endH = 22; // 6am – 10pm
  const pxPerMin = 56 / 60; // 56px per hour row
  const hours = [];
  for (let h = startH; h <= endH; h++) hours.push(h);
  const topFor = (min) => (min - startH * 60) * pxPerMin;
  const heightFor = (b) => Math.max(40, (b.end - b.start) * pxPerMin - 6);

  const blocks = D.blocks.filter(b => b.start >= startH * 60 && b.start < endH * 60);

  return (
    <section className="screen active">
      <BackBar go={go} label="Day · Wednesday, June 3" sub="Your full day, color-coded by bucket" />

      <div className="rail reveal" style={{ '--d': '.06s' }}>
        {D.rail.slice(0, 3).map(m => <MeterTile key={m.id} m={m} />)}
      </div>

      <div className="day-wrap reveal" style={{ '--d': '.12s' }}>
        <div className="tl" style={{ height: (endH - startH) * 56 + 'px', position: 'relative' }}>
          {hours.map((h, i) => (
            <div className="tl-row" key={h} style={{ position: 'absolute', top: i * 56, left: 0, right: 0 }}>
              <div className="tl-hour">{D.fmtTime(h * 60).replace(':00', '')}</div>
              <div className="tl-track" />
            </div>
          ))}

          {/* now line */}
          <div className="now-line" style={{ top: topFor(D.NOW_MIN) + 'px' }}>
            <span className="now-lbl">Now · 9:41</span>
          </div>

          {/* blocks */}
          {blocks.map(b => {
            const dur = b.end - b.start;
            const compact = dur < 45;
            return (
              <div key={b.id} className={`tl-block ${b.status} ${compact ? 'compact' : ''}`}
                style={{ '--c': accent(b.bucket), top: topFor(b.start) + 'px', height: heightFor(b) + 'px', left: 64 }}
                onClick={() => b.opensLogger ? go('logger') : go('bucket', b.bucket)}>
                {compact ? (
                  <div className="bt-row"><span className="bk">{D.bucketById[b.bucket].name}</span><span className="bt">{b.title}</span></div>
                ) : (
                  <>
                    <div className="bk">{D.bucketById[b.bucket].name}</div>
                    <div className="bt">{b.title}</div>
                    <div className="bs">{D.fmtTime(b.start)} – {D.fmtTime(b.end)}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <VoiceLine style={{ '--d': '.3s', marginTop: 36 }}>
        Heaviest work sits <b>before 2pm</b> — right where you do your best thinking.
      </VoiceLine>
    </section>
  );
}

/* ---------------- WEEK GRID ---------------- */
function ScreenWeek({ go }) {
  const D = window.LM;
  const startH = 7, endH = 19;
  const rowH = 52;
  const pxPerMin = rowH / 60;
  const hours = [];
  for (let h = startH; h <= endH; h++) hours.push(h);
  const topFor = (min) => (min - startH * 60) * pxPerMin;
  const heightFor = (e) => Math.max(34, (e.end - e.start) * pxPerMin - 4);

  return (
    <section className="screen active">
      <BackBar go={go} label="Week · June 1 – 7" sub="Where the week actually lands, by bucket" />

      <div className="week-grid-wrap reveal" style={{ '--d': '.08s' }}>
        <div className="week-grid">
          {/* header row */}
          <div className="wg-corner" />
          {D.weekDays.map((d, i) => (
            <div key={d} className={`wg-dayhead ${i === D.todayCol ? 'today' : ''}`}>
              <div className="dn">{d}</div>
              <div className="dd">{D.weekDates[i]}</div>
            </div>
          ))}

          {/* body: hour rows */}
          <div style={{ position: 'relative' }}>
            {hours.map(h => <div key={h} className="wg-hourcol">{D.fmtTime(h * 60).replace(':00', '').replace(' ', '')}</div>)}
          </div>
          {D.weekDays.map((d, col) => (
            <div key={d} className={`wg-col ${col === D.todayCol ? 'today' : ''}`} style={{ position: 'relative' }}>
              {hours.map(h => <div key={h} className="wg-cell" />)}
              {D.weekBlocks.filter(e => e.d === col).map((e, idx) => (
                <div key={idx} className={`wg-chip ${e.status}`}
                  style={{ '--c': accent(e.bucket), top: topFor(e.start) + 'px', height: heightFor(e) + 'px' }}
                  onClick={() => go('bucket', e.bucket)}>
                  <div className="ct">{e.title}</div>
                  <div className="cs">{D.fmtTime(e.start).replace(':00', '').replace(' ', '')}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <VoiceLine style={{ '--d': '.3s', marginTop: 36 }}>
        Only <b>one gym block</b> made it onto the week so far. Want me to hold three next week?
      </VoiceLine>
    </section>
  );
}

/* ---------------- shared back bar ---------------- */
function BackBar({ go, label, sub }) {
  return (
    <div className="back-bar reveal" style={{ '--d': '.02s' }}>
      <button className="back-btn" onClick={() => go('now')}>
        <span className="chev"><Icon name="chevron-left" size={16} /></span> Now
      </button>
      <div>
        <div style={{ fontFamily: 'var(--font-voice)', fontSize: 22, fontWeight: 500, letterSpacing: '-.02em' }}>{label}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{sub}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenNow, ScreenDay, ScreenWeek, BackBar });
