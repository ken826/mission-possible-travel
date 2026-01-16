# Epic E2 — Request Intake: Travel + Catering Submission

Goal: Employees can submit requests that create the correct domain records and enter the workflow.

## Scope

- Data model: Request + TravelDetails + CateringDetails
- Submission forms:
    - Travel: dates, destination(s), purpose, estimated cost, travellers, preferences, notes, attachments
    - Catering: event details, attendee count, dietary, timing, notes
- Validation + drafts optional (nice-to-have, not required)
- Upon submit:
    - Create core Request, type extension record
    - Set initial status = SUBMITTED
    - Create timeline event “Submitted”
    - Notify Ops Coordinators

## Acceptance Criteria

- Travel and catering requests can be created end-to-end
- Requests appear immediately in “My Requests” and Ops board
- Timeline shows submission event and initial status