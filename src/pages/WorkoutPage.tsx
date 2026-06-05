import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { VoiceLine } from '@/components/ui/VoiceLine'

export function WorkoutPage() {
  const { blockId } = useParams<{ blockId?: string }>()

  return (
    <AppShell>
      <VoiceLine>
        Workout logger{blockId ? ` (block: ${blockId})` : ''} — coming in{' '}
        <b>PR #6</b>
      </VoiceLine>
    </AppShell>
  )
}
