import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/auth/AuthProvider"
import { RequirePermission } from "@/auth/RequirePermission"
import { AppShell } from "@/components/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { AccessRequests } from "@/pages/AccessRequests"
import { AuditLog } from "@/pages/AuditLog"
import { Dashboard } from "@/pages/Dashboard"
import { FeatureFlags } from "@/pages/FeatureFlags"
import { KycReviews } from "@/pages/KycReviews"
import { Login } from "@/pages/Login"
import { Refunds } from "@/pages/Refunds"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequirePermission>
                <AppShell />
              </RequirePermission>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/kyc-reviews"
              element={
                <RequirePermission permission="kyc:read">
                  <KycReviews />
                </RequirePermission>
              }
            />
            <Route
              path="/refunds"
              element={
                <RequirePermission permission="refunds:read">
                  <Refunds />
                </RequirePermission>
              }
            />
            <Route
              path="/feature-flags"
              element={
                <RequirePermission permission="flags:read">
                  <FeatureFlags />
                </RequirePermission>
              }
            />
            <Route
              path="/access-requests"
              element={
                <RequirePermission permission="requests:read">
                  <AccessRequests />
                </RequirePermission>
              }
            />
            <Route
              path="/audit-log"
              element={
                <RequirePermission permission="audit:read">
                  <AuditLog />
                </RequirePermission>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors />
    </AuthProvider>
  )
}
