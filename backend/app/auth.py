from fastapi import Header, HTTPException

from .models import Role

ROLE_LABELS = {
    Role.admin: "Avery Admin",
    Role.compliance: "Casey Compliance",
    Role.engineer: "Eli Engineer",
}


def current_role(x_role: str = Header(default="")) -> Role:
    """Mock authentication: the client declares its role via the X-Role header.

    POC only. There is no verification of identity anywhere in this stack.
    """
    try:
        return Role(x_role.lower())
    except ValueError:
        raise HTTPException(status_code=401, detail="Missing or invalid X-Role header")


def require_roles(*allowed: Role):
    def dependency(x_role: str = Header(default="")) -> Role:
        resolved = current_role(x_role)
        if resolved not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{resolved.value}' may not perform this action",
            )
        return resolved

    return dependency
