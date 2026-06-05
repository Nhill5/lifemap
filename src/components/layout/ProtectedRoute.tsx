import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

/* PR #2 will wire the real Supabase session here.
   For now the stub always lets users through. */
const isAuthenticated = (): boolean => {
  // TODO (PR #2): return !!supabase.auth.getSession()
  return true
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
