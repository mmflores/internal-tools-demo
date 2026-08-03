export type Role = "admin" | "compliance" | "engineer"

export type ReviewStatus = "pending" | "approved" | "rejected"
export type RequestStatus = "pending" | "approved" | "denied"
export type Environment = "dev" | "staging" | "production"

export interface Me {
  role: Role
  name: string
  permissions: string[]
}

export interface KycReview {
  id: number
  customer_name: string
  submitted_at: string
  risk_score: number
  status: ReviewStatus
  notes: string | null
  decided_by: string | null
}

export interface RefundRequest {
  id: number
  customer: string
  amount_cents: number
  currency: string
  reason: string
  status: ReviewStatus
  created_at: string
  decided_by: string | null
}

export interface FeatureFlag {
  id: number
  name: string
  environment: Environment
  enabled: boolean
  owner: string
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
