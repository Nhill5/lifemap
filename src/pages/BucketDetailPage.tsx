import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { VoiceLine } from '@/components/ui/VoiceLine'

export function BucketDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <AppShell>
      <VoiceLine>
        Bucket detail ({id}) — coming with{' '}
        <b>PR #3</b>
      </VoiceLine>
    </AppShell>
  )
}
