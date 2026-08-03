# Internal Tools POC ("Meridian Ops")

A two-hour prototype evaluating whether React + FastAPI can replace Microsoft Power Apps for a
small set of internal fintech applications. It is a demonstration of a *platform pattern*, not a
production system.

## What it demonstrates

- **A reusable platform, not one-off pages.** Three different screens (Transaction Review, Access
  Requests, Audit Log) are all rendered by the same `DataTable`; the access-request form is
  generated from a zod schema by `ResourceForm`. Adding a fourth internal app means writing column
  definitions and a schema, not another page from scratch.
- **Role-based access.** Mock sign-in with Admin / Compliance / Engineer. Permissions drive the
  sidebar, the action buttons, and the API — an Engineer calling `GET /api/transactions` gets a 403.
- **Audit logging as a first-class feature.** Every mutating endpoint records actor, action, entity,
  and a before/after JSON snapshot through a single FastAPI dependency, so no route can silently
  skip the log. The log is append-only: there is no update or delete endpoint.

## Running it

Two terminals, no Docker required.

```bash
# backend → http://localhost:8000 (docs at /docs)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload

# frontend → http://localhost:5173 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

The SQLite database (`backend/internal_tools.db`) is created and seeded with deterministic demo
data on first startup. Delete the file to reset.

## Roles

| Role | Can do |
| --- | --- |
| Admin | Everything, including approving/denying access requests |
| Compliance | Read and decide transactions, read the audit log |
| Engineer | Submit access requests and see their own |

Sign-in is a role picker. The chosen role is stored in `localStorage` and sent as an `X-Role`
header; the backend trusts it. **This is not authentication** — it stands in for the SSO
integration a real deployment would use.

## Layout

```
backend/app/
  main.py      routes
  models.py    SQLModel tables (users, transactions, access_requests, audit_log)
  auth.py      X-Role mock auth + role guards
  audit.py     Auditor dependency used by every mutating route
  seed.py      deterministic demo data
frontend/src/
  components/  DataTable, ResourceForm, StatusBadge, PageHeader, AppShell
  auth/        AuthProvider + RequirePermission route guard
  pages/       Login, Dashboard, Transactions, AccessRequests, AuditLog
```

## Checks

```bash
cd backend && .venv/bin/python -m pytest    # API + audit + authorization smoke tests
cd frontend && npm run build && npm run lint
```

## Versus Power Apps

Where this approach wins: version control and code review, real testing, unrestricted component
reuse across apps, no per-user licensing, and audit logging shaped to the business rather than to
the platform's defaults. What Power Apps still gives you and this does not: a WYSIWYG builder for
non-engineers, hosting and identity out of the box, and connectors to Microsoft 365 data.

## Known gaps (deliberate)

Real authentication/authorization, tamper-evident audit storage (hash chaining or WORM), log
retention and export, database migrations, deployment, pagination on the server side,
accessibility and mobile polish, and comprehensive test coverage.
