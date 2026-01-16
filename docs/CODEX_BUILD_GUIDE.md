# Mission: Possible — Codex Build Guide

> **A comprehensive guide for building the Mission: Possible travel and catering operations platform**

---

## 📋 Overview

This document provides Codex with the context and specifications needed to build Mission: Possible, a web application for MHFA Australia that streamlines travel and catering request management.

### Key Stakeholders

| Person | Role | Needs |
|--------|------|-------|
| **Glenda** | Office Administrator (70yo) | Simple, calm UI; reduced email/phone chasing |
| **Amanda** | CEO's Executive Assistant | Efficiency; delegation support |
| **Mel** | FCCT Primary Contact | Portal access to collaborate on requests (Phase 2) |
| **Employees** | Staff across MHFA | Easy request submission; clear status tracking |
| **Executives** | Approvers | Quick approval actions; minimal friction |
| **Finance** | Accounts Team | Invoice reconciliation; exports |

### Design Philosophy

> **"Calm technology"** — The app should feel professional, welcoming, and stress-reducing. Glenda should feel delighted, not overwhelmed.

---

## 🏗️ Architecture Summary

### Core Entities

```
REQUEST (central entity)
├── requestType: TRAVEL | CATERING
├── status: (state machine)
├── timeline: immutable event log
├── attachments: quotes, itineraries, invoices
└── approvals: linked approval decisions

TRAVEL_DETAILS (1:1 with Request if travel)
├── dates, destination, traveller count
├── estimated cost, preferences

CATERING_DETAILS (1:1 with Request if catering)
├── event timing, location, attendee count
├── dietary requirements

USER
├── roles: EMPLOYEE, OPS_COORDINATOR, APPROVER, FINANCE, PARTNER
└── delegation relationships
```

### Workflow States

```
SUBMITTED → TRIAGE → AWAITING_APPROVAL → APPROVED → QUOTING → 
OPTION_REVIEW → BOOKED → ITINERARY_SENT → INVOICED → RECONCILED → CLOSED

Special states: REJECTED, CANCELLED (terminal)
```

---

## 🎨 Branding Requirements

### Colour Palette (from MHFA Brand Guidelines 2024)

| Token | Colour | HEX | Usage |
|-------|--------|-----|-------|
| `--primary` | MHFA Dark Green | `#00573D` | Primary buttons, headers, key accents |
| `--primary-foreground` | White | `#FFFFFF` | Text on primary |
| `--secondary` | MHFA Green | `#00AA52` | Hover states, success accents |
| `--accent` | MHFA Light Green | `#B2D136` | Badges, emphasis (sparingly) |
| `--muted` | Cool Grey | `#939597` | Secondary text, icons, borders |
| `--background` | White | `#FFFFFF` | Page backgrounds |

### Status Colours

| Status | Colour | HEX |
|--------|--------|-----|
| Pending/In Progress | Blue | `#0072CE` |
| Success/Approved | Mid Green | `#78BE20` |
| Warning/Urgent | Amber | `#E57200` |
| Error/Rejected | Dark Red | `#8A2A2B` |
| Cancelled | Cool Grey | `#53565A` |

---

## 📝 Build Phases (Epics)

### Epic 1: Foundation & RBAC

**Goal**: Secure app skeleton with authentication and roles

**Deliverables**:
- [ ] App shell: responsive layout, top nav, side nav
- [ ] Authentication (NextAuth.js + Azure AD recommended)
- [ ] Role-based access control
- [ ] Audit logging framework
- [ ] User profile view

**Acceptance Criteria**:
- Users sign in and see only permitted screens
- Audit helper available for all subsequent features

---

### Epic 2: Request Intake

**Goal**: Employees can submit travel and catering requests

**Deliverables**:
- [ ] Data model: Request, TravelDetails, CateringDetails
- [ ] Travel request form
- [ ] Catering request form
- [ ] Initial status = SUBMITTED
- [ ] Timeline event created on submission
- [ ] Notification to Ops Coordinators

**Acceptance Criteria**:
- Requests appear in "My Requests" and Ops dashboard
- Timeline shows submission event

---

### Epic 3: Workflow Engine & Timeline

**Goal**: Explicit, owned, timestamped workflow

