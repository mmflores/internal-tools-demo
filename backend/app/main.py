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
    Environment,
    FeatureFlag,
    KycReview,
    RefundRequest,
    RequestStatus,
    ReviewStatus,
    Role,
)
from .reviews import apply_decision
from .schemas import (
    AccessRequestCreate,
    AccessRequestDecision,
    FlagToggle,
    Me,
    ReviewDecision,
)
from .seed import seed

PERMISSIONS: dict[Role, list[str]] = {
    Role.admin: [
        "kyc:read",
        "kyc:decide",
        "refunds:read",
        "refunds:decide",
        "flags:read",
        "flags:toggle",
        "requests:read",
        "requests:decide",
        "audit:read",
    ],
    Role.compliance: [
        "kyc:read",
        "kyc:decide",
        "refunds:read",
        "requests:read",
        "audit:read",
    ],
    Role.engineer: ["flags:read", "flags:toggle", "requests:read", "requests:create"],
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


@app.get("/api/kyc-reviews", response_model=list[KycReview])
def list_kyc_reviews(
    status: Optional[ReviewStatus] = None,
    min_risk: int = Query(default=0, ge=0, le=100),
    session: Session = Depends(get_session),
    _: Role = Depends(require_roles(Role.admin, Role.compliance)),
) -> list[KycReview]:
    query = select(KycReview).where(KycReview.risk_score >= min_risk)
    if status:
        query = query.where(KycReview.status == status)
    return list(session.exec(query.order_by(KycReview.submitted_at.desc())).all())


@app.patch("/api/kyc-reviews/{review_id}", response_model=KycReview)
def decide_kyc_review(
    review_id: int,
    decision: ReviewDecision,
    session: Session = Depends(get_session),
    auditor: Auditor = Depends(get_auditor),
    role: Role = Depends(require_roles(Role.admin, Role.compliance)),
) -> KycReview:
    def attach_notes(review: KycReview) -> None:
        if decision.notes is not None:
            review.notes = decision.notes

    return apply_decision(
        session, auditor, role, KycReview, "kyc_review", review_id, decision, attach_notes
    )


@app.get("/api/refunds", response_model=list[RefundRequest])
def list_refunds(
    status: Optional[ReviewStatus] = None,
    session: Session = Depends(get_session),
    _: Role = Depends(require_roles(Role.admin, Role.compliance)),
) -> list[RefundRequest]:
    query = select(RefundRequest)
    if status:
        query = query.where(RefundRequest.status == status)
    return list(session.exec(query.order_by(RefundRequest.created_at.desc())).all())


@app.patch("/api/refunds/{refund_id}", response_model=RefundRequest)
def decide_refund(
    refund_id: int,
    decision: ReviewDecision,
    session: Session = Depends(get_session),
    auditor: Auditor = Depends(get_auditor),
    role: Role = Depends(require_roles(Role.admin)),
) -> RefundRequest:
    return apply_decision(session, auditor, role, RefundRequest, "refund", refund_id, decision)


@app.get("/api/feature-flags", response_model=list[FeatureFlag])
def list_feature_flags(
    environment: Optional[Environment] = None,
    session: Session = Depends(get_session),
    _: Role = Depends(require_roles(Role.admin, Role.compliance, Role.engineer)),
) -> list[FeatureFlag]:
    query = select(FeatureFlag)
    if environment:
        query = query.where(FeatureFlag.environment == environment)
    return list(session.exec(query.order_by(FeatureFlag.name)).all())


@app.patch("/api/feature-flags/{flag_id}", response_model=FeatureFlag)
def toggle_feature_flag(
    flag_id: int,
    payload: FlagToggle,
    session: Session = Depends(get_session),
    auditor: Auditor = Depends(get_auditor),
    role: Role = Depends(require_roles(Role.admin, Role.engineer)),
) -> FeatureFlag:
    flag = session.get(FeatureFlag, flag_id)
    if flag is None:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    if role is Role.engineer and flag.environment is not Environment.dev:
        raise HTTPException(
            status_code=403,
            detail="Engineers may only toggle flags in the dev environment",
        )

    before = flag.model_copy(deep=True)
    flag.enabled = payload.enabled

    auditor.record(
        "feature_flag.enabled" if payload.enabled else "feature_flag.disabled",
        "feature_flag",
        flag_id,
        before=before,
        after=flag,
    )
    session.add(flag)
    session.commit()
    session.refresh(flag)
    return flag


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
