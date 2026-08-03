export type Role = "admin" | "compliance" | "engineer"

export type TransactionStatus = "pending" | "flagged" | "approved" | "rejected"
export type RequestStatus = "pending" | "approved" | "denied"

export interface Me {
  role: Role
  name: string
  permissions: string[]
}

export interface Transaction {
  id: number
  reference: string
  counterparty: string
  amount_cents: number
  currency: string
  status: TransactionStatus
  risk_score: number
  created_at: string
  note: string | null
}

export interface AccessRequest {
  id: number
  requester: string
  system: string
  justification: string
  status: RequestStatus
  created_at: string
  decided_by: string | null
}

export interface AuditEntry {
  id: number
  timestamp: string
  actor_role: Role
  action: string
  entity: string
  entity_id: string
  before: string | null
  after: string | null
}
