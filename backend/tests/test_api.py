import os
import tempfile

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"

from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_requires_role_header(client):
    assert client.get("/api/kyc-reviews").status_code == 401


def test_engineer_cannot_read_kyc_or_refunds(client):
    headers = {"X-Role": "engineer"}
    assert client.get("/api/kyc-reviews", headers=headers).status_code == 403
    assert client.get("/api/refunds", headers=headers).status_code == 403


def test_compliance_decides_kyc_and_audit_entry_is_written(client):
    headers = {"X-Role": "compliance"}
    review = client.get("/api/kyc-reviews?status=pending", headers=headers).json()[0]

    patched = client.patch(
        f"/api/kyc-reviews/{review['id']}",
        json={"status": "approved", "notes": "Documents verified"},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["status"] == "approved"
    assert patched.json()["decided_by"] == "Casey Compliance"
    assert patched.json()["notes"] == "Documents verified"

    entry = client.get("/api/audit-log?entity=kyc_review", headers=headers).json()[0]
    assert entry["action"] == "kyc_review.approved"
    assert entry["actor_role"] == "compliance"
    assert entry["before"] and entry["after"]


def test_only_admin_decides_refunds(client):
    refund = client.get("/api/refunds?status=pending", headers={"X-Role": "admin"}).json()[0]

    rejected = client.patch(
        f"/api/refunds/{refund['id']}",
        json={"status": "rejected"},
        headers={"X-Role": "compliance"},
    )
    assert rejected.status_code == 403

    approved = client.patch(
        f"/api/refunds/{refund['id']}",
        json={"status": "approved"},
        headers={"X-Role": "admin"},
    )
    assert approved.status_code == 200
    assert approved.json()["decided_by"] == "Avery Admin"


def test_cannot_move_a_decision_back_to_pending(client):
    review = client.get("/api/kyc-reviews", headers={"X-Role": "admin"}).json()[0]
    response = client.patch(
        f"/api/kyc-reviews/{review['id']}",
        json={"status": "pending"},
        headers={"X-Role": "admin"},
    )
    assert response.status_code == 400


def test_engineer_toggles_dev_flags_only(client):
    headers = {"X-Role": "engineer"}
    flags = client.get("/api/feature-flags", headers=headers).json()
    dev_flag = next(f for f in flags if f["environment"] == "dev")
    prod_flag = next(f for f in flags if f["environment"] == "production")

    toggled = client.patch(
        f"/api/feature-flags/{dev_flag['id']}",
        json={"enabled": not dev_flag["enabled"]},
        headers=headers,
    )
    assert toggled.status_code == 200
    assert toggled.json()["enabled"] is not dev_flag["enabled"]

    blocked = client.patch(
        f"/api/feature-flags/{prod_flag['id']}",
        json={"enabled": True},
        headers=headers,
    )
    assert blocked.status_code == 403

    allowed = client.patch(
        f"/api/feature-flags/{prod_flag['id']}",
        json={"enabled": True},
        headers={"X-Role": "admin"},
    )
    assert allowed.status_code == 200

    entry = client.get("/api/audit-log?entity=feature_flag", headers={"X-Role": "admin"}).json()[0]
    assert entry["action"] == "feature_flag.enabled"
    assert entry["actor_role"] == "admin"


def test_engineer_creates_request_and_admin_decides(client):
    created = client.post(
        "/api/access-requests",
        json={"system": "Ledger Admin", "justification": "On-call"},
        headers={"X-Role": "engineer"},
    )
    assert created.status_code == 201
    request_id = created.json()["id"]

    denied = client.patch(
        f"/api/access-requests/{request_id}",
        json={"status": "denied"},
        headers={"X-Role": "engineer"},
    )
    assert denied.status_code == 403

    approved = client.patch(
        f"/api/access-requests/{request_id}",
        json={"status": "approved"},
        headers={"X-Role": "admin"},
    )
    assert approved.status_code == 200
    assert approved.json()["decided_by"] == "Avery Admin"


def test_audit_log_is_not_writable(client):
    assert client.post("/api/audit-log", headers={"X-Role": "admin"}).status_code == 405
