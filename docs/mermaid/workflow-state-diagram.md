stateDiagram-v2
  [*] --> SUBMITTED

  SUBMITTED --> TRIAGE: Ops begins triage
  TRIAGE --> SUBMITTED: Requester updates info (if missing)
  TRIAGE --> AWAITING_APPROVAL: Triage complete

  AWAITING_APPROVAL --> APPROVED: Approver approves
  AWAITING_APPROVAL --> REJECTED: Approver rejects
  REJECTED --> [*]

  APPROVED --> QUOTING: Ops requests quotes
  QUOTING --> OPTION_REVIEW: Options ready for requester
  OPTION_REVIEW --> QUOTING: Requester asks for changes
  OPTION_REVIEW --> BOOKED: Ops confirms booking

  BOOKED --> ITINERARY_SENT: Itinerary uploaded/sent
  ITINERARY_SENT --> INVOICED: Invoice received/uploaded

  INVOICED --> RECONCILED: Finance reconciles
  RECONCILED --> CLOSED: Ops/Finance closes

  SUBMITTED --> CANCELLED: Requester cancels
  TRIAGE --> CANCELLED: Ops cancels
  AWAITING_APPROVAL --> CANCELLED: Ops cancels
  APPROVED --> CANCELLED: Ops cancels
  QUOTING --> CANCELLED: Ops cancels
  OPTION_REVIEW --> CANCELLED: Ops cancels
  BOOKED --> CANCELLED: Ops cancels (may require vendor action)
  ITINERARY_SENT --> CANCELLED: Ops cancels (post-booking)

  CANCELLED --> [*]
  CLOSED --> [*]
