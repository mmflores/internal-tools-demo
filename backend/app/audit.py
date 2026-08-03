import json
from typing import Any, Optional

from fastapi import Depends
from sqlmodel import Session, SQLModel

from .auth import current_role
from .db import get_session
from .models import AuditLog, Role


def _serialize(entity: Optional[SQLModel]) -> Optional[str]:
    if entity is None:
        return None
    return json.dumps(entity.model_dump(mode="json"), sort_keys=True)


class Auditor:
    """Records mutations for one request. Entries are never updated or deleted."""

    def __init__(self, session: Session, actor_role: Role) -> None:
        self.session = session
        self.actor_role = actor_role

    def record(
        self,
        action: str,
        entity: str,
        entity_id: Any,
        *,
        before: Optional[SQLModel] = None,
        after: Optional[SQLModel] = None,
    ) -> AuditLog:
        entry = AuditLog(
            actor_role=self.actor_role.value,
            action=action,
            entity=entity,
            entity_id=str(entity_id),
            before=_serialize(before),
            after=_serialize(after),
        )
        self.session.add(entry)
        return entry


def get_auditor(
    session: Session = Depends(get_session),
    role: Role = Depends(current_role),
) -> Auditor:
    return Auditor(session, role)
