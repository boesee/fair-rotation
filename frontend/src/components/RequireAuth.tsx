import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return null
  }

  // UC-01/A1 (umgekehrt): keine Session -> zurueck zum Login-Formular.
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
