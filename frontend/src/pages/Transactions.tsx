import { useCallback, useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthProvider"
import { DataTable } from "@/components/DataTable"
import { PageHeader } from "@/components/PageHeader"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api } from "@/lib/api"
import { formatDate, formatMoney } from "@/lib/format"
import type { Transaction, TransactionStatus } from "@/lib/types"

const columns: ColumnDef<Transaction, unknown>[] = [
  { accessorKey: "reference", header: "Reference" },
  { accessorKey: "counterparty", header: "Counterparty" },
  {
    accessorKey: "amount_cents",
    header: "Amount",
    cell: ({ row }) => formatMoney(row.original.amount_cents, row.original.currency),
  },
  {
    accessorKey: "risk_score",
    header: "Risk",
    cell: ({ row }) => (
      <span className={row.original.risk_score >= 70 ? "font-medium text-red-600" : undefined}>
        {row.original.risk_score}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
]

export function Transactions() {
  const { can } = useAuth()
  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("all")
  const [selected, setSelected] = useState<Transaction | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await api.transactions({ status: status === "all" ? undefined : status }))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function decide(transaction: Transaction, next: TransactionStatus) {
    try {
      await api.updateTransaction(transaction.id, next)
      toast.success(`${transaction.reference} marked ${next}`)
      setSelected(null)
      await load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="Transaction Review"
        description="Review high-risk payments and record a compliance decision."
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search reference or counterparty…"
        onRowClick={(row) => setSelected(row)}
        toolbar={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.reference}</SheetTitle>
              </SheetHeader>
              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Counterparty" value={selected.counterparty} />
                <Row label="Amount" value={formatMoney(selected.amount_cents, selected.currency)} />
                <Row label="Risk score" value={String(selected.risk_score)} />
                <Row label="Created" value={formatDate(selected.created_at)} />
                <Row label="Status" value={selected.status} />
                {selected.note && <Row label="Note" value={selected.note} />}
              </dl>

              {can("transactions:write") && (
                <div className="mt-6 flex gap-2">
                  <Button onClick={() => decide(selected, "approved")}>Approve</Button>
                  <Button variant="outline" onClick={() => decide(selected, "flagged")}>
                    Flag
                  </Button>
                  <Button variant="destructive" onClick={() => decide(selected, "rejected")}>
                    Reject
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right capitalize">{value}</dd>
    </div>
  )
}
