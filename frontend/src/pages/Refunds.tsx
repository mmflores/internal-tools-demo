import { useCallback, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthProvider"
import { DataTable } from "@/components/DataTable"
import { PageHeader } from "@/components/PageHeader"
import { ReviewActions } from "@/components/ReviewActions"
import { StatusBadge } from "@/components/StatusBadge"
import { StatusFilter } from "@/components/StatusFilter"
import { useResource } from "@/hooks/useResource"
import { api } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import type { RefundRequest, ReviewStatus } from "@/lib/types"

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
]

export function Refunds() {
  const { can } = useAuth()
  const [status, setStatus] = useState("all")
  const fetcher = useCallback(() => api.refunds(status), [status])
  const { rows, loading, reload } = useResource<RefundRequest>(fetcher)

  const decide = async (refund: RefundRequest, next: ReviewStatus) => {
    try {
      await api.decideRefund(refund.id, next)
      toast.success(`Refund for ${refund.customer} ${next}`)
      await reload()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const columns: ColumnDef<RefundRequest, unknown>[] = [
    {
      accessorKey: "amount_cents",
      header: "Amount",
      cell: ({ row }) => formatMoney(row.original.amount_cents, row.original.currency),
    },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "reason", header: "Reason" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ReviewActions
          status={row.original.status}
          decidedBy={row.original.decided_by}
          canDecide={can("refunds:decide")}
          onDecide={(next) => decide(row.original, next)}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Refund Dashboard"
        description="Approve or reject customer refund requests."
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search customer or reason…"
        toolbar={<StatusFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />}
      />
    </>
  )
}
