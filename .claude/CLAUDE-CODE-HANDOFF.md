# LifeMap — Claude Code Phase-1 Build Handoff

*(Paste into a fresh Claude Code session at the project root `D:\LifeMap`.)*

---

Build **Phase 1** of **LifeMap**, a dark-mode-default productivity web app. Work from the spec and design assets below — they are the source of truth.

## Reference files (read first)
- **Product + design spec (authoritative):** `D:\LifeMap\LifeMap-Design-Spec.md` — read it fully. Key: §5 object model, §12 stack, §13 AI approach, §18 build phasing, §19 **data model**, §21 design brief, §22 + §24 **security**.
- **Design system / components:** the Claude-design output (point me at the folder) + the language prototype `D:\LifeMap\design\lifemap-prototype.html`.
- **Design tokens & voice:** §21 (Fraunces for voice, Hanken Grotesk for UI; the exact color tokens; "palette never punishes").

## Stack (locked — do not substitute)
React + **Vite** + **TypeScript** + **Tailwind** + **Framer Motion**. Backend: **Supabase** (Postgres + Auth + Realtime + Edge Functions). PWA via **vite-plugin-pwa**. Deploy target: Vercel or Cloudflare Pages. **No canvas library** (zoom = Framer Motion transitions between designed React screens).

## Non-negotiable architecture principles
1. **Architect for the WHOLE app, build Phase 1 only.** Multi-user from line one (it's the same RLS architecture as single-user); wrapper-friendly (Capacitor) so native iOS can come later with no rewrite. No painted corners — but don't *build* Phase 2/3 features.
2. **Conductor, not orchestra.** Don't rebuild external trackers. (Workout logger IS built natively — it's the one justified exception.)
3. **The palette never punishes.** No red/aggressive error states anywhere — misses are neutral/dimmed or `--warm`.

## Security — mandatory, build in from line one (see §24)
- **RLS on EVERY table from the first migration.** Supabase auto-exposes tables over its API, so RLS is the only wall. Policy: `user_id = auth.uid()`, deny-by-default.
- **Write the BOLA test now:** log in as User A, attempt to fetch User B's rows *via the API directly* — must fail, per table.
- **Vite env gotcha:** secrets are NEVER `VITE_`-prefixed; they live in Edge Functions only. Scan for leaks.
- **Edge Functions:** validate all input; rate-limit; lock CORS to the domain. Fitbit tokens encrypted, server-side only.
- Treat all AI-generated code as untrusted; validate at runtime.

## Development workflow (I'm using CodeRabbit for review)
- Work in **small feature branches, one PR per feature** — keep diffs reviewable.
- **CodeRabbit reviews each PR.** Read and address its findings before merge.
- CodeRabbit (static AI review) **complements but does not replace** the §24 runtime checks — still run the **BOLA/RLS test** and a DAST pass, since static review misses runtime auth/RLS holes.
- Conventional commits. Don't merge with unresolved CodeRabbit security flags.

## Phase 1 scope & build order (§18)
Build in this sequence, each as its own PR:
1. **Scaffold** — Vite + TS + Tailwind + Framer Motion + PWA. Wire the §21 design tokens as CSS variables (dark default, light-ready). Base layout + routing + the design components.
2. **Supabase foundation** — the full §19 schema as migrations, **RLS policies on every table**, Supabase Auth (magic-link/OAuth), + the BOLA test.
3. **Onboarding** — buckets-as-onboarding (3–5, soft floor / hard ceiling 5) → chief goal per bucket (specific + time-bound) → sub-goals tagged schedule-it / track-it. Guided first plan, ~90s, never blank.
4. **Daily core** — morning planning (proposal → adjust → **commit** via `day_plans`); triage rollovers (+ zombie detection ≥3–4 carries); blocks; **Now/Next focus** + **Day & Week** calendar views (Framer Motion zoom).
5. **Logging** — assume-adherence (blocks default done, log only misses); track-it meters (value AND coarse hit/close/missed); the **Evening Mirror** (30s confirm + one honest line + light prompted journal).
6. **Workout logger** — exercises (starter library + custom), sets/reps/weight, last-session numbers, **PR detection → celebration**. Completing it confirms the gym block.
7. **Fitbit** — OAuth via Edge Function (tokens server-side), pull steps/sleep/resting-HR/active-minutes into `fitbit_data`; single source of truth for activity.
8. **Consistency + dopamine** — score computed on-the-fly (rolling window, never resets, declared tradeoffs excluded); per-bucket + overall **life-GPA** rollup; **comeback bonus**; celebration ladder scaled by weight.
9. **Weekly Mirror** — the curated story (headline → living bucket panorama → the one gap → wins → one pattern → propose-the-week). End on agency.
10. **Notifications** — web push (PWA, home-screen install); **budget ~3–4/day**; types: morning kickoff, drift-catch (firm), slip-catch (warm), evening mirror, celebration.

## Do NOT build in Phase 1
The intelligence/AI layer (Phase 3 — heuristics first, dormant until data exists), AI quick-capture, Month zoom, full unlock/leveling depth, over-scheduling guardrail, deep finance, social, native iOS/Apple Health, two-way calendar sync, billing.

## Voice / copy (write all microcopy this way)
Short, second-person, present; names the truth plainly; **warm at the slip, firm when actionable, never shaming**; celebrates specifically ("New deadlift PR — 315"). Render the "voice" lines in Fraunces.

## Definition of done (Phase 1 = dogfood-ready)
The founder can: onboard buckets/goals → plan & commit a day → execute via Now/Next → log (incl. a workout) with Fitbit auto-filling activity → get an honest evening mirror → and a Weekly Mirror after 7 days — all with RLS-enforced isolation, the BOLA test passing, and every PR through CodeRabbit.
