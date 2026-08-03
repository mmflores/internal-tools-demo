from collections.abc import Callable
from typing import Optional, TypeVar, Union

from fastapi import HTTPException
from sqlmodel import Session

from .audit import Auditor
from .auth import ROLE_LABELS
from .models import KycReview, RefundRequest, ReviewStatus, Role
from .schemas import ReviewDecision

Reviewable = TypeVar("Reviewable", KycReview, RefundRequest)


def apply_decision(
    session: Session,
    auditor: Auditor,
    role: Role,
    model: type[Reviewable],
    entity: str,
    entity_id: int,
    decision: ReviewDecision,
    mutate: Optional[Callable[[Reviewable], None]] = None,
) -> Reviewable:
    """Approve or reject a queued item, audit the change, and persist it.

    Shared by the KYC and refund queues: they differ only in their table and any
    extra fields `mutate` sets before the after-snapshot is taken.
    """
    if decision.status is ReviewStatus.pending:
        raise HTTPException(status_code=400, detail="Cannot move an item back to pending")

    item: Union[KycReview, RefundRequest, None] = session.get(model, entity_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{entity} not found")

    before = item.model_copy(deep=True)
    item.status = decision.status
    item.decided_by = ROLE_LABELS[role]
    if mutate:
        mutate(item)

    auditor.record(
        f"{entity}.{decision.status.value}",
        entity,
        entity_id,
        before=before,
        after=item,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item
