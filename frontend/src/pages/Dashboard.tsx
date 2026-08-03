import { useEffect, useState } from "react"

import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/PageHeader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { formatMoney } from "@/lib/format"

interface Summary {
  label: string
  value: string
  hint: string
}

export function Dashboard() {
  const { me, can } = useAuth()
  const [cards, setCards] = useState<Summary[]>([])

  useEffect(() => {
    async function load() {
      const next: Summary[] = []
      if (can("kyc:read")) {
        const reviews = await api.kycReviews()
        next.push({
          label: "KYC reviews pending",
          value: String(reviews.filter((r) => r.status === "pending").length),
          hint: `${reviews.filter((r) => r.risk_score >= 70).length} of them high risk`,
        })
      }
      if (can("refunds:read")) {
        const refunds = await api.refunds()
        const pending = refunds.filter((r) => r.status === "pending")
        next.push({
          label: "Refunds awaiting decision",
          value: String(pending.length),
          hint: formatMoney(pending.reduce((sum, r) => sum + r.amount_cents, 0)) + " at stake",
        })
      }
      if (can("flags:read")) {
        const flags = await api.featureFlags()
        next.push({
          label: "Feature flags enabled",
          value: `${flags.filter((f) => f.enabled).length}/${flags.length}`,
          hint: "Across dev, staging and production",
        })
      }
      if (can("requests:read")) {
        const requests = await api.accessRequests()
        next.push({
          label: "Open access requests",
          value: String(requests.filter((r) => r.status === "pending").length),
          hint: `${requests.length} visible to you`,
        })
      }
      if (can("audit:read")) {
        const entries = await api.auditLog()

        next.push({
          label: "Audit entries",
          value: String(entries.length),
          hint: "Every mutation, append-only",
        })
      }
      setCards(next)
    }
    void load()
  }, [can])

  return (
    <>
      <PageHeader
        title={`Welcome, ${me?.name ?? ""}`}
        description="Overview of the internal applications available to your role."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
