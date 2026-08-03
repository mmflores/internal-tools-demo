import { useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Role } from "@/lib/types"

const ROLES: { role: Role; title: string; blurb: string }[] = [
  { role: "admin", title: "Admin", blurb: "Decides refunds and toggles flags anywhere." },
  { role: "compliance", title: "Compliance", blurb: "Reviews KYC submissions, reads refunds." },
  { role: "engineer", title: "Engineer", blurb: "Toggles dev flags, requests system access." },
]

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Meridian Ops</CardTitle>
          <CardDescription>
            Mock sign-in for the prototype — pick a role to explore the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ROLES.map((option) => (
            <button
              key={option.role}
              type="button"
              onClick={() => {
                signIn(option.role)
                navigate("/")
              }}
              className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-accent"
            >
              <span>
                <span className="block font-medium">{option.title}</span>
                <span className="block text-sm text-muted-foreground">{option.blurb}</span>
              </span>
              <Button variant="secondary" size="sm" asChild>
                <span>Continue</span>
              </Button>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
