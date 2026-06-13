import type { CelebrationOptions } from '@/types'

/**
 * The dopamine ladder (§7) — intensity scales with the weight of the act.
 * Weight is derived by the app, not self-assigned. soft/beat are quiet inline
 * acknowledgments; moment/bloom take the screen.
 *   task      → soft fill (calm, earned)
 *   subgoal   → a noticeable beat
 *   milestone → a real moment
 *   comeback  → a moment, the most celebrated act in the app (§6 masterstroke)
 *   chief/pr/unlock → full LEVEL-UP bloom
 */
export type LadderEvent = 'task' | 'subgoal' | 'milestone' | 'comeback' | 'chief_goal' | 'pr' | 'unlock'

const TIER: Record<LadderEvent, CelebrationOptions['tier']> = {
  task: 'soft',
  subgoal: 'beat',
  milestone: 'moment',
  comeback: 'moment',
  chief_goal: 'bloom',
  pr: 'bloom',
  unlock: 'bloom',
}

export function celebrationFor(event: LadderEvent, title: string, sub?: string, color?: string): CelebrationOptions {
  return { tier: TIER[event], title, sub, color }
}
