from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .audit import Auditor, get_auditor
from .auth import ROLE_LABELS, current_role, require_roles
from .db import engine, get_session, init_db
from .models import (
    AccessRequest,
    AuditLog,
    RequestStatus,
    Role,
    Transaction,
    TransactionStatus,
)
from .schemas import AccessRequestCreate, AccessRequestDecision, Me, TransactionUpdate
from .seed import seed

PERMISSIONS: dict[Role, list[str]] = {
    Role.admin: ["transactions:read", "transactions:write", "requests:read", "requests:decide", "audit:read"],
    Role.compliance: ["transactions:read", "transactions:write", "requests:read", "audit:read"],
    Role.engineer: ["requests:read", "requests:create"],
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with Session(engine) as session:
        seed(session)
    yield


app = FastAPI(title="Internal Tools POC", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/me", response_model=Me)
def me(role: Role = Depends(current_role)) -> Me:
    return Me(role=role, name=ROLE_LABELS[role], permissions=PERMISSIONS[role])


@app.get("/api/transactions", response_model=list[Transaction])
def list_transactions(
    status: Optional[TransactionStatus] = None,
    min_risk: int = Query(default=0, ge=0, le=100),
    session: Session = Depends(get_session),
    _: Role = Depends(require_roles(Role.admin, Role.compliance)),
) -> list[Transaction]:
    query = select(Transaction).where(Transaction.risk_score >= min_risk)
    if status:
        query = query.where(Transaction.status == status)
    return list(session.exec(query.order_by(Transaction.created_at.desc())).all())


@app.patch("/api/transactions/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    session: Session = Depends(get_session),
    auditor: Auditor = Depends(get_auditor),
    _: Role = Depends(require_roles(Role.admin, Role.compliance)),
) -> Transaction:
    transaction = session.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    before = transaction.model_copy(deep=True)
    transaction.status = payload.status
    if payload.note is not None:
        transaction.note = payload.note

    auditor.record(
        f"transaction.{payload.status.value}",
        "transaction",
        transaction_id,
        before=before,
        after=transaction,
    )
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@app.get("/api/access-requests", response_model=list[AccessRequest])
def list_access_requests(
    role: Role = Depends(current_role),
    session: Session = Depends(get_session),
) -> list[AccessRequest]:
    query = select(AccessRequest)
    if role is Role.engineer:
        query = query.where(AccessRequest.requester == ROLE_LABELS[Role.engineer])
    return list(session.exec(query.order_by(AccessRequest.created_at.desc())).all())


@app.post("/api/access-requests", response_model=AccessRequest, status_code=201)
def create_access_request(
    payload: AccessRequestCreate,
    session: Session = Depends(get_session),
    auditor: Auditor = Depends(get_auditor),
    role: Role = Depends(require_roles(Role.admin, Role.engineer)),
) -> AccessRequest:
    request = AccessRequest(
        requester=ROLE_LABELS[role],
        system=payload.system,
        justification=payload.justification,
    )
    session.add(request)
    session.flush()
    auditor.record("access_request.created", "access_request", request.id, after=request)
    session.commit()
    session.refresh(request)
    return request


@app.patch("/api/access-requests/{request_id}", response_model=AccessRequest)
def decide_access_request(
    request_id: int,
    payload: AccessRequestDecision,
    session: Session = Depends(get_session),
    auditor: Auditor = Depends(get_auditor),
    role: Role = Depends(require_roles(Role.admin)),
) -> AccessRequest:
    request = session.get(AccessRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Access request not found")
    if payload.status is RequestStatus.pending:
        raise HTTPException(status_code=400, detail="Cannot move a request back to pending")

    before = request.model_copy(deep=True)
    request.status = payload.status
    request.decided_by = ROLE_LABELS[role]

    auditor.record(
        f"access_request.{payload.status.value}",
        "access_request",
        request_id,
        before=before,
        after=request,
    )
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


@app.get("/api/audit-log", response_model=list[AuditLog])
def list_audit_log(
    entity: Optional[str] = None,
    action: Optional[str] = None,
    actor_role: Optional[Role] = None,
    session: Session = Depends(get_session),
    _: Role = Depends(require_roles(Role.admin, Role.compliance)),
) -> list[AuditLog]:
    query = select(AuditLog)
    if entity:
        query = query.where(AuditLog.entity == entity)
    if action:
        query = query.where(AuditLog.action == action)
    if actor_role:
        query = query.where(AuditLog.actor_role == actor_role.value)
    return list(session.exec(query.order_by(AuditLog.timestamp.desc())).all())
