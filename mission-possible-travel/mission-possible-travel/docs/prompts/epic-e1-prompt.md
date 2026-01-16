You are implementing Epic E1 for “Mission: Possible”, a web app that fully replaces monday.com for travel & catering workflows.

EPIC E1 GOAL
Deliver a secure app foundation: authentication, role-based access control (RBAC), base UI shell/navigation, and an audit logging framework. This must be production-grade and set up the codebase for later epics.

NON-NEGOTIABLES
- Mission: Possible is the single system of record. No monday.com integration.
- Implement RBAC with roles: EMPLOYEE, OPS_COORDINATOR, APPROVER, FINANCE.
- Add PARTNER role as a placeholder but do NOT enable any partner screens/flows yet.
- Build a calm, clean, modern UI shell (top nav + left nav) with role-aware links.
- Add an audit log table and helper function. Every privileged action later must call it.

DELIVERABLES
1) App Shell
- Layout with top nav + left nav
- Role-aware nav items (hide what user can’t access)
- Standard page container + empty-state components
- Consistent styling (minimal and readable)

2) Auth + Session
- Implement authentication suitable for internal org use
- Seed users for local/dev so the app is usable without external setup
- Provide a simple “switch user” dev-only helper if helpful (optional)

3) RBAC
- Central permission function: canAccessRoute(user, route) and canPerformAction(user, action, resource)
- Enforce RBAC server-side on APIs and page access
- Add a forbidden page

4) Users
- Minimal user model: id, name, email, role, isActive
- Admin screen for Ops to view users and change roles (minimal v1)
- Seed at least: one user per role

5) Audit Log
- Audit table: actorId, action, entityType, entityId, metadataJson, createdAt
- Helper: audit(actor, action, entityType, entityId, metadata)
- Implement example audits: role change in admin, and login/session creation if appropriate

QUALITY BAR
- Type-safe code, clean boundaries (db/models/services/ui)
- Error handling and empty states
- Tests: at least RBAC unit tests + one integration smoke test for protected routes
- Add concise docs: /docs/epic-e1-foundation.md describing roles, permissions approach, and how to run locally

OUTPUT
- Implement the above, commit changes, ensure all tests pass.
- Do not start any E2 request features beyond minimal placeholder routes/pages.
