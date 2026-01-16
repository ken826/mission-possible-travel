/**
 * Mission: Possible - Role-Based Access Control (RBAC)
 * Centralized permission management for all user roles
 */

// =====================
// ROLE DEFINITIONS
// =====================
const ROLES = {
    EMPLOYEE: 'EMPLOYEE',
    COORDINATOR: 'COORDINATOR',
    APPROVER: 'APPROVER',
    VENDOR: 'VENDOR',
    FINANCE: 'FINANCE'
};

// Role display names
const ROLE_LABELS = {
    EMPLOYEE: 'Employee',
    COORDINATOR: 'Ops Coordinator',
    APPROVER: 'Approver',
    VENDOR: 'External Vendor',
    FINANCE: 'Finance'
};

// =====================
// PERMISSIONS MATRIX
// =====================
const PERMISSIONS = {
    // Request permissions
    REQUEST_CREATE: 'request:create',
    REQUEST_VIEW_OWN: 'request:view_own',
    REQUEST_VIEW_ALL: 'request:view_all',
    REQUEST_EDIT_OWN: 'request:edit_own',
    REQUEST_EDIT_ALL: 'request:edit_all',
    REQUEST_CANCEL_OWN: 'request:cancel_own',
    REQUEST_CANCEL_ALL: 'request:cancel_all',

    // Workflow permissions
    WORKFLOW_TRIAGE: 'workflow:triage',
    WORKFLOW_APPROVE: 'workflow:approve',
    WORKFLOW_REJECT: 'workflow:reject',
    WORKFLOW_QUOTE: 'workflow:quote',
    WORKFLOW_BOOK: 'workflow:book',

    // Document permissions
    DOCUMENT_UPLOAD: 'document:upload',
    DOCUMENT_VIEW_OWN: 'document:view_own',
    DOCUMENT_VIEW_ALL: 'document:view_all',
    DOCUMENT_VIEW_ASSIGNED: 'document:view_assigned',
    DOCUMENT_DELETE: 'document:delete',
    DOCUMENT_FORWARD_FINANCE: 'document:forward_finance',

    // Admin permissions
    ADMIN_VIEW_AUDIT: 'admin:view_audit',
    ADMIN_MANAGE_USERS: 'admin:manage_users',
    ADMIN_MANAGE_DELEGATION: 'admin:manage_delegation',

    // Finance permissions
    FINANCE_VIEW_INVOICES: 'finance:view_invoices',
    FINANCE_RECONCILE: 'finance:reconcile',
    FINANCE_EXPORT: 'finance:export'
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
    EMPLOYEE: [
        PERMISSIONS.REQUEST_CREATE,
        PERMISSIONS.REQUEST_VIEW_OWN,
        PERMISSIONS.REQUEST_EDIT_OWN,
        PERMISSIONS.REQUEST_CANCEL_OWN,
        PERMISSIONS.DOCUMENT_VIEW_OWN,
        PERMISSIONS.DOCUMENT_UPLOAD
    ],

    COORDINATOR: [
        // All employee permissions
        PERMISSIONS.REQUEST_CREATE,
        PERMISSIONS.REQUEST_VIEW_OWN,
        PERMISSIONS.REQUEST_EDIT_OWN,
        PERMISSIONS.REQUEST_CANCEL_OWN,
        // Plus coordinator permissions
        PERMISSIONS.REQUEST_VIEW_ALL,
        PERMISSIONS.REQUEST_EDIT_ALL,
        PERMISSIONS.REQUEST_CANCEL_ALL,
        PERMISSIONS.WORKFLOW_TRIAGE,
        PERMISSIONS.WORKFLOW_QUOTE,
        PERMISSIONS.WORKFLOW_BOOK,
        PERMISSIONS.DOCUMENT_VIEW_ALL,
        PERMISSIONS.DOCUMENT_UPLOAD,
        PERMISSIONS.DOCUMENT_DELETE,
        PERMISSIONS.DOCUMENT_FORWARD_FINANCE,
        PERMISSIONS.ADMIN_VIEW_AUDIT,
        PERMISSIONS.ADMIN_MANAGE_DELEGATION,
        PERMISSIONS.FINANCE_VIEW_INVOICES
    ],

    APPROVER: [
        PERMISSIONS.REQUEST_CREATE,
        PERMISSIONS.REQUEST_VIEW_OWN,
        PERMISSIONS.REQUEST_VIEW_ALL,
        PERMISSIONS.WORKFLOW_APPROVE,
        PERMISSIONS.WORKFLOW_REJECT,
        PERMISSIONS.DOCUMENT_VIEW_ALL,
        PERMISSIONS.DOCUMENT_UPLOAD
    ],

    VENDOR: [
        PERMISSIONS.REQUEST_VIEW_ASSIGNED,
        PERMISSIONS.DOCUMENT_VIEW_ASSIGNED,
        PERMISSIONS.DOCUMENT_UPLOAD,
        PERMISSIONS.WORKFLOW_QUOTE
    ],

    FINANCE: [
        PERMISSIONS.REQUEST_VIEW_ALL,
        PERMISSIONS.DOCUMENT_VIEW_ALL,
        PERMISSIONS.FINANCE_VIEW_INVOICES,
        PERMISSIONS.FINANCE_RECONCILE,
        PERMISSIONS.FINANCE_EXPORT,
        PERMISSIONS.ADMIN_VIEW_AUDIT
    ]
};

