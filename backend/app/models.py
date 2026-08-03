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


class TransactionStatus(str, Enum):
    pending = "pending"
    flagged = "flagged"
    approved = "approved"
    rejected = "rejected"


class RequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    denied = "denied"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    role: Role


class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    reference: str = Field(index=True)
    counterparty: str
    amount_cents: int
    currency: str = "USD"
    status: TransactionStatus = TransactionStatus.pending
    risk_score: int
    created_at: datetime = Field(default_factory=utcnow)
    note: Optional[str] = None


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
