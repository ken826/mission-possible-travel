# Epic E4 — Approvals: Policy Routing + Delegation

Goal: Automatic approver assignment and a clean approver experience that eliminates chasing.

## Scope

### Approval policy engine v1:

- Determine primary approver based on directorate/costCentre
- Escalate to CEO based on simple thresholds (config-driven)

### Delegation:

- Acting approver with date ranges
- Ops override with reason (audited)

### Approver inbox:

- Filterable list of “Action Required”
- Approve / Reject with comment

### Transitions:

- AWAITING_APPROVAL → APPROVED or REJECTED
- Timeline entries for decisions
- Notifications to requester + ops

## Acceptance Criteria

- A request automatically routes to the correct approver
- Approver can action in <30 seconds from inbox
- Delegation works (approvals route to acting approver within date range)
- Overrides are captured with reason and audit log