// =====================
// RBAC FUNCTIONS
// =====================

/**
 * Check if a user has a specific permission
 */
function hasPermission(user, permission) {
    if (!user || !user.role) return false;
    const role = user.role === 'OPS_COORDINATOR' ? 'COORDINATOR' : user.role;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
}

/**
 * Check if user can access a specific request
 */
function canAccessRequest(user, request) {
    if (!user || !request) return false;

    // Coordinators can see everything
    if (hasPermission(user, PERMISSIONS.REQUEST_VIEW_ALL)) return true;

    // Vendors can only see assigned requests
    if (user.role === 'VENDOR') {
        return request.assignedVendor === user.id;
    }

    // Employees can only see their own
    return request.requesterId === user.id || request.requester === user.name;
}

/**
 * Check if user can edit a request
 */
function canEditRequest(user, request) {
    if (!user || !request) return false;

    if (hasPermission(user, PERMISSIONS.REQUEST_EDIT_ALL)) return true;

    if (hasPermission(user, PERMISSIONS.REQUEST_EDIT_OWN)) {
        return (request.requesterId === user.id || request.requester === user.name)
            && ['SUBMITTED', 'TRIAGE'].includes(request.status);
    }

    return false;
}

/**
 * Check if user can upload documents to a request
 */
function canUploadDocument(user, request) {
    if (!user || !request) return false;
    if (!hasPermission(user, PERMISSIONS.DOCUMENT_UPLOAD)) return false;

    // Check request access
    return canAccessRequest(user, request);
}

/**
 * Check if user can view a document
 */
function canViewDocument(user, document, request) {
    if (!user || !document) return false;

    if (hasPermission(user, PERMISSIONS.DOCUMENT_VIEW_ALL)) return true;

    if (hasPermission(user, PERMISSIONS.DOCUMENT_VIEW_ASSIGNED)) {
        return request && request.assignedVendor === user.id;
    }

    if (hasPermission(user, PERMISSIONS.DOCUMENT_VIEW_OWN)) {
        return request && (request.requesterId === user.id || request.requester === user.name);
    }

    return false;
}

/**
 * Get visible menu items for a role
 */
function getMenuVisibility(user) {
    const role = user?.role === 'OPS_COORDINATOR' ? 'COORDINATOR' : user?.role;

    return {
        dashboard: true,
        myRequests: true,
        opsBoard: ['COORDINATOR'].includes(role),
        allRequests: ['COORDINATOR', 'APPROVER', 'FINANCE'].includes(role),
        approvals: ['COORDINATOR', 'APPROVER'].includes(role),
        invoices: ['COORDINATOR', 'FINANCE'].includes(role),
        reports: ['COORDINATOR', 'FINANCE'].includes(role),
        vendorPortal: role === 'VENDOR',
        auditLog: hasPermission(user, PERMISSIONS.ADMIN_VIEW_AUDIT)
    };
}

/**
 * Get allowed actions for a request based on user role and request status
 */
function getAllowedActions(user, request) {
    if (!user || !request) return [];

    const actions = [];
    const role = user.role === 'OPS_COORDINATOR' ? 'COORDINATOR' : user.role;

    switch (request.status) {
        case 'SUBMITTED':
            if (role === 'COORDINATOR') {
                actions.push('triage', 'cancel', 'add_note');
            }
            if (request.requester === user.name) {
                actions.push('cancel', 'edit');
            }
            break;

        case 'TRIAGE':
            if (role === 'COORDINATOR') {
                actions.push('send_for_approval', 'request_info', 'cancel');
            }
            break;

        case 'AWAITING_APPROVAL':
            if (role === 'APPROVER' || role === 'COORDINATOR') {
                actions.push('approve', 'reject', 'add_note');
            }
            break;

        case 'APPROVED':
            if (role === 'COORDINATOR') {
                actions.push('start_quoting', 'add_note');
            }
            break;

        case 'QUOTING':
            if (role === 'COORDINATOR' || role === 'VENDOR') {
                actions.push('add_quote', 'send_options');
            }
            break;

        case 'OPTION_REVIEW':
            if (request.requester === user.name) {
                actions.push('select_option');
            }
            if (role === 'COORDINATOR') {
                actions.push('confirm_booking');
            }
            break;

        case 'BOOKED':
            if (role === 'COORDINATOR') {
                actions.push('upload_itinerary', 'add_note');
            }
            break;

        case 'ITINERARY_SENT':
            if (role === 'COORDINATOR') {
                actions.push('upload_invoice', 'add_note');
            }
            break;

        case 'INVOICED':
            if (role === 'COORDINATOR') {
                actions.push('forward_to_finance');
            }
            if (role === 'FINANCE') {
                actions.push('reconcile');
            }
            break;
    }

    // All roles can upload documents if they have access
    if (canUploadDocument(user, request)) {
        actions.push('upload_document');
    }

    return actions;
}

// Make available globally
window.ROLES = ROLES;
window.ROLE_LABELS = ROLE_LABELS;
window.PERMISSIONS = PERMISSIONS;
window.hasPermission = hasPermission;
window.canAccessRequest = canAccessRequest;
window.canEditRequest = canEditRequest;
window.canUploadDocument = canUploadDocument;
window.canViewDocument = canViewDocument;
window.getMenuVisibility = getMenuVisibility;
window.getAllowedActions = getAllowedActions;
