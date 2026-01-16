# Epic E3 — Workflow Engine + Timeline (Source of Truth)

Goal: Make workflow explicit, owned, timestamped, and auditable — with a timeline-centric request view.

## Scope

### State machine enforcement for allowed transitions

### Request detail page:

- Status chip + owner
- Timeline component (immutable events)
- Notes/comments with visibility: INTERNAL, REQUESTER

### Ops actions:

- Move request from SUBMITTED → TRIAGE
- Flag “missing info” (adds timeline note, notifies requester)
- Move to AWAITING_APPROVAL once complete

### SLA timers (minimal v1):

- Track “time in state”
- Highlight stale items on Ops board (no complex rules yet)

## Acceptance Criteria

- Illegal transitions are blocked (API + UI)
- Every transition writes a timeline event
- Request detail page is usable as the “single narrative”