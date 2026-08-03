import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  flagged: "bg-red-100 text-red-800 hover:bg-red-100",
  approved: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  rejected: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  denied: "bg-slate-200 text-slate-700 hover:bg-slate-200",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("capitalize", TONES[status])}>
      {status}
    </Badge>
  )
}
