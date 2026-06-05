import { AppShell } from '@/components/layout/AppShell'
import { VoiceLine } from '@/components/ui/VoiceLine'

export function OnboardingPage() {
  return (
    <AppShell>
      <VoiceLine>
        Onboarding — coming in{' '}
        <b>PR #3</b>
      </VoiceLine>
    </AppShell>
  )
}
