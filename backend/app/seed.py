import random
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from .models import (
    AccessRequest,
    Environment,
    FeatureFlag,
    KycReview,
    RefundRequest,
    RequestStatus,
    ReviewStatus,
    Role,
    User,
)

CUSTOMERS = [
    "Nadia Okoro",
    "Priya Raman",
    "Marcus Feld",
    "Elena Duarte",
    "Tom Whitfield",
    "Sofia Larsen",
    "Idris Bello",
    "Hannah Choi",
]

REFUND_REASONS = [
    "Duplicate charge",
    "Service not delivered",
    "Merchant error",
    "Customer dispute",
    "Cancelled subscription",
]

SYSTEMS = ["Ledger Admin", "Payments Console", "Data Warehouse", "KYC Portal"]

FLAGS = [
    ("instant_payouts", "payments@example.com"),
    ("kyc_auto_approve", "compliance@example.com"),
    ("new_refund_flow", "payments@example.com"),
    ("audit_export", "platform@example.com"),
    ("sandbox_banner", "platform@example.com"),
]


def seed(session: Session) -> None:
    """Populate deterministic demo data. No-op if the database already has rows."""
    if session.exec(select(KycReview)).first() is not None:
        return

    rng = random.Random(1337)
    base = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)

    session.add_all(
        [
            User(name="Avery Admin", email="avery@example.com", role=Role.admin),
            User(name="Casey Compliance", email="casey@example.com", role=Role.compliance),
            User(name="Eli Engineer", email="eli@example.com", role=Role.engineer),
        ]
    )

    statuses = list(ReviewStatus)
    for i in range(32):
        decided = i % 3 == 0
        session.add(
            KycReview(
                customer_name=CUSTOMERS[i % len(CUSTOMERS)],
                submitted_at=base + timedelta(hours=i * 9),
                risk_score=rng.randint(1, 99),
                status=statuses[i % len(statuses)] if decided else ReviewStatus.pending,
                decided_by="Casey Compliance" if decided else None,
            )
        )

    for i in range(24):
        decided = i % 4 == 0
        session.add(
            RefundRequest(
                customer=CUSTOMERS[(i + 3) % len(CUSTOMERS)],
                amount_cents=rng.randint(5_00, 90_000_00),
                reason=REFUND_REASONS[i % len(REFUND_REASONS)],
                status=statuses[i % len(statuses)] if decided else ReviewStatus.pending,
                created_at=base + timedelta(hours=i * 13),
                decided_by="Avery Admin" if decided else None,
            )
        )

    for index, (name, owner) in enumerate(FLAGS):
        for environment in Environment:
            session.add(
                FeatureFlag(
                    name=name,
                    environment=environment,
                    enabled=environment is Environment.dev or index % 3 == 0,
                    owner=owner,
                )
            )

    for i in range(12):
        session.add(
            AccessRequest(
                requester=rng.choice(["Eli Engineer", "Robin Dev", "Sam Analyst"]),
                system=rng.choice(SYSTEMS),
                justification="Needed for on-call rotation and incident triage.",
                status=RequestStatus.pending if i % 2 else RequestStatus.approved,
                created_at=base + timedelta(days=i),
                decided_by=None if i % 2 else "Avery Admin",
            )
        )

    session.commit()
