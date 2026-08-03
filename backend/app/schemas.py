from typing import Optional

from pydantic import BaseModel

from .models import RequestStatus, ReviewStatus, Role


class Me(BaseModel):
    role: Role
    name: str
    permissions: list[str]


class ReviewDecision(BaseModel):
    """Approve/reject payload shared by the KYC and refund queues."""

    status: ReviewStatus
    notes: Optional[str] = None


class FlagToggle(BaseModel):
    enabled: bool


class AccessRequestCreate(BaseModel):
    system: str
    justification: str


class AccessRequestDecision(BaseModel):
    status: RequestStatus
