import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

import { api, storeRole, storedRole } from "@/lib/api"
import type { Me, Role } from "@/lib/types"

interface AuthValue {
  me: Me | null
  loading: boolean
  signIn: (role: Role) => void
  signOut: () => void
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!storedRole()) {
      setMe(null)
      setLoading(false)
      return
    }
    try {
      setMe(await api.me())
    } catch {
      storeRole(null)
      setMe(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const signIn = useCallback(
    (role: Role) => {
      storeRole(role)
      setLoading(true)
      void load()
    },
    [load],
  )

  const signOut = useCallback(() => {
    storeRole(null)
    setMe(null)
  }, [])

  const can = useCallback(
    (permission: string) => Boolean(me?.permissions.includes(permission)),
    [me],
  )

  return (
    <AuthContext.Provider value={{ me, loading, signIn, signOut, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider")
  return value
}
