# Epic E5 — Quoting, Option Review, Booking, Documents

Goal: Replace email-and-attachments handling with structured in-app fulfilment.

## Scope

### Quoting:

- Ops can record one or more quote options (carrier/venue, times, price, notes)
- Attach QUOTE docs
- Transition to QUOTING then OPTION_REVIEW

### Option review:

- Requester selects preferred option (or “no preference”)
- Timeline event “Option Selected”

### Booking:

- Ops marks as booked and uploads itinerary (ITINERARY)
- Transition: OPTION_REVIEW → BOOKED → ITINERARY_SENT

### Invoicing:

- Upload invoice (INVOICE) with metadata fields
- Transition to INVOICED

## Acceptance Criteria

- Quotes, itineraries, and invoices are stored against the request with types
- Requester can express preference without email
- Ops can complete booking and documentation without leaving the app