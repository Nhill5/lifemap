/* ============================================================
   LifeMap — Buckets panorama + Bucket detail
   ============================================================ */

/* ---------------- BUCKETS PANORAMA ---------------- */
function ScreenBuckets({ go }) {
  const D = window.LM;
  const grid = D.buckets.filter(b => b.state !== 'parked');
  const parked = D.buckets.filter(b => b.state === 'parked');

  return (
    <section className="screen active">
      <div className="panorama-head reveal" style={{ '--d': '.02s' }}>
        <h2>Five things that matter.</h2>
        <p>Each one's alive or fading based on what you actually do — not what you said you'd do.</p>
      </div>

      <div className="buckets-grid">
        {grid.map((b, i) => (
          <div key={b.id} className="reveal" style={{ '--d': (.10 + i * .06) + 's' }}>
            <BucketTile b={b} onOpen={(id) => go('bucket', id)} />
          </div>
        ))}
        {parked.map((b, i) => (
          <div key={b.id} className="reveal" style={{ gridColumn: '1 / -1', '--d': (.10 + (grid.length + i) * .06) + 's' }}>
            <BucketTile b={b} span onOpen={(id) => go('bucket', id)} />
          </div>
        ))}
      </div>

      <p className="footnote reveal" style={{ '--d': '.5s' }}>
        Breadth is capped at five — depth is what you unlock. Tap a bucket to zoom in.
      </p>
    </section>
  );
}

/* ---------------- BUCKET DETAIL ---------------- */
function ScreenBucketDetail({ go, bucketId }) {
  const D = window.LM;
  const b = D.bucketById[bucketId] || D.buckets[0];
  const c = accent(b.id);
  const parked = b.state === 'parked';
  const isFitness = b.id === 'fitness';

  return (
    <section className="screen active">
      <div className="back-bar reveal" style={{ '--d': '.02s' }}>
        <button className="back-btn" onClick={() => go('buckets')}>
          <span className="chev"><Icon name="chevron-left" size={16} /></span> Buckets
        </button>
      </div>

      <div className={`bd-hero reveal ${b.state === 'thriving' ? 'breathe' : ''}`} style={{ '--c': c, '--d': '.06s' }}>
        <div className="bd-top">
          <div className="bd-name"><span className="d" />{b.name}</div>
          <div className="bd-state">{stateLabel(b.state)}</div>
        </div>
        <div className="bd-chief-label">Chief goal</div>
        <div className="bd-chief">{b.chief.title}</div>
        {!parked && (
          <>
            <div className="bd-pace">
              <span className="now">{b.chief.metric}</span>
              <span className="tgt">→ {b.chief.target}</span>
            </div>
            <div className="bd-bar"><i style={{ width: b.chief.pct + '%' }} /></div>
            <div className="bd-pace-note">
              {b.state === 'wilting'
                ? 'At this pace you reach the goal late. The inputs are the fix — one gym block today closes most of the gap.'
                : `${b.pace}. The inputs are doing their job — keep feeding them.`}
            </div>
          </>
        )}
        {parked && (
          <div className="bd-pace-note">Resting until fall. Nothing here counts against you while it's parked.</div>
        )}
      </div>

      {/* score + state strip */}
      {!parked && (
        <div className="rail reveal" style={{ '--d': '.12s' }}>
          <div className="meter">
            <Ring pct={b.score} color={c} />
            <div className="info"><span className="v">{b.score}</span><span className="k">Consistency · 14-day</span></div>
          </div>
          <div className="meter">
            <Ring pct={b.chief.pct} color={c} />
            <div className="info"><span className="v">{b.chief.pct}%</span><span className="k">Goal pace</span></div>
          </div>
          <div className="meter" style={{ alignItems: 'center' }}>
            <div className="info"><span className="v" style={{ color: c }}>{stateLabel(b.state)}</span><span className="k">Living state</span></div>
          </div>
        </div>
      )}

      {parked && (
        <div className="parked-banner reveal" style={{ '--d': '.12s' }}>
          <Icon name="moon" size={18} />
          <div>You <b>parked Kappa for summer</b> — a declared tradeoff, not a slip. It won't dent your Life GPA, and it'll wake up when fall recruitment starts.</div>
        </div>
      )}

      <div className="section-label reveal" style={{ '--d': '.18s' }}>The inputs that drive it</div>
      <div className="sub-list reveal" style={{ '--d': '.22s' }}>
        {b.sub.map(s => (
          <div className="sub-item" key={s.id} style={{ '--c': c }}>
            <span className={`kind ${s.kind === 'track' ? 'track' : ''}`}>{s.kind === 'track' ? 'Track-it' : 'Schedule-it'}</span>
            <div className="sbody">
              <div className="st">{s.title}</div>
              <div className="ss">{s.kind === 'schedule' ? s.cadence : `Target ${s.target}${s.unit ? ' ' + s.unit : ''}`}</div>
            </div>
            {s.kind === 'schedule' && s.of > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="sub-mini-bar"><i style={{ width: (s.done / s.of * 100) + '%' }} /></div>
                <span className="sright">{s.done}/{s.of}</span>
              </div>
            )}
            {s.kind === 'track' && (
              <span className="sright" style={{ color: s.rating === 'hit' ? c : s.rating === 'close' ? 'var(--warm)' : 'var(--text-faint)' }}>
                {s.value != null ? `${s.value}${s.unit || ''}` : s.rating}
              </span>
            )}
          </div>
        ))}
      </div>

      {isFitness && (
        <div className="reveal" style={{ '--d': '.3s', marginTop: 22 }}>
          <Btn variant="accent" color={c} onClick={() => go('logger')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <Icon name="dumbbell" size={16} /> Open today's session — Push day
          </Btn>
        </div>
      )}

      <VoiceLine style={{ '--d': '.36s', marginTop: 34 }} dangerouslySetInnerHTML={undefined}>
        {b.line}
      </VoiceLine>
    </section>
  );
}

Object.assign(window, { ScreenBuckets, ScreenBucketDetail });
