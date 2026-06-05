import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { CelebrationProvider } from '@/contexts/CelebrationContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

import { LoginPage }         from '@/pages/LoginPage'
import { OnboardingPage }    from '@/pages/OnboardingPage'
import { NowPage }           from '@/pages/NowPage'
import { DayPage }           from '@/pages/DayPage'
import { WeekPage }          from '@/pages/WeekPage'
import { BucketsPage }       from '@/pages/BucketsPage'
import { BucketDetailPage }  from '@/pages/BucketDetailPage'
import { EveningMirrorPage } from '@/pages/EveningMirrorPage'
import { WeeklyMirrorPage }  from '@/pages/WeeklyMirrorPage'
import { WorkoutPage }       from '@/pages/WorkoutPage'
import { SettingsPage }      from '@/pages/SettingsPage'

const router = createBrowserRouter([
  /* Public */
  { path: '/login',     element: <LoginPage /> },

  /* Protected */
  {
    path: '/onboarding',
    element: <ProtectedRoute><OnboardingPage /></ProtectedRoute>,
  },
  {
    path: '/now',
    element: <ProtectedRoute><NowPage /></ProtectedRoute>,
  },
  {
    path: '/day',
    element: <ProtectedRoute><DayPage /></ProtectedRoute>,
  },
  {
    path: '/week',
    element: <ProtectedRoute><WeekPage /></ProtectedRoute>,
  },
  {
    path: '/buckets',
    element: <ProtectedRoute><BucketsPage /></ProtectedRoute>,
  },
  {
    path: '/buckets/:id',
    element: <ProtectedRoute><BucketDetailPage /></ProtectedRoute>,
  },
  {
    path: '/mirror/evening',
    element: <ProtectedRoute><EveningMirrorPage /></ProtectedRoute>,
  },
  {
    path: '/mirror/weekly',
    element: <ProtectedRoute><WeeklyMirrorPage /></ProtectedRoute>,
  },
  {
    path: '/workout',
    element: <ProtectedRoute><WorkoutPage /></ProtectedRoute>,
  },
  {
    path: '/workout/:blockId',
    element: <ProtectedRoute><WorkoutPage /></ProtectedRoute>,
  },
  {
    path: '/settings',
    element: <ProtectedRoute><SettingsPage /></ProtectedRoute>,
  },

  /* Root: redirect to /now */
  {
    path: '/',
    element: <Navigate to="/now" replace />,
  },

  /* Catch-all */
  {
    path: '*',
    element: <Navigate to="/now" replace />,
  },
])

export function App() {
  return (
    <SettingsProvider>
      <CelebrationProvider>
        <RouterProvider router={router} />
      </CelebrationProvider>
    </SettingsProvider>
  )
}
