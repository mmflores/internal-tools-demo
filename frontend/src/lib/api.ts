import type {
  AccessRequest,
  AuditEntry,
  FeatureFlag,
  KycReview,
  Me,
  RefundRequest,
  RequestStatus,
  ReviewStatus,
  Role,
} from "./types"

const ROLE_STORAGE_KEY = "internal-tools.role"

export function storedRole(): Role | null {
  return (localStorage.getItem(ROLE_STORAGE_KEY) as Role | null) ?? null
}

export function storeRole(role: Role | null) {
  if (role) localStorage.setItem(ROLE_STORAGE_KEY, role)
  else localStorage.removeItem(ROLE_STORAGE_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const role = storedRole()
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(role ? { "X-Role": role } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed with ${response.status}`)
  }
  return response.json() as Promise<T>
}

function withStatus(path: string, status?: string) {
  return status && status !== "all" ? `${path}?status=${status}` : path
}

export const api = {
  me: () => request<Me>("/me"),

  kycReviews: (status?: string) => request<KycReview[]>(withStatus("/kyc-reviews", status)),
  decideKycReview: (id: number, status: ReviewStatus, notes?: string) =>
    request<KycReview>(`/kyc-reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }),

  refunds: (status?: string) => request<RefundRequest[]>(withStatus("/refunds", status)),
  decideRefund: (id: number, status: ReviewStatus) =>
    request<RefundRequest>(`/refunds/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  featureFlags: (environment?: string) =>
    request<FeatureFlag[]>(
      environment && environment !== "all"
        ? `/feature-flags?environment=${environment}`
        : "/feature-flags",
    ),
  toggleFeatureFlag: (id: number, enabled: boolean) =>
    request<FeatureFlag>(`/feature-flags/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),

  accessRequests: () => request<AccessRequest[]>("/access-requests"),
  createAccessRequest: (body: { system: string; justification: string }) =>
    request<AccessRequest>("/access-requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  decideAccessRequest: (id: number, status: RequestStatus) =>
    request<AccessRequest>(`/access-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  auditLog: (entity?: string) =>
    request<AuditEntry[]>(entity && entity !== "all" ? `/audit-log?entity=${entity}` : "/audit-log"),
}
