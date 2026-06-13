import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { accent } from '@/lib/accent'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { VoiceLine } from '@/components/ui/VoiceLine'
import type { AccentSlot } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types & constants                                                    */
/* ------------------------------------------------------------------ */

type BucketDraft = { slot: AccentSlot; name: string }
type GoalDraft   = { slot: AccentSlot; title: string; deadline: string }

const SLOTS: AccentSlot[] = ['school', 'work', 'fitness', 'looks', 'hobby']

const DEFAULT_NAMES: Record<AccentSlot, string> = {
  school:  'School',
  work:    'Work',
  fitness: 'Physical Fitness',
  looks:   'Looks',
  hobby:   'Hobby',
}

const GOAL_HINTS: Record<AccentSlot, string> = {
  school:  'e.g. Graduate with a 3.8 GPA by May 2027',
  work:    'e.g. Ship the v1 product by Q3 2026',
  fitness: 'e.g. Lose 30 lbs by December 1',
  looks:   'e.g. Build a daily skincare routine by end of month',
  hobby:   'e.g. Record a full EP by year end',
}

const SLIDE = {
  enter:  { x: '100%', opacity: 0 },
  center: { x: 0,      opacity: 1 },
  exit:   { x: '-60%', opacity: 0 },
}
const TRANSITION = { duration: 0.3, ease: [0.32, 0, 0.18, 1] as const }

/* ------------------------------------------------------------------ */
/*  Step 0 — Welcome                                                    */
/* ------------------------------------------------------------------ */

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(145deg, var(--school), var(--hobby))', boxShadow: '0 0 32px -8px var(--school)', margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 14, borderRadius: 5, background: 'var(--bg)' }} />
      </div>

      <div>
        <h1 style={{ fontFamily: 'var(--font-voice)', fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 10 }}>
          Life<i>Map</i>
        </h1>
        <VoiceLine>A mirror, not a map.</VoiceLine>
      </div>

      <p style={{ color: 'var(--text-dim)', fontSize: 15, lineHeight: 1.65, maxWidth: 300 }}>
        Track every domain. See the gap between who you said you'd be and who you've been — bucket by bucket.
      </p>

      <Button
        variant="primary"
        onClick={onStart}
        style={{ width: '100%', maxWidth: 320, marginTop: 8 }}
      >
        Set up my buckets
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Buckets                                                    */
/* ------------------------------------------------------------------ */

interface BucketsStepProps {
  buckets: BucketDraft[]
  onUpdateName: (slot: AccentSlot, name: string) => void
  onRemove: (slot: AccentSlot) => void
  onAdd: () => void
  onNext: () => void
}

