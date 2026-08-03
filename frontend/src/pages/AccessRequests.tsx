import { useCallback, useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { useAuth } from "@/auth/AuthProvider"
import { DataTable } from "@/components/DataTable"
import { PageHeader } from "@/components/PageHeader"
import { ResourceForm } from "@/components/ResourceForm"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/format"
import type { AccessRequest } from "@/lib/types"

const SYSTEMS = ["Ledger Admin", "Payments Console", "Data Warehouse", "KYC Portal"]

const requestSchema = z.object({
  system: z.string().min(1, "Pick a system"),
  justification: z.string().min(10, "Give at least 10 characters of justification"),
})

type RequestValues = z.infer<typeof requestSchema>

export function AccessRequests() {
  const { can } = useAuth()
  const [rows, setRows] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await api.accessRequests())
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns: ColumnDef<AccessRequest, unknown>[] = [
    { accessorKey: "requester", header: "Requester" },
    { accessorKey: "system", header: "System" },
    { accessorKey: "justification", header: "Justification" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Submitted",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        can("requests:decide") && row.original.status === "pending" ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => decide(row.original.id, "approved")}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide(row.original.id, "denied")}>
              Deny
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{row.original.decided_by ?? "—"}</span>
        ),
    },
  ]

  async function decide(id: number, status: "approved" | "denied") {
    try {
      await api.decideAccessRequest(id, status)
      toast.success(`Request ${status}`)
      await load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="Access Requests"
        description="Same table and form primitives as Transaction Review, different schema."
        actions={
          can("requests:create") ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>New request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request system access</DialogTitle>
                </DialogHeader>
                <ResourceForm<RequestValues>
                  schema={requestSchema}
                  defaultValues={{ system: "", justification: "" }}
                  submitLabel="Submit request"
                  fields={[
                    {
                      name: "system",
                      label: "System",
                      type: "select",
                      options: SYSTEMS.map((system) => ({ label: system, value: system })),
                    },
                    {
                      name: "justification",
                      label: "Justification",
                      type: "textarea",
                      placeholder: "Why do you need this access?",
                    },
                  ]}
                  onSubmit={async (values) => {
                    try {
                      await api.createAccessRequest(values)
                      toast.success("Request submitted")
                      setDialogOpen(false)
                      await load()
                    } catch (error) {
                      toast.error((error as Error).message)
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search requester or system…"
      />
    </>
  )
}
