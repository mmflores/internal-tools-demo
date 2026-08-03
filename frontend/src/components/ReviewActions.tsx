import { Button } from "@/components/ui/button"
import type { ReviewStatus } from "@/lib/types"

/** Approve/Reject pair used by every approval queue. */
export function ReviewActions({
  status,
  decidedBy,
  canDecide,
  onDecide,
}: {
  status: ReviewStatus
  decidedBy: string | null
  canDecide: boolean
  onDecide: (status: ReviewStatus) => void
}) {
  if (!canDecide || status !== "pending") {
    return <span className="text-sm text-muted-foreground">{decidedBy ?? "—"}</span>
  }
  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" onClick={() => onDecide("approved")}>
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDecide("rejected")}>
        Reject
      </Button>
    </div>
  )
}
