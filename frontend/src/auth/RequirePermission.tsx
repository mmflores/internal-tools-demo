import { Navigate } from "react-router-dom"
import type { ReactNode } from "react"

import { useAuth } from "./AuthProvider"

export function RequirePermission({
  permission,
  children,
}: {
  permission?: string
  children: ReactNode
}) {
  const { me, loading, can } = useAuth()

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  if (!me) return <Navigate to="/login" replace />
  if (permission && !can(permission)) return <Navigate to="/" replace />
  return <>{children}</>
}
