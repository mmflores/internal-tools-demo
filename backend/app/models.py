from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, Enum):
    admin = "admin"
    compliance = "compliance"
    engineer = "engineer"


class ReviewStatus(str, Enum):
    """Shared by every approval queue in the platform."""

    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Environment(str, Enum):
    dev = "dev"
    staging = "staging"
    production = "production"


class RequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    denied = "denied"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    role: Role


class KycReview(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_name: str = Field(index=True)
    submitted_at: datetime = Field(default_factory=utcnow)
    risk_score: int
    status: ReviewStatus = ReviewStatus.pending
    notes: Optional[str] = None
    decided_by: Optional[str] = None


class RefundRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer: str = Field(index=True)
    amount_cents: int
    currency: str = "USD"
    reason: str
    status: ReviewStatus = ReviewStatus.pending
    created_at: datetime = Field(default_factory=utcnow)
    decided_by: Optional[str] = None


class FeatureFlag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    environment: Environment
    enabled: bool = False
    owner: str


class AccessRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    requester: str
    system: str
    justification: str
    status: RequestStatus = RequestStatus.pending
    created_at: datetime = Field(default_factory=utcnow)
    decided_by: Optional[str] = None


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=utcnow, index=True)
    actor_role: str
    action: str
    entity: str
    entity_id: str
    before: Optional[str] = None
    after: Optional[str] = None
