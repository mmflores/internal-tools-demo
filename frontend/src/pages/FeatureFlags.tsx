import { useCallback, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthProvider"
import { DataTable } from "@/components/DataTable"
import { PageHeader } from "@/components/PageHeader"
import { StatusFilter } from "@/components/StatusFilter"
import { Switch } from "@/components/ui/switch"
import { useResource } from "@/hooks/useResource"
import { api } from "@/lib/api"
import type { FeatureFlag } from "@/lib/types"

const ENVIRONMENTS = [
  { label: "dev", value: "dev" },
  { label: "staging", value: "staging" },
  { label: "production", value: "production" },
]

export function FeatureFlags() {
  const { can, me } = useAuth()
  const [environment, setEnvironment] = useState("all")
  const fetcher = useCallback(() => api.featureFlags(environment), [environment])
  const { rows, loading, reload } = useResource<FeatureFlag>(fetcher)

  const mayToggle = (flag: FeatureFlag) =>
    can("flags:toggle") && (me?.role !== "engineer" || flag.environment === "dev")

  const toggle = async (flag: FeatureFlag, enabled: boolean) => {
    try {
      await api.toggleFeatureFlag(flag.id, enabled)
      toast.success(`${flag.name} ${enabled ? "enabled" : "disabled"} in ${flag.environment}`)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      await reload()
    }
  }

  const columns: ColumnDef<FeatureFlag, unknown>[] = [
    {
      accessorKey: "name",
      header: "Feature",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.name}</span>,
    },
    { accessorKey: "environment", header: "Environment" },
    { accessorKey: "owner", header: "Owner" },
    {
      accessorKey: "enabled",
      header: "Enabled",
      cell: ({ row }) => (
        <Switch
          checked={row.original.enabled}
          disabled={!mayToggle(row.original)}
          onCheckedChange={(checked) => toggle(row.original, checked)}
          aria-label={`Toggle ${row.original.name} in ${row.original.environment}`}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Feature Flags"
        description="Toggling writes immediately — no approval queue, still fully audited."
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search flags or owners…"
        emptyMessage="No flags defined."
        toolbar={
          <StatusFilter
            value={environment}
            onChange={setEnvironment}
            options={ENVIRONMENTS}
            allLabel="All environments"
            className="w-48"
          />
        }
      />
    </>
  )
}
