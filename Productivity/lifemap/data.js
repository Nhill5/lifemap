/* ============================================================
   LifeMap — sample user data
   One believable user: 5 buckets (Fitness, Finances, Work, School, Kappa)
   Exposes window.LM with everything the screens read.
   ============================================================ */
(function () {
  // Curated accents (token names) — every bucket pulls from the locked palette
  const ACCENTS = {
    school:  '#7C9CFF', // periwinkle
    work:    '#B49BFF', // lavender
    fitness: '#4FD6A0', // mint
    finances:'#E6B450', // gold
    kappa:   '#F18FB2', // rose
  };

  // ---- BUCKETS -------------------------------------------------
  const buckets = [
    {
      id: 'school', name: 'School', accent: ACCENTS.school, state: 'thriving',
      score: 88, pace: 'On pace', emoji: null,
      chief: { title: '3.8 GPA this semester', metric: '3.71 now', target: '3.8 by May 22', pct: 82, status: 'active' },
      sub: [
        { id:'study', kind:'schedule', title:'Study blocks', cadence:'3×/week', done:3, of:3 },
        { id:'thesis', kind:'schedule', title:'Thesis writing', cadence:'4×/week', done:3, of:4 },
        { id:'read', kind:'track', title:'Readings', target:'daily', unit:'', rating:'hit' },
      ],
      line: 'Chapter 4 is the last hard one. You\u2019re ahead of where you were at midterms.',
    },
    {
      id: 'work', name: 'Work', accent: ACCENTS.work, state: 'thriving',
      score: 84, pace: 'On pace',
      chief: { title: 'Ship the v1 launch', metric: '71% built', target: 'by Aug 15', pct: 71, status: 'active' },
      sub: [
        { id:'deep', kind:'schedule', title:'Deep work', cadence:'4×/week', done:3, of:4 },
        { id:'review', kind:'schedule', title:'Weekly review', cadence:'1×/week', done:1, of:1 },
        { id:'inbox', kind:'track', title:'Inbox to zero', target:'daily', unit:'', rating:'close' },
      ],
      line: 'Two deep-work blocks before noon today. That\u2019s the rhythm that ships things.',
    },
    {
      id: 'fitness', name: 'Fitness', accent: ACCENTS.fitness, state: 'wilting',
      score: 34, pace: 'Behind pace',
      chief: { title: 'Lose 40 lb by December', metric: '11 lb down', target: '40 lb by Dec 1', pct: 28, status: 'active' },
      sub: [
        { id:'gym', kind:'schedule', title:'Gym', cadence:'4×/week', done:1, of:4 },
        { id:'protein', kind:'track', title:'Protein', target:190, unit:'g', value:112, rating:'close' },
        { id:'steps', kind:'track', title:'Steps', target:10000, unit:'', value:5400, rating:'close' },
      ],
      line: 'One gym visit this week. That\u2019s the gap \u2014 not a verdict. Today\u2019s block is still open.',
    },
    {
      id: 'finances', name: 'Finances', accent: ACCENTS.finances, state: 'steady',
      score: 66, pace: 'Holding',
      chief: { title: 'Save $12,000 by Dec 31', metric: '$7,180 saved', target: '$12k by Dec 31', pct: 60, status: 'active' },
      sub: [
        { id:'nospend', kind:'track', title:'No-spend weekdays', target:'weekdays', unit:'', rating:'hit' },
        { id:'budget', kind:'schedule', title:'Budget review', cadence:'1×/week', done:1, of:1 },
        { id:'invest', kind:'track', title:'Invest', target:400, unit:'$/mo', value:400, rating:'hit' },
      ],
      line: 'Quietly the most consistent bucket you have. No drama, just up and to the right.',
    },
    {
      id: 'kappa', name: 'Kappa', accent: ACCENTS.kappa, state: 'parked',
      score: null, pace: 'Resting',
      chief: { title: 'Lead spring rush \u2014 15 pledges', metric: 'paused', target: 'resumes in fall', pct: 100, status: 'parked' },
      sub: [
        { id:'chapter', kind:'schedule', title:'Chapter meeting', cadence:'1×/week', done:0, of:0 },
        { id:'events', kind:'schedule', title:'Brotherhood events', cadence:'2×/mo', done:0, of:0 },
      ],
      line: 'You parked this for summer \u2014 on purpose. It doesn\u2019t count against you. Back in the fall.',
    },
  ];

  const bucketById = Object.fromEntries(buckets.map(b => [b.id, b]));

  // ---- TODAY (Wed, June 3) ------------------------------------
  // Now/Next track-it rail
  const rail = [
    { id:'protein', bucket:'fitness', label:'Protein',   value:'112 / 190g',  pct:59 },
    { id:'steps',   bucket:'fitness', label:'Steps',     value:'5,400 / 10k', pct:54 },
    { id:'deep',    bucket:'work',    label:'Deep work', value:'2 / 3 blocks',pct:66 },
    { id:'nospend', bucket:'finances',label:'No-spend',  value:'On track',    pct:100 },
  ];

  // Today's blocks (Day timeline). minutes from midnight.
  const NOW_MIN = 9 * 60 + 41; // 9:41
  const blocks = [
    { id:'b1', bucket:'school',   title:'Thesis draft \u2014 Chapter 4', start:9*60,  end:10*60+30, status:'now' },
    { id:'b2', bucket:'fitness',  title:'Gym \u2014 Push day',           start:11*60, end:12*60+15, status:'planned', opensLogger:true },
    { id:'b3', bucket:'finances', title:'Weekly budget review',          start:13*60, end:13*60+30, status:'planned' },
    { id:'b4', bucket:'work',     title:'Deep work \u2014 v1 launch',     start:14*60, end:16*60,    status:'planned' },
    { id:'b5', bucket:'school',   title:'Seminar readings',              start:16*60+30, end:17*60+30, status:'planned' },
    { id:'b6', bucket:'work',     title:'Inbox + ship notes',            start:18*60, end:18*60+30, status:'planned' },
    // earlier, already-happened
    { id:'b0', bucket:'work',     title:'Morning deep work',             start:7*60+30, end:8*60+45, status:'done' },
  ];

  // ---- WEEK GRID (Mon–Sun) ------------------------------------
  const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weekDates = ['1','2','3','4','5','6','7'];
  const todayCol = 2; // Wed
  // events keyed by day index, with start/end minutes + bucket
  const weekBlocks = [
    { d:0, bucket:'work',    title:'Deep work',  start:8*60,  end:10*60,   status:'done' },
    { d:0, bucket:'school',  title:'Thesis',     start:10*60+30, end:12*60, status:'done' },
    { d:0, bucket:'finances',title:'Budget',     start:17*60, end:17*60+30, status:'done' },
    { d:1, bucket:'school',  title:'Study',      start:9*60,  end:11*60,   status:'done' },
    { d:1, bucket:'fitness', title:'Gym \u2014 Pull', start:17*60, end:18*60+15, status:'done' },
    { d:2, bucket:'school',  title:'Thesis Ch.4',start:9*60,  end:10*60+30,status:'now' },
    { d:2, bucket:'fitness', title:'Gym \u2014 Push', start:11*60, end:12*60+15, status:'planned' },
    { d:2, bucket:'work',    title:'Deep work',  start:14*60, end:16*60,   status:'planned' },
    { d:3, bucket:'work',    title:'Deep work',  start:8*60,  end:10*60,   status:'planned' },
    { d:3, bucket:'school',  title:'Seminar',    start:13*60, end:14*60+30,status:'planned' },
    { d:4, bucket:'work',    title:'Weekly review', start:9*60, end:10*60, status:'planned' },
    { d:4, bucket:'fitness', title:'Gym \u2014 Legs', start:16*60, end:17*60+30, status:'planned' },
    { d:5, bucket:'finances',title:'Budget review', start:10*60, end:10*60+30, status:'planned' },
    { d:6, bucket:'school',  title:'Catch-up read', start:11*60, end:12*60, status:'planned' },
  ];

  // ---- WEEKLY MIRROR ------------------------------------------
  const weekMirror = {
    range: 'May 27 \u2013 June 2',
    gpa: 3.7,
    headlineBig: 'A strong week.',
    headlineSub: 'You showed up <b>5 of 7 days</b> \u2014 and came back twice after a slip. <b>That\u2019s the whole game.</b>',
    panorama: [
      { id:'school',   state:'thriving', label:'Thriving' },
      { id:'work',     state:'thriving', label:'Thriving' },
      { id:'finances', state:'steady',   label:'Steady'   },
      { id:'fitness',  state:'wilting',  label:'Wilting'  },
      { id:'kappa',    state:'parked',   label:'Resting'  },
    ],
    gap: {
      bucket:'fitness',
      q: 'You called <b>Fitness</b> a top-3 priority. It got <b>one gym visit</b> this week.',
      note: 'That\u2019s the gap. Not a verdict \u2014 just the truth. You decide if it matters.',
    },
    wins: [
      { bucket:'fitness',  label:'New PR',    big:'Bench \u2014 195 lb', small:'+10 lb from last month' },
      { bucket:'school',   label:'Milestone', big:'2,400 words',         small:'Chapter 3 draft, done' },
      { bucket:'work',     label:'Comeback',  big:'Bounced back Thu',     small:'Missed Wed, owned Thursday' },
    ],
    pattern: {
      text: 'You finish hard tasks <b>before noon</b> \u2014 and almost nothing after 3pm.',
      cta: 'Front-load next week \u2192',
    },
    propose: {
      bucket:'fitness',
      text: 'Want to protect <b>Fitness</b>? I\u2019ll hold <b>3 gym blocks</b> in your mornings \u2014 that\u2019s when you actually show up.',
    },
  };

  // ---- EVENING MIRROR -----------------------------------------
  const evening = {
    date: 'Wednesday, June 3',
    confirm: [
      { id:'b0', bucket:'work',    title:'Morning deep work',         time:'7:30 \u2013 8:45', done:true },
      { id:'b1', bucket:'school',  title:'Thesis draft \u2014 Ch. 4', time:'9:00 \u2013 10:30', done:true },
      { id:'b2', bucket:'fitness', title:'Gym \u2014 Push day',       time:'11:00 \u2013 12:15', done:true },
      { id:'b3', bucket:'finances',title:'Weekly budget review',      time:'1:00 \u2013 1:30', done:true },
      { id:'b4', bucket:'work',    title:'Deep work \u2014 v1 launch', time:'2:00 \u2013 4:00', done:false },
      { id:'b5', bucket:'school',  title:'Seminar readings',          time:'4:30 \u2013 5:30', done:true },
    ],
    meters: [
      { id:'protein', bucket:'fitness', label:'Protein', options:['hit','close','missed'], value:'close' },
      { id:'steps',   bucket:'fitness', label:'Steps',   options:['hit','close','missed'], value:'hit' },
    ],
    line: 'Five of six blocks, and the gym was one of them. That\u2019s a comeback day \u2014 Fitness needed exactly this.',
    prompt: 'You got to the gym after skipping it all week. What made today different?',
  };

  // ---- WORKOUT LOGGER -----------------------------------------
  const workout = {
    bucket: 'fitness',
    name: 'Push day',
    date: 'Wednesday, June 3',
    exercises: [
      { id:'bench', name:'Bench Press', unit:'lb',
        last:'3 × 5 @ 185', pr:185,
        sets:[ {n:1, prev:'5 @ 185', weight:'', reps:''}, {n:2, prev:'5 @ 185', weight:'', reps:''}, {n:3, prev:'5 @ 185', weight:'', reps:''} ] },
      { id:'ohp', name:'Overhead Press', unit:'lb',
        last:'3 × 5 @ 115', pr:115,
        sets:[ {n:1, prev:'5 @ 115', weight:'', reps:''}, {n:2, prev:'5 @ 115', weight:'', reps:''}, {n:3, prev:'5 @ 115', weight:'', reps:''} ] },
      { id:'incline', name:'Incline DB Press', unit:'lb',
        last:'3 × 8 @ 60', pr:60,
        sets:[ {n:1, prev:'8 @ 60', weight:'', reps:''}, {n:2, prev:'8 @ 60', weight:'', reps:''}, {n:3, prev:'8 @ 60', weight:'', reps:''} ] },
      { id:'pushdown', name:'Triceps Pushdown', unit:'lb',
        last:'3 × 12 @ 50', pr:50,
        sets:[ {n:1, prev:'12 @ 50', weight:'', reps:''}, {n:2, prev:'12 @ 50', weight:'', reps:''}, {n:3, prev:'12 @ 50', weight:'', reps:''} ] },
    ],
  };

  // ---- ONBOARDING suggestions ---------------------------------
  const onboarding = {
    suggested: [
      { name:'Fitness',  accent:ACCENTS.fitness },
      { name:'Finances', accent:ACCENTS.finances },
      { name:'Work',     accent:ACCENTS.work },
      { name:'School',   accent:ACCENTS.school },
      { name:'Kappa',    accent:ACCENTS.kappa },
      { name:'Looks',    accent:'#F18FB2' },
      { name:'Reading',  accent:'#B49BFF' },
      { name:'Family',   accent:'#7C9CFF' },
    ],
  };

  window.LM = {
    ACCENTS, buckets, bucketById, rail, blocks, NOW_MIN,
    weekDays, weekDates, todayCol, weekBlocks,
    weekMirror, evening, workout, onboarding,
    today: { weekday:'Wednesday', date:'June 3', clock:'9:41', gpa:3.7 },
    fmtTime(min){
      let h = Math.floor(min/60), m = min%60;
      const ap = h>=12 ? 'PM':'AM';
      let hh = h%12; if(hh===0) hh=12;
      return `${hh}:${String(m).padStart(2,'0')} ${ap}`;
    },
  };
})();