function BucketsStep({ buckets, onUpdateName, onRemove, onAdd, onNext }: BucketsStepProps) {
  const canRemove = buckets.length > 3
  const canAdd    = buckets.length < 5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <Eyebrow style={{ marginBottom: 8 }}>Your buckets</Eyebrow>
      <VoiceLine style={{ marginBottom: 6 }}>3 to 5 life domains. Hard cap at 5.</VoiceLine>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 28 }}>
        Rename anything. These become the lens through which you track your whole life.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {buckets.map(b => (
          <div
            key={b.slot}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r-md)', padding: '10px 14px',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent(b.slot), flexShrink: 0 }} />
            <input
              value={b.name}
              onChange={e => onUpdateName(b.slot, e.target.value)}
              maxLength={32}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 15, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => onRemove(b.slot)}
              disabled={!canRemove}
              aria-label={`Remove ${b.name}`}
              style={{
                background: 'none', border: 'none', cursor: canRemove ? 'pointer' : 'default',
                color: canRemove ? 'var(--text-dim)' : 'transparent',
                fontSize: 16, lineHeight: 1, padding: '2px 4px', transition: 'color 0.15s',
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {canAdd && (
          <button
            onClick={onAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: '1px dashed var(--line)',
              borderRadius: 'var(--r-md)', padding: '10px 14px',
              color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer',
              width: '100%', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            Add a bucket
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, textAlign: 'right' }}>
        {buckets.length} of 5{buckets.length === 5 ? ' · hard cap' : ''}
      </p>

      <Button
        variant="primary"
        disabled={buckets.length < 3}
        onClick={onNext}
        style={{ width: '100%', marginTop: 24 }}
      >
        Set my buckets →
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Chief Goals                                                */
/* ------------------------------------------------------------------ */

interface GoalsStepProps {
  buckets: BucketDraft[]
  goals: GoalDraft[]
  onUpdateTitle: (slot: AccentSlot, title: string) => void
  onUpdateDeadline: (slot: AccentSlot, deadline: string) => void
  onBack: () => void
  onSave: () => void
  saving: boolean
  canSave: boolean
  error: string | null
}

function GoalsStep({ buckets, goals, onUpdateTitle, onUpdateDeadline, onBack, onSave, saving, canSave, error }: GoalsStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <Eyebrow style={{ marginBottom: 8 }}>Chief goals</Eyebrow>
      <VoiceLine style={{ marginBottom: 6 }}>One goal per bucket — the outcome you're working toward.</VoiceLine>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
        Specific and time-bound lands hardest. You can refine these once you're in.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {goals.map(g => {
          const bucket = buckets.find(b => b.slot === g.slot)!
          return (
            <div
              key={g.slot}
              style={{
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)', padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent(g.slot), flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {bucket.name}
                </span>
              </div>

              <input
                value={g.title}
                onChange={e => onUpdateTitle(g.slot, e.target.value)}
                placeholder={GOAL_HINTS[g.slot]}
                maxLength={120}
                style={{
                  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)', padding: '9px 12px',
                  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>By when?</span>
                <input
                  type="date"
                  value={g.deadline}
                  onChange={e => onUpdateDeadline(g.slot, e.target.value)}
                  style={{
                    flex: 1, background: 'var(--bg)', border: '1px solid var(--line)',
                    borderRadius: 'var(--r-sm)', padding: '6px 10px',
                    color: g.deadline ? 'var(--text)' : 'var(--text-dim)', fontSize: 13,
                    fontFamily: 'inherit', outline: 'none', colorScheme: 'dark',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>optional</span>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p style={{
          fontSize: 13, color: 'var(--text-dim)', marginTop: 16,
          background: 'color-mix(in srgb, var(--fitness) 10%, transparent)',
          borderRadius: 'var(--r-sm)', padding: '8px 12px',
        }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 24, alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 4px',
          }}
        >
          ← Edit buckets
        </button>
        <Button
          variant="primary"
          disabled={!canSave || saving}
          onClick={onSave}
          style={{ flex: 1 }}
        >
          {saving ? 'Setting up…' : 'Start using LifeMap'}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [buckets, setBuckets] = useState<BucketDraft[]>(
    SLOTS.map(slot => ({ slot, name: DEFAULT_NAMES[slot] }))
  )
  const [goals, setGoals] = useState<GoalDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Bucket helpers */
  const usedSlots = new Set(buckets.map(b => b.slot))

  function updateName(slot: AccentSlot, name: string) {
    setBuckets(prev => prev.map(b => b.slot === slot ? { ...b, name } : b))
  }

  function removeBucket(slot: AccentSlot) {
    setBuckets(prev => prev.filter(b => b.slot !== slot))
  }

  function addBucket() {
    const nextSlot = SLOTS.find(s => !usedSlots.has(s))
    if (!nextSlot) return
    setBuckets(prev => [...prev, { slot: nextSlot, name: DEFAULT_NAMES[nextSlot] }])
  }

  function advanceToGoals() {
    setGoals(buckets.map(b => ({ slot: b.slot, title: '', deadline: '' })))
    setStep(2)
  }

  /* Goal helpers */
  function updateGoalTitle(slot: AccentSlot, title: string) {
    setGoals(prev => prev.map(g => g.slot === slot ? { ...g, title } : g))
  }

  function updateGoalDeadline(slot: AccentSlot, deadline: string) {
    setGoals(prev => prev.map(g => g.slot === slot ? { ...g, deadline } : g))
  }

  const allGoalsFilled = goals.length > 0 && goals.every(g => g.title.trim().length > 0)

  /* Save */
  async function handleSave() {
    if (!user || !allGoalsFilled) return
    setSaving(true)
    setError(null)

    try {
      // Single transaction via RPC — atomic, idempotent, retryable
      const { error } = await supabase.rpc('complete_onboarding', {
        p_buckets: buckets.map((b, i) => {
          const goal = goals.find(g => g.slot === b.slot)!
          return {
            name:          b.name.trim() || DEFAULT_NAMES[b.slot],
            color:         b.slot,
            sort_order:    i,
            goal_title:    goal.title.trim(),
            goal_deadline: goal.deadline || null,
          }
        }),
      })

      if (error) throw new Error(error.message)

      await refreshProfile()
      navigate('/now', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', justifyContent: 'center',
      padding: '64px 24px 80px', overflowX: 'hidden',
    }}>
      <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div
              key="welcome"
              variants={SLIDE}
              initial="enter"
              animate="center"
              exit="exit"
              transition={TRANSITION}
              style={{ display: 'flex', justifyContent: 'center', paddingTop: '10vh' }}
            >
              <div style={{ maxWidth: 360, width: '100%' }}>
                <WelcomeStep onStart={() => setStep(1)} />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="buckets"
              variants={SLIDE}
              initial="enter"
              animate="center"
              exit="exit"
              transition={TRANSITION}
            >
              <BucketsStep
                buckets={buckets}
                onUpdateName={updateName}
                onRemove={removeBucket}
                onAdd={addBucket}
                onNext={advanceToGoals}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="goals"
              variants={SLIDE}
              initial="enter"
              animate="center"
              exit="exit"
              transition={TRANSITION}
            >
              <GoalsStep
                buckets={buckets}
                goals={goals}
                onUpdateTitle={updateGoalTitle}
                onUpdateDeadline={updateGoalDeadline}
                onBack={() => setStep(1)}
                onSave={handleSave}
                saving={saving}
                canSave={allGoalsFilled}
                error={error}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
