from typing import Optional

from pydantic import BaseModel

from .models import RequestStatus, Role, TransactionStatus


class Me(BaseModel):
    role: Role
    name: str
    permissions: list[str]


class TransactionUpdate(BaseModel):
    status: TransactionStatus
    note: Optional[str] = None


class AccessRequestCreate(BaseModel):
    system: str
    justification: str


class AccessRequestDecision(BaseModel):
    status: RequestStatus
