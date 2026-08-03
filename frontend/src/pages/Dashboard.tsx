import { useEffect, useState } from "react"

import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/PageHeader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"

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
      if (can("transactions:read")) {
        const transactions = await api.transactions()
        next.push({
          label: "Transactions pending review",
          value: String(transactions.filter((t) => t.status === "pending").length),
          hint: `${transactions.length} total in the ledger`,
        })
        next.push({
          label: "High risk (score ≥ 70)",
          value: String(transactions.filter((t) => t.risk_score >= 70).length),
          hint: "Prioritised for compliance review",
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
