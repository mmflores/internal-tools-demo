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
import { formatDate } from "@/lib/format"
import type { KycReview, ReviewStatus } from "@/lib/types"

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
]

export function KycReviews() {
  const { can } = useAuth()
  const [status, setStatus] = useState("all")
  const fetcher = useCallback(() => api.kycReviews(status), [status])
  const { rows, loading, reload } = useResource<KycReview>(fetcher)

  const decide = async (review: KycReview, next: ReviewStatus) => {
    try {
      await api.decideKycReview(review.id, next)
      toast.success(`${review.customer_name} ${next}`)
      await reload()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const columns: ColumnDef<KycReview, unknown>[] = [
    { accessorKey: "customer_name", header: "Customer" },
    {
      accessorKey: "submitted_at",
      header: "Submitted",
      cell: ({ row }) => formatDate(row.original.submitted_at),
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
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ReviewActions
          status={row.original.status}
          decidedBy={row.original.decided_by}
          canDecide={can("kyc:decide")}
          onDecide={(next) => decide(row.original, next)}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="KYC Reviews"
        description="Verify customer onboarding submissions and record a compliance decision."
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search customers…"
        toolbar={<StatusFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />}
      />
    </>
  )
}
