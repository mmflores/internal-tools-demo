import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { ClipboardList, LayoutDashboard, ScrollText, ShieldCheck } from "lucide-react"

import { useAuth } from "@/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { to: "/transactions", label: "Transaction Review", icon: ShieldCheck, permission: "transactions:read" },
  { to: "/access-requests", label: "Access Requests", icon: ClipboardList, permission: "requests:read" },
  { to: "/audit-log", label: "Audit Log", icon: ScrollText, permission: "audit:read" },
] as const

export function AppShell() {
  const { me, signOut, can } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r bg-card md:block">
        <div className="flex h-14 items-center border-b px-5 font-semibold">Meridian Ops</div>
        <nav className="space-y-1 p-3">
          {NAV.filter((item) => !item.permission || can(item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent font-medium text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-6">
          <span className="text-sm text-muted-foreground">Internal tooling prototype</span>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              {me?.name} · <span className="capitalize text-muted-foreground">{me?.role}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut()
                navigate("/login")
              }}
            >
              Switch role
            </Button>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
