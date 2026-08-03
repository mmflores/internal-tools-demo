import random
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from .models import (
    AccessRequest,
    RequestStatus,
    Role,
    Transaction,
    TransactionStatus,
    User,
)

COUNTERPARTIES = [
    "Northwind Capital",
    "Acme Payments",
    "Belmont Trust",
    "Cedar Financial",
    "Delta Remit",
    "Everline Bank",
    "Fairview Holdings",
    "Gulfstream FX",
]

SYSTEMS = ["Ledger Admin", "Payments Console", "Data Warehouse", "KYC Portal"]


def seed(session: Session) -> None:
    """Populate deterministic demo data. No-op if the database already has rows."""
    if session.exec(select(Transaction)).first() is not None:
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

    statuses = list(TransactionStatus)
    for i in range(48):
        risk = rng.randint(1, 99)
        session.add(
            Transaction(
                reference=f"TXN-{4200 + i}",
                counterparty=rng.choice(COUNTERPARTIES),
                amount_cents=rng.randint(5_00, 750_000_00),
                status=statuses[i % len(statuses)] if i % 3 else TransactionStatus.pending,
                risk_score=risk,
                created_at=base + timedelta(hours=i * 7),
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