**Deliverables**:
- [ ] State machine with allowed transitions
- [ ] Request detail page with status chip, owner, timeline
- [ ] Notes/comments with visibility levels (INTERNAL, REQUESTER)
- [ ] Ops actions: SUBMITTED → TRIAGE, flag missing info, → AWAITING_APPROVAL
- [ ] SLA tracking: time in state, stale item highlighting

**Acceptance Criteria**:
- Illegal transitions are blocked
- Every transition creates a timeline event
- Request detail page serves as "single narrative"

---

### Epic 4: Approvals & Routing

**Goal**: Automatic approver assignment, clean approver experience

**Deliverables**:
- [ ] Approval policy engine (by directorate, cost, traveller count)
- [ ] CEO escalation rules
- [ ] Acting approver delegation with date ranges
- [ ] Ops override with reason
- [ ] Approver inbox with "Action Required" filter
- [ ] Approve/Reject with comment

**Acceptance Criteria**:
- Requests auto-route to correct approver
- Approval in <30 seconds from inbox
- Delegations respected within date ranges
- Overrides captured with audit

---

### Epic 5: Quoting, Review & Booking

**Goal**: Structured vendor collaboration, no email attachments

**Deliverables**:
- [ ] Quote options (multiple per request)
- [ ] Attach QUOTE documents
- [ ] Option review by requester
- [ ] Booking confirmation
- [ ] Itinerary upload (ITINERARY type)
- [ ] Invoice upload (INVOICE type with metadata)

**Acceptance Criteria**:
- Quotes, itineraries, invoices stored against request
- Requester can select preference in-app
- Ops completes booking without leaving app

---

### Epic 6: Finance, Reconciliation & Polish

**Goal**: Close the loop, enable reporting

**Deliverables**:
- [ ] Finance view: requests in INVOICED status
- [ ] Mark as RECONCILED with GL/payment reference
- [ ] Transition to CLOSED
- [ ] CSV export
- [ ] Basic reports: by directorate, month, spend vs actual
- [ ] Email notification templates
- [ ] Reminder nudges for stale items
- [ ] Permission tests, audit coverage

**Acceptance Criteria**:
- Finance can reconcile without email
- Exports support month-end processing
- Stale reminders reduce bottlenecks

---

## 🚨 Emergency Handling

The app must NOT block emergency situations. Key requirements:

1. **Display FCCT emergency hotline prominently**
2. **"Mark as Urgent" flag** for high-priority requests
3. **Post-incident documentation** via timeline
4. **Support out-of-band bookings** (record after the fact)

---

## ♿ Accessibility Requirements

- WCAG 2.1 AA compliance
- Minimum 16px font size
- Clear focus states
- Keyboard navigable
- Sufficient colour contrast

---

## 🔗 Key ADRs Reference

| ADR | Decision |
|-----|----------|
| 001 | Build dedicated app (replace monday.com) |
| 002 | Unified Request model with typed extensions |
| 003 | Explicit state machine with SLAs |
| 004 | Policy-driven approval routing |
| 005 | Internal-first, partner access Phase 2 |
| 006 | Timeline as primary communication record |
| 007 | Notifications link back to app (not standalone) |
| 008 | Structured document management |
| 009 | Role-based access control |
| 010 | Next.js + TypeScript + PostgreSQL stack |
| 011 | Calm UI/UX aligned with MHFA branding |
| 012 | Emergency support complement (not replace) |

---

## 🚀 Recommended Build Order

1. **Epic 1** — Foundation (can't build anything without auth/roles)
2. **Epic 2** — Request Intake (core data model)
3. **Epic 3** — Workflow Engine (brings requests to life)
4. **Epic 4** — Approvals (critical business process)
5. **Epic 5** — Quoting & Booking (vendor collaboration)
6. **Epic 6** — Finance & Polish (close the loop)

Each epic builds on the previous. Aim for a deployable increment after each epic.

---

## 📚 Additional Resources

- [Full ADR Suite](adr/)
- [Epic Specifications](epics/)
- [Domain Model Diagram](mermaid/domain-model-diagram.md)
- [Workflow State Diagram](mermaid/workflow-state-diagram.md)
- [MHFA Brand Colours](branding/brand-colours-mhfa%20copy.md)

---

*Built with 💚 for Glenda, Amanda, and the MHFA Australia team*
