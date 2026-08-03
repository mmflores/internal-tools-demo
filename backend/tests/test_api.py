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
    assert client.get("/api/transactions").status_code == 401


def test_engineer_cannot_read_transactions(client):
    response = client.get("/api/transactions", headers={"X-Role": "engineer"})
    assert response.status_code == 403


def test_compliance_can_flag_and_audit_entry_is_written(client):
    headers = {"X-Role": "compliance"}
    transaction = client.get("/api/transactions", headers=headers).json()[0]

    patched = client.patch(
        f"/api/transactions/{transaction['id']}",
        json={"status": "flagged", "note": "Unusual counterparty"},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["status"] == "flagged"

    entries = client.get("/api/audit-log?entity=transaction", headers=headers).json()
    assert entries[0]["action"] == "transaction.flagged"
    assert entries[0]["actor_role"] == "compliance"
    assert entries[0]["before"] and entries[0]["after"]


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
