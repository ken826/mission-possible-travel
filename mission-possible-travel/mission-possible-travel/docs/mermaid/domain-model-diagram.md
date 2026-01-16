erDiagram
  USER {
    string id
    string name
    string email
    string role
    boolean isActive
    datetime createdAt
    datetime updatedAt
  }

  REQUEST {
    string id
    string requestType  "TRAVEL|CATERING"
    string status
    string costCentre
    string directorate
    string businessPurpose
    string currentOwnerRole
    string requesterId
    datetime createdAt
    datetime updatedAt
    datetime closedAt
  }

  TRAVEL_DETAILS {
    string requestId
    date startDate
    date endDate
    string origin
    string destination
    int travellerCount
    float estimatedCost
    string travelType "DOMESTIC|INTERNATIONAL"
    string preferences
  }

  CATERING_DETAILS {
    string requestId
    datetime eventStart
    datetime eventEnd
    string location
    int attendeeCount
    float estimatedCost
    string dietaryNotes
    string instructions
  }

  APPROVAL {
    string id
    string requestId
    string approverId
    string status "PENDING|APPROVED|REJECTED"
    string comment
    datetime decidedAt
    datetime createdAt
  }

  DELEGATION {
    string id
    string delegatorId
    string delegateId
    datetime startAt
    datetime endAt
    string reason
    datetime createdAt
  }

  QUOTE_OPTION {
    string id
    string requestId
    string supplier
    string summary
    float amount
    string currency
    string details
    boolean isSelected
    datetime createdAt
  }

  ATTACHMENT {
    string id
    string requestId
    string type "QUOTE|ITINERARY|INVOICE|RECEIPT|OTHER"
    string fileName
    string mimeType
    float amount
    string supplier
    string invoiceNumber
    date dueDate
    datetime createdAt
  }

  TIMELINE_EVENT {
    string id
    string requestId
    string eventType
    string visibility "INTERNAL|REQUESTER|PARTNER"
    string message
    string actorId
    datetime createdAt
  }

  NOTIFICATION {
    string id
    string requestId
    string recipientId
    string channel "EMAIL"
    string type
    datetime sentAt
    datetime createdAt
  }

  AUDIT_LOG {
    string id
    string actorId
    string action
    string entityType
    string entityId
    string metadataJson
    datetime createdAt
  }

  USER ||--o{ REQUEST : "submits"
  REQUEST ||--|| TRAVEL_DETAILS : "has (if travel)"
  REQUEST ||--|| CATERING_DETAILS : "has (if catering)"
  REQUEST ||--o{ APPROVAL : "requires"
  USER ||--o{ APPROVAL : "acts as"
  USER ||--o{ DELEGATION : "delegates"
  REQUEST ||--o{ QUOTE_OPTION : "has"
  REQUEST ||--o{ ATTACHMENT : "has"
  REQUEST ||--o{ TIMELINE_EVENT : "records"
  USER ||--o{ TIMELINE_EVENT : "writes"
  REQUEST ||--o{ NOTIFICATION : "triggers"
  USER ||--o{ NOTIFICATION : "receives"
  USER ||--o{ AUDIT_LOG : "generates"
