# Epic E6 — Finance Reconciliation + Reporting + Notifications Polish

Goal: Close the loop with finance workflows, exports, and refined notification strategy.

## Scope

### Finance view:

- List requests in INVOICED
- Mark as RECONCILED (with optional fields: GL, payment reference)
- Transition to CLOSED

### Exporting:

- CSV export for finance reporting
- Basic reports: by directorate, month, spend estimates vs actual invoices

### Notifications polish:

- Email templates for key events
- Reminder nudges for stale approvals / triage

### Hardening:

- Permission tests
- Audit coverage review

## Acceptance Criteria

- Finance can reconcile and close requests without email or manual tracking
- Exports support month-end processing
- Stale approval reminders reduce stalled requests