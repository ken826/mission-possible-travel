# Epic E1 — Foundation: Auth, RBAC, App Shell

Goal: A secure, usable app skeleton with role-based access and a consistent UI foundation.

## Scope

- App shell: top nav, side nav, responsive layout, “calm” design system (typography, spacing, subtle state chips)
- Authentication (choose approach consistent with your standard stack)
- RBAC roles: EMPLOYEE, OPS_COORDINATOR, APPROVER, FINANCE (and placeholder PARTNER disabled)
- User management (minimal v1):
    - Seeded users + role assignment
    - “My profile” view (name, email, role)
- Audit logging framework (table + helper) for sensitive actions

## Acceptance Criteria

- Users can sign in and see only permitted screens/actions
- Every request/action later can call a single audit logger
- UI layout is consistent across all pages