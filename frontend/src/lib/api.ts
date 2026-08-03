import type {
  AccessRequest,
  AuditEntry,
  Me,
  RequestStatus,
  Role,
  Transaction,
  TransactionStatus,
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

export const api = {
  me: () => request<Me>("/me"),
  transactions: (params: { status?: string; minRisk?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.set("status", params.status)
    if (params.minRisk) query.set("min_risk", String(params.minRisk))
    const suffix = query.toString() ? `?${query}` : ""
    return request<Transaction[]>(`/transactions${suffix}`)
  },
  updateTransaction: (id: number, status: TransactionStatus, note?: string) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
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
  auditLog: (params: { entity?: string } = {}) => {
    const query = params.entity ? `?entity=${params.entity}` : ""
    return request<AuditEntry[]>(`/audit-log${query}`)
  },
}
