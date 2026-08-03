import { useCallback, useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { DataTable } from "@/components/DataTable"
import { PageHeader } from "@/components/PageHeader"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/format"
import type { AuditEntry } from "@/lib/types"

const columns: ColumnDef<AuditEntry, unknown>[] = [
  {
    accessorKey: "timestamp",
    header: "When",
    cell: ({ row }) => formatDate(row.original.timestamp),
  },
  {
    accessorKey: "actor_role",
    header: "Actor",
    cell: ({ row }) => <span className="capitalize">{row.original.actor_role}</span>,
  },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "entity", header: "Entity" },
  { accessorKey: "entity_id", header: "Entity ID" },
]

export function AuditLog() {
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entity, setEntity] = useState("all")
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await api.auditLog({ entity: entity === "all" ? undefined : entity }))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [entity])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Append-only record of every mutation, captured server-side."
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search actions…"
        emptyMessage="No activity recorded yet."
        onRowClick={(row) => setSelected(row)}
        toolbar={
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="transaction">Transactions</SelectItem>
              <SelectItem value="access_request">Access requests</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.action}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <Diff title="Before" value={selected.before} />
                <Diff title="After" value={selected.after} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Diff({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <p className="mb-1 font-medium">{title}</p>
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
        {value ? JSON.stringify(JSON.parse(value), null, 2) : "—"}
      </pre>
    </div>
  )
}
