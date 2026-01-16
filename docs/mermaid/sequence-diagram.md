sequenceDiagram
  autonumber
  actor Employee as Employee (Requester)
  participant App as Mission: Possible (Web App)
  participant Ops as Ops Coordinator (Glenda/Amanda)
  participant Policy as Approval Policy Engine
  participant Approver as Approver (Exec Dir / CEO)
  participant Finance as Finance

  Employee->>App: Submit Travel Request + attachments (optional)
  App->>App: Create Request(TRAVEL), TravelDetails
  App->>App: Set status=SUBMITTED
  App->>App: Timeline: "Submitted"
  App-->>Ops: Notify: New request submitted

  Ops->>App: Open Ops Board → start triage
  App->>App: Transition SUBMITTED→TRIAGE (audit)
  App->>App: Timeline: "Triage started"

  alt Missing info
    Ops->>App: Add requester-visible note: "Need more details"
    App->>App: Timeline: "Info requested"
    App-->>Employee: Notify: Action required (provide details)
    Employee->>App: Update details / add note
    App->>App: Timeline: "Requester updated details"
  end

  Ops->>App: Mark triage complete
  App->>Policy: Compute approver + escalation rules
  Policy-->>App: Approver = ExecDir (or CEO if escalated)
  App->>App: Create Approval(PENDING)
  App->>App: Transition TRIAGE→AWAITING_APPROVAL (audit)
  App->>App: Timeline: "Sent for approval"
  App-->>Approver: Notify: Approval required

  Approver->>App: Approve (with optional comment)
  App->>App: Approval=APPROVED (immutable decision)
  App->>App: Transition AWAITING_APPROVAL→APPROVED (audit)
  App->>App: Timeline: "Approved by {Approver}"
  App-->>Ops: Notify: Approved
  App-->>Employee: Notify: Approved

  Ops->>App: Add quote options (supplier, times, price) + QUOTE attachments
  App->>App: Transition APPROVED→QUOTING (audit)
  App->>App: Timeline: "Quote options added"
  App->>App: Transition QUOTING→OPTION_REVIEW (audit)
  App-->>Employee: Notify: Options ready to review

  Employee->>App: Select preferred option / add constraints
  App->>App: Timeline: "Option selected"
  App-->>Ops: Notify: Option selected

  Ops->>App: Confirm booking + upload itinerary (ITINERARY)
  App->>App: Transition OPTION_REVIEW→BOOKED (audit)
  App->>App: Timeline: "Booked"
  App->>App: Transition BOOKED→ITINERARY_SENT (audit)
  App-->>Employee: Notify: Itinerary available

  Ops->>App: Upload invoice (INVOICE) w/ metadata
  App->>App: Transition ITINERARY_SENT→INVOICED (audit)
  App-->>Finance: Notify: Invoice ready for reconciliation

  Finance->>App: Reconcile (add GL/payment ref)
  App->>App: Transition INVOICED→RECONCILED (audit)
  App->>App: Timeline: "Reconciled by Finance"

  Finance->>App: Close request
  App->>App: Transition RECONCILED→CLOSED (audit)
  App->>App: Timeline: "Closed"
  App-->>Employee: Notify: Closed
  App-->>Ops: Notify: Closed
