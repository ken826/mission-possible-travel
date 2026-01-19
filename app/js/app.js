/**
 * Mission: Possible - Main Application
 * Travel & Catering Operations for MHFA Australia
 */

// =====================
// STATE MANAGEMENT
// =====================
const AppState = {
    currentUser: null,
    currentPage: 'dashboard',
    requests: [],
    isAuthenticated: false,
    statusFilter: 'pending'
};

// Demo users for testing
const DEMO_USERS = {
    'glenda@mhfa.com.au': { id: '1', name: 'Glenda', email: 'glenda@mhfa.com.au', role: 'OPS_COORDINATOR', avatar: 'G' },
    'amanda@mhfa.com.au': { id: '2', name: 'Amanda', email: 'amanda@mhfa.com.au', role: 'OPS_COORDINATOR', avatar: 'A' },
    'sarah@mhfa.com.au': { id: '3', name: 'Sarah', email: 'sarah@mhfa.com.au', role: 'EMPLOYEE', avatar: 'S' },
    'director@mhfa.com.au': { id: '4', name: 'David', email: 'director@mhfa.com.au', role: 'APPROVER', avatar: 'D' },
    'mel@fcct.com.au': { id: '5', name: 'Mel', email: 'mel@fcct.com.au', role: 'VENDOR', avatar: 'M', company: 'Flight Centre Corporate Travel' },
    'admin@mhfa.com.au': { id: '6', name: 'Admin', email: 'admin@mhfa.com.au', role: 'ADMIN', avatar: '⚙' }
};

// Unsubscribe function for real-time listener
let unsubscribeRequests = null;

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Show loading state
    AppState.isLoading = true;

    // Initialize requests from Firestore (or fallback to sample data)
    try {
        if (window.RequestService) {
            // Initialize sample data if Firestore is empty
            await window.RequestService.initializeSampleData();

            // Load initial data
            AppState.requests = await window.RequestService.getAll();

            // Subscribe to real-time updates
            unsubscribeRequests = window.RequestService.subscribeToChanges((requests) => {
                AppState.requests = requests;
                // Re-render current page if authenticated
                if (AppState.isAuthenticated) {
                    navigateTo(AppState.currentPage);
                }
            });
        } else {
            // Fallback to sample data if service not available
            console.warn('RequestService not available, using sample data');
            AppState.requests = [
                { id: 'REQ-2026-001', type: 'TRAVEL', status: 'AWAITING_APPROVAL', title: 'Sydney Conference - Feb 2026', requester: 'Sarah', destination: 'Sydney', dates: '10-12 Feb 2026', estimate: 1850, created: '2026-01-14' },
                { id: 'REQ-2026-002', type: 'CATERING', status: 'SUBMITTED', title: 'Team Planning Day Lunch', requester: 'Michael', location: 'MHFA Office', attendees: 25, estimate: 625, created: '2026-01-15' },
                { id: 'REQ-2026-003', type: 'TRAVEL', status: 'QUOTING', title: 'Perth Training Delivery', requester: 'Emma', destination: 'Perth', dates: '20-22 Feb 2026', estimate: 2400, created: '2026-01-12' },
                { id: 'REQ-2026-004', type: 'TRAVEL', status: 'BOOKED', title: 'Brisbane Workshop', requester: 'James', destination: 'Brisbane', dates: '5-6 Feb 2026', estimate: 980, created: '2026-01-08' },
                { id: 'REQ-2026-005', type: 'CATERING', status: 'APPROVED', title: 'Board Meeting Catering', requester: 'Amanda', location: 'Board Room', attendees: 12, estimate: 360, created: '2026-01-13' }
            ];
        }
    } catch (error) {
        console.error('Error initializing requests:', error);
        // Fallback to empty array on error
        AppState.requests = [];
    }

    AppState.isLoading = false;
    setupEventListeners();
    checkAuthState();
}

function setupEventListeners() {
    // Login form
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);

    // Demo user buttons
    document.querySelectorAll('.demo-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.dataset.email;
            document.getElementById('email').value = email;
            document.getElementById('password').value = 'demo123';
        });
    });

    // User menu toggle
    document.getElementById('user-menu-toggle')?.addEventListener('click', toggleUserMenu);

    // User dropdown actions
    document.querySelectorAll('.dropdown-item[data-action]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const action = item.dataset.action;
            if (action === 'logout') handleLogout();
            closeUserMenu();
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) closeUserMenu();
    });

    // Mobile menu toggle
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileMenu);

    // Navigation items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // New request button
    document.getElementById('new-request-btn')?.addEventListener('click', openNewRequestModal);

    // Modal controls
    document.querySelector('.modal-close-btn')?.addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
    document.getElementById('cancel-request-btn')?.addEventListener('click', closeModal);
    document.getElementById('submit-request-btn')?.addEventListener('click', submitRequest);

    // Request type selector
    document.querySelectorAll('.request-type-card').forEach(card => {
        card.addEventListener('click', () => selectRequestType(card.dataset.type));
    });

    // Search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(searchInput.value);
            }
        });
    }

    // Notifications button
    document.getElementById('notifications-btn')?.addEventListener('click', toggleNotifications);

    // Close notifications on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notifications-wrapper')) closeNotifications();
    });
}

// =====================
// AUTHENTICATION
// =====================
function checkAuthState() {
    const savedUser = localStorage.getItem('missionPossibleUser');
    if (savedUser) {
        AppState.currentUser = JSON.parse(savedUser);
        AppState.isAuthenticated = true;
        showMainApp();
    } else {
        showLoginScreen();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // First try UserStore (includes all users created via User Management)
    if (typeof UserStore !== 'undefined') {
        const result = UserStore.authenticate(email, password);
        if (result.success) {
            const user = result.user;
            // Map UserStore roles to app roles for compatibility
            const roleMapping = {
                'COORDINATOR': 'OPS_COORDINATOR',
                'ADMIN': 'ADMIN',
                'APPROVER': 'APPROVER',
                'EMPLOYEE': 'EMPLOYEE',
                'VENDOR': 'VENDOR',
                'FINANCE': 'FINANCE'
            };

            AppState.currentUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: roleMapping[user.role] || user.role,
                avatar: user.name[0].toUpperCase()
            };
            AppState.isAuthenticated = true;
            localStorage.setItem('missionPossibleUser', JSON.stringify(AppState.currentUser));

            // Log login to audit
            if (typeof AuditLog !== 'undefined') {
                AuditLog.log('USER_LOGIN', { userId: user.id, email: user.email });
            }

            showMainApp();
            showToast('success', 'Welcome back!', `Signed in as ${user.name}`);
            return;
        } else if (result.error === 'Account suspended') {
            showToast('error', 'Account Suspended', 'Your account has been suspended. Contact an administrator.');
            return;
        }
    }

    // Fallback to DEMO_USERS for backward compatibility
    const demoUser = DEMO_USERS[email];
    if (demoUser) {
        AppState.currentUser = demoUser;
        AppState.isAuthenticated = true;
        localStorage.setItem('missionPossibleUser', JSON.stringify(demoUser));
        showMainApp();
        showToast('success', 'Welcome back!', `Signed in as ${demoUser.name}`);
    } else {
        showToast('error', 'Login failed', 'Invalid email or password');
    }
}

function handleLogout() {
    // Log logout to audit
    if (typeof AuditLog !== 'undefined') {
        AuditLog.log('USER_LOGOUT', { userId: AppState.currentUser?.id, email: AppState.currentUser?.email });
    }

    cleanupNotifications(); // Clean up notification subscription
    AppState.currentUser = null;
    AppState.isAuthenticated = false;
    localStorage.removeItem('missionPossibleUser');
    showLoginScreen();
    showToast('info', 'Signed out', 'You have been signed out successfully');
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    updateUserDisplay();
    updateMenuVisibility();
    initNotifications(); // Initialize notification subscription
    navigateTo('dashboard');
}

function updateUserDisplay() {
    const user = AppState.currentUser;
    if (!user) return;

    document.getElementById('user-avatar').textContent = user.avatar;
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-role-badge').textContent = formatRole(user.role);
}

function updateMenuVisibility() {
    const role = AppState.currentUser?.role;
    const opsMenu = document.getElementById('ops-menu');
    const approverMenu = document.getElementById('approver-menu');
    const financeMenu = document.getElementById('finance-menu');
    const adminMenu = document.getElementById('admin-menu');

    // Reset all menus
    opsMenu?.classList.add('hidden');
    approverMenu?.classList.add('hidden');
    financeMenu?.classList.add('hidden');
    adminMenu?.classList.add('hidden');

    // Show menus based on role
    if (role === 'ADMIN') {
        // Admin sees everything including Audit Log
        opsMenu?.classList.remove('hidden');
        approverMenu?.classList.remove('hidden');
        financeMenu?.classList.remove('hidden');
        adminMenu?.classList.remove('hidden');
    } else if (role === 'OPS_COORDINATOR') {
        opsMenu?.classList.remove('hidden');
        approverMenu?.classList.remove('hidden');
        financeMenu?.classList.remove('hidden');
        // No admin menu for coordinators - Audit Log is Admin only
    } else if (role === 'APPROVER') {
        approverMenu?.classList.remove('hidden');
    } else if (role === 'FINANCE') {
        financeMenu?.classList.remove('hidden');
    }
    // EMPLOYEE and VENDOR see only main menu
}

// =====================
// NAVIGATION
// =====================
function navigateTo(page) {
    AppState.currentPage = page;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Render page content
    const content = document.getElementById('page-content');
    content.innerHTML = renderPage(page);

    // Close mobile menu
    document.getElementById('side-nav')?.classList.remove('open');
}

function renderPage(page) {
    // Handle request detail pages
    if (page.startsWith('request-')) {
        const requestId = page.replace('request-', '');
        return renderRequestDetail(requestId);
    }

    // Handle invoice detail pages
    if (page.startsWith('invoice-')) {
        const invoiceId = page.replace('invoice-', '');
        return renderInvoiceDetail(invoiceId);
    }

    switch (page) {
        case 'dashboard': return renderDashboard();
        case 'my-requests': return renderMyRequests();
        case 'my-profile': return renderProfilePage();
        case 'all-requests': return renderAllRequests();
        case 'approvals': return renderApprovals();
        case 'invoices': return renderInvoices();
        case 'reports': return renderReportsPage();
        case 'search-results': return renderSearchResults();
        case 'vendor-portal': return renderVendorPortal();
        case 'documents': return renderDocumentsPage();
        case 'audit-log': return renderAuditLogPage();
        case 'user-management': return typeof renderUserManagementPage === 'function' ? renderUserManagementPage() : renderDashboard();
        default: return renderDashboard();
    }
}


// =====================
// PAGE RENDERERS
// =====================
function renderDashboard() {
    const stats = calculateStats();
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Good ${getTimeOfDay()}, ${AppState.currentUser?.name}!</h1>
                <p class="page-subtitle">Here's what's happening with your travel and catering requests.</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewRequestModal()">
                    <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
                    </svg>
                    New Request
                </button>
            </div>
        </div>
        
        <div class="dashboard-grid">
            ${renderStatsCard('primary', 'clipboard', stats.total, 'Total Requests', 'all')}
            ${renderStatsCard('warning', 'clock', stats.pending, 'Awaiting Action', 'pending')}
            ${renderStatsCard('info', 'plane', stats.inProgress, 'In Progress', 'in-progress')}
            ${renderStatsCard('success', 'check', stats.completed, 'Completed', 'completed')}
        </div>
        
        <div class="dashboard-content">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Requests</h3>
                    <a href="#" class="btn btn-ghost btn-sm" onclick="navigateTo('all-requests')">View All</a>
                </div>
                <div class="card-body" style="padding: 0;">
                    ${renderRequestList(AppState.requests.slice(0, 5))}
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Activity</h3>
                </div>
                <div class="card-body">
                    ${renderActivityFeed()}
                </div>
            </div>
        </div>
    `;
}

function renderMyRequests() {
    const myRequests = AppState.requests.filter(r => r.requester === AppState.currentUser?.name);
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">My Requests</h1>
                <p class="page-subtitle">Track and manage your travel and catering requests.</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewRequestModal()">
                    <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
                    </svg>
                    New Request
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-body" style="padding: 0;">
                ${myRequests.length ? renderRequestList(myRequests) : renderEmptyState('No requests yet', 'Submit your first travel or catering request to get started.')}
            </div>
        </div>
    `;
}

function renderOpsBoard() {
    const columns = [
        { status: 'SUBMITTED', title: 'Submitted', requests: AppState.requests.filter(r => r.status === 'SUBMITTED') },
        { status: 'AWAITING_APPROVAL', title: 'Awaiting Approval', requests: AppState.requests.filter(r => r.status === 'AWAITING_APPROVAL') },
        { status: 'QUOTING', title: 'Quoting', requests: AppState.requests.filter(r => r.status === 'QUOTING') },
        { status: 'BOOKED', title: 'Booked', requests: AppState.requests.filter(r => ['BOOKED', 'ITINERARY_SENT'].includes(r.status)) }
    ];

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Ops Board</h1>
                <p class="page-subtitle">Manage all travel and catering requests.</p>
            </div>
        </div>
        
        <div class="ops-board">
            ${columns.map(col => `
                <div class="kanban-column">
                    <div class="kanban-header">
                        <span class="kanban-title">${col.title} <span class="kanban-count">${col.requests.length}</span></span>
                    </div>
                    <div class="kanban-body">
                        ${col.requests.map(req => renderKanbanCard(req)).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAllRequests() {
    // Default to 'pending' (Awaiting Approval) if filter not set
    if (!AppState.statusFilter) {
        AppState.statusFilter = 'pending';
    }
    const filteredRequests = getFilteredRequests();
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">All Requests</h1>
                <p class="page-subtitle">View and manage all travel and catering requests.</p>
            </div>
            <div class="page-actions">
                <div class="filter-group">
                    <label class="filter-label">Status:</label>
                    <select id="status-filter" class="filter-select" onchange="filterByStatus(this.value)">
                        <option value="all" ${AppState.statusFilter === 'all' ? 'selected' : ''}>All Status</option>
                        <option value="pending" ${AppState.statusFilter === 'pending' ? 'selected' : ''}>Awaiting Approval</option>
                        <option value="in-progress" ${AppState.statusFilter === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${AppState.statusFilter === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header" style="border-bottom: 1px solid var(--color-border);">
                <span class="results-count">${filteredRequests.length} request${filteredRequests.length !== 1 ? 's' : ''} found</span>
                ${AppState.statusFilter !== 'all' ? `<button class="btn btn-ghost btn-sm" onclick="clearStatusFilter()">Clear Filter</button>` : ''}
            </div>
            <div class="card-body" style="padding: 0;">
                ${filteredRequests.length ? renderRequestList(filteredRequests) : renderEmptyState('No requests found', 'Try changing your filter or create a new request.')}
            </div>
        </div>
    `;
}

function renderApprovals() {
    const pending = AppState.requests.filter(r => r.status === 'AWAITING_APPROVAL');
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Pending Approvals</h1>
                <p class="page-subtitle">Review and action approval requests.</p>
            </div>
        </div>
        
        <div class="request-list">
            ${pending.length ? pending.map(req => renderApprovalCard(req)).join('') : renderEmptyState('No pending approvals', 'All caught up! Check back later for new approval requests.')}
        </div>
    `;
}

// =====================
// INVOICE PAGE RENDERERS
// =====================
function renderInvoices() {
    const invoices = typeof InvoiceStore !== 'undefined' ? InvoiceStore.getAll() : [];
    const stats = typeof InvoiceStore !== 'undefined' ? InvoiceStore.getStats() : {};
    const filter = AppState.invoiceFilter || 'all';

    const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter.toUpperCase());

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Invoices</h1>
                <p class="page-subtitle">Manage invoices for travel and catering bookings.</p>
            </div>
            <div class="page-actions">
                <div class="filter-group">
                    <label class="filter-label">Status:</label>
                    <select id="invoice-filter" class="filter-select" onchange="filterInvoices(this.value)">
                        <option value="all" ${filter === 'all' ? 'selected' : ''}>All Invoices</option>
                        <option value="draft" ${filter === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="sent" ${filter === 'sent' ? 'selected' : ''}>Sent</option>
                        <option value="paid" ${filter === 'paid' ? 'selected' : ''}>Paid</option>
                        <option value="overdue" ${filter === 'overdue' ? 'selected' : ''}>Overdue</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- Invoice Stats -->
        <div class="invoice-stats-row">
            <div class="invoice-stat-card">
                <span class="invoice-stat-value">${stats.total || 0}</span>
                <span class="invoice-stat-label">Total Invoices</span>
            </div>
            <div class="invoice-stat-card">
                <span class="invoice-stat-value">$${((stats.totalValue || 0).toFixed(2)).toLocaleString()}</span>
                <span class="invoice-stat-label">Total Value</span>
            </div>
            <div class="invoice-stat-card warning">
                <span class="invoice-stat-value">$${((stats.outstandingValue || 0).toFixed(2)).toLocaleString()}</span>
                <span class="invoice-stat-label">Outstanding</span>
            </div>
            <div class="invoice-stat-card danger">
                <span class="invoice-stat-value">${stats.overdue || 0}</span>
                <span class="invoice-stat-label">Overdue</span>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header" style="border-bottom: 1px solid var(--color-border);">
                <span class="results-count">${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} found</span>
                ${filter !== 'all' ? '<button class="btn btn-ghost btn-sm" onclick="clearInvoiceFilter()">Clear Filter</button>' : ''}
            </div>
            <div class="invoice-list">
                ${filtered.length ? filtered.map(inv => renderInvoiceCard(inv)).join('') :
            renderEmptyState('No invoices found', 'Generate an invoice from a booked request.')}
            </div>
        </div>
    `;
}

function renderInvoiceCard(invoice) {
    const statusClasses = {
        'DRAFT': 'status-badge gray',
        'SENT': 'status-badge info',
        'PAID': 'status-badge success',
        'OVERDUE': 'status-badge danger',
        'CANCELLED': 'status-badge gray'
    };

    return `
        <div class="invoice-card" onclick="viewInvoiceDetail('${invoice.id}')">
            <div class="invoice-card-left">
                <div class="invoice-icon ${invoice.status.toLowerCase()}">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M1 4.25a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0119 4.25v10.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75V4.25zM3.25 5.5a.75.75 0 000 1.5h13.5a.75.75 0 000-1.5H3.25z"/>
                    </svg>
                </div>
                <div class="invoice-info">
                    <div class="invoice-title">${invoice.id}</div>
                    <div class="invoice-subtitle">${invoice.requestTitle}</div>
                    <div class="invoice-meta">
                        <span class="invoice-vendor">${invoice.vendor}</span>
                        <span class="invoice-divider">•</span>
                        <span class="invoice-date">Due: ${formatDate(invoice.dueDate)}</span>
                    </div>
                </div>
            </div>
            <div class="invoice-card-right">
                <div class="invoice-amount">$${invoice.total.toFixed(2)}</div>
                <span class="${statusClasses[invoice.status] || 'status-badge'}">${invoice.status}</span>
                <svg class="invoice-arrow" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
                </svg>
            </div>
        </div>
    `;
}

function renderInvoiceDetail(invoiceId) {
    const invoice = typeof InvoiceStore !== 'undefined' ? InvoiceStore.getById(invoiceId) : null;

    if (!invoice) {
        return `
            <div class="page-header">
                <button class="btn btn-ghost" onclick="navigateTo('invoices')">
                    <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd"/>
                    </svg>
                    Back to Invoices
                </button>
            </div>
            ${renderEmptyState('Invoice not found', 'The invoice you are looking for does not exist.')}
        `;
    }

    const statusClasses = {
        'DRAFT': 'status-badge gray',
        'SENT': 'status-badge info',
        'PAID': 'status-badge success',
        'OVERDUE': 'status-badge danger',
        'CANCELLED': 'status-badge gray'
    };

    return `
        <div class="page-header">
            <div class="page-header-content">
                <button class="btn btn-ghost btn-sm" onclick="navigateTo('invoices')" style="margin-bottom: var(--space-2);">
                    <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd"/>
                    </svg>
                    Back to Invoices
                </button>
                <h1 class="page-title">${invoice.id}</h1>
                <p class="page-subtitle">${invoice.requestTitle}</p>
            </div>
            <div class="page-actions">
                <span class="${statusClasses[invoice.status]} status-lg">${invoice.status}</span>
            </div>
        </div>
        
        <div class="invoice-detail-grid">
            <!-- Invoice Info -->
            <div class="card invoice-main">
                <div class="card-header">
                    <h3 class="card-title">Invoice Details</h3>
                </div>
                <div class="card-body">
                    <div class="invoice-header-info">
                        <div class="invoice-header-row">
                            <div class="invoice-header-item">
                                <span class="label">Invoice Number</span>
                                <span class="value">${invoice.id}</span>
                            </div>
                            <div class="invoice-header-item">
                                <span class="label">Issue Date</span>
                                <span class="value">${formatDate(invoice.issueDate)}</span>
                            </div>
                            <div class="invoice-header-item">
                                <span class="label">Due Date</span>
                                <span class="value ${invoice.status === 'OVERDUE' ? 'text-danger' : ''}">${formatDate(invoice.dueDate)}</span>
                            </div>
                        </div>
                        <div class="invoice-header-row">
                            <div class="invoice-header-item">
                                <span class="label">Vendor</span>
                                <span class="value">${invoice.vendor}</span>
                            </div>
                            <div class="invoice-header-item">
                                <span class="label">Vendor Email</span>
                                <span class="value">${invoice.vendorEmail}</span>
                            </div>
                            <div class="invoice-header-item">
                                <span class="label">Related Request</span>
                                <a href="#" onclick="viewRequestDetail('${invoice.requestId}'); return false;" class="value link">${invoice.requestId}</a>
                            </div>
                        </div>
                    </div>
                    
                    <h4 class="section-title">Line Items</h4>
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Unit Price</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.lineItems.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                                    <td class="text-right">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="subtotal-row">
                                <td colspan="3" class="text-right">Subtotal</td>
                                <td class="text-right">$${invoice.subtotal.toFixed(2)}</td>
                            </tr>
                            <tr class="gst-row">
                                <td colspan="3" class="text-right">GST (10%)</td>
                                <td class="text-right">$${invoice.gst.toFixed(2)}</td>
                            </tr>
                            <tr class="total-row">
                                <td colspan="3" class="text-right"><strong>Total</strong></td>
                                <td class="text-right"><strong>$${invoice.total.toFixed(2)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    ${invoice.notes ? `
                        <h4 class="section-title">Notes</h4>
                        <p class="invoice-notes">${invoice.notes}</p>
                    ` : ''}
                </div>
            </div>
            
            <!-- Actions Sidebar -->
            <div class="card invoice-actions">
                <div class="card-header">
                    <h3 class="card-title">Actions</h3>
                </div>
                <div class="card-body">
                    <div class="action-buttons">
                        ${invoice.status === 'DRAFT' ? `
                            <button class="btn btn-primary btn-full" onclick="sendInvoice('${invoice.id}')">
                                <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/>
                                </svg>
                                Send Invoice
                            </button>
                        ` : ''}
                        ${invoice.status === 'SENT' || invoice.status === 'OVERDUE' ? `
                            <button class="btn btn-success btn-full" onclick="markInvoicePaid('${invoice.id}')">
                                <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
                                </svg>
                                Mark as Paid
                            </button>
                            <button class="btn btn-secondary btn-full" onclick="sendReminder('${invoice.id}')">
                                <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z"/>
                                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z"/>
                                </svg>
                                Send Reminder
                            </button>
                        ` : ''}
                        <button class="btn btn-ghost btn-full" onclick="printInvoice('${invoice.id}')">
                            <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0118 8.653v4.097A2.25 2.25 0 0115.75 15h-.241l.305 1.984A1.75 1.75 0 0114.084 19H5.915a1.75 1.75 0 01-1.73-2.016L4.492 15H4.25A2.25 2.25 0 012 12.75V8.653c0-1.082.775-2.034 1.874-2.198.374-.056.75-.107 1.127-.153L5 6.302V2.75zm8.5 0v3.232a42.24 42.24 0 00-7 0V2.75a.25.25 0 01.25-.25h6.5a.25.25 0 01.25.25zM6.854 17.5h6.292l-.367-2.5H7.22l-.367 2.5z" clip-rule="evenodd"/>
                            </svg>
                            Print Invoice
                        </button>
                    </div>
                    
                    <div class="invoice-meta-section">
                        <h4 class="meta-title">Invoice Info</h4>
                        <div class="meta-item">
                            <span class="meta-label">Created By</span>
                            <span class="meta-value">${invoice.createdBy}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Created At</span>
                            <span class="meta-value">${formatDate(invoice.createdAt.split('T')[0])}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Invoice action functions
function viewInvoiceDetail(invoiceId) {
    navigateTo(`invoice-${invoiceId}`);
}

function filterInvoices(value) {
    AppState.invoiceFilter = value;
    navigateTo('invoices');
}

function clearInvoiceFilter() {
    AppState.invoiceFilter = 'all';
    navigateTo('invoices');
}

// =====================
// SEARCH FUNCTIONALITY
// =====================
function handleSearch(query) {
    if (!query || query.trim().length < 2) {
        // If query is too short, go back to dashboard or do nothing
        if (AppState.currentPage === 'search-results') {
            navigateTo('dashboard');
        }
        return;
    }

    AppState.searchQuery = query.trim();
    navigateTo('search-results');
}

function renderSearchResults() {
    const query = AppState.searchQuery || '';
    const results = searchRequests(query);

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Search Results</h1>
                <p class="page-subtitle">Results for "${query}"</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-ghost" onclick="clearSearch()">
                    <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                    </svg>
                    Clear Search
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header" style="border-bottom: 1px solid var(--color-border);">
                <span class="results-count">${results.length} result${results.length !== 1 ? 's' : ''} found</span>
            </div>
            <div class="card-body" style="padding: 0;">
                ${results.length ? renderRequestList(results) : renderEmptyState('No results found', 'Try a different search term.')}
            </div>
        </div>
    `;
}

function searchRequests(query) {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    return AppState.requests.filter(req => {
        // Search by title/name
        const titleMatch = req.title?.toLowerCase().includes(lowerQuery);
        // Search by requester name
        const requesterMatch = req.requester?.toLowerCase().includes(lowerQuery);
        // Search by ID
        const idMatch = req.id?.toLowerCase().includes(lowerQuery);
        // Search by destination/location
        const destinationMatch = req.destination?.toLowerCase().includes(lowerQuery);
        const locationMatch = req.location?.toLowerCase().includes(lowerQuery);

        return titleMatch || requesterMatch || idMatch || destinationMatch || locationMatch;
    });
}

function clearSearch() {
    AppState.searchQuery = '';
    // Clear the search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) searchInput.value = '';
    navigateTo('dashboard');
}

function sendInvoice(invoiceId) {
    if (typeof InvoiceStore !== 'undefined') {
        InvoiceStore.updateStatus(invoiceId, 'SENT');
        showToast('success', 'Invoice Sent', 'Invoice has been sent to the vendor.');
        navigateTo(`invoice-${invoiceId}`);
    }
}

function markInvoicePaid(invoiceId) {
    if (typeof InvoiceStore !== 'undefined') {
        InvoiceStore.updateStatus(invoiceId, 'PAID');
        showToast('success', 'Invoice Paid', 'Invoice has been marked as paid.');
        navigateTo(`invoice-${invoiceId}`);
    }
}

function sendReminder(invoiceId) {
    showToast('success', 'Reminder Sent', 'Payment reminder has been sent to the vendor.');
}

function printInvoice(invoiceId) {
    window.print();
}

function generateInvoiceFromRequest(requestId) {
    const request = AppState.requests.find(r => r.id === requestId);
    if (request && typeof InvoiceStore !== 'undefined') {
        const invoice = InvoiceStore.generateFromRequest(request);
        showToast('success', 'Invoice Generated', `Invoice ${invoice.id} has been created.`);
        navigateTo(`invoice-${invoice.id}`);
    }
}

// =====================
// COMPONENT RENDERERS
// =====================
function renderStatsCard(variant, icon, value, label, filterValue) {
    const icons = {
        clipboard: '<path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z"/>',
        clock: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"/>',
        plane: '<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>',
        check: '<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"/>'
    };
    return `
        <div class="stats-card stats-card-clickable" onclick="navigateToFilteredRequests('${filterValue}')" title="Click to view ${label}">
            <div class="stats-icon ${variant}">
                <svg viewBox="0 0 20 20" fill="currentColor">${icons[icon]}</svg>
            </div>
            <div class="stats-content">
                <div class="stats-value">${value}</div>
                <div class="stats-label">${label}</div>
            </div>
        </div>
    `;
}

function renderRequestList(requests) {
    if (!requests.length) return renderEmptyState('No requests', 'No requests to display.');
    return `<div class="request-list" style="padding: var(--space-4);">${requests.map(renderRequestCard).join('')}</div>`;
}

function renderRequestCard(req) {
    const typeIcon = req.type === 'TRAVEL'
        ? '<path d="M21 16v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><path d="M3 8l2.5-4h13L21 8"/>'
        : '<path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>';

    return `
        <div class="request-card" onclick="viewRequestDetail('${req.id}')">
            <div class="request-type-icon ${req.type.toLowerCase()}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${typeIcon}</svg>
            </div>
            <div class="request-info">
                <div class="request-title">${req.title} <span class="request-id">${req.id}</span></div>
                <div class="request-meta">
                    <span class="request-meta-item">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/></svg>
                        ${req.requester}
                    </span>
                    <span class="request-meta-item">$${req.estimate.toLocaleString()}</span>
                </div>
            </div>
            <div class="request-status">
                <span class="status-chip status-${req.status.toLowerCase().replace('_', '-')}">${formatStatus(req.status)}</span>
            </div>
            <svg class="request-arrow" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"/></svg>
        </div>
    `;
}

function renderKanbanCard(req) {
    const typeIcon = req.type === 'TRAVEL'
        ? '<path d="M21 16v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/>'
        : '<path d="M18 8h1a4 4 0 010 8h-1"/>';
    return `
        <div class="kanban-card" onclick="showToast('info', 'Coming soon', 'Request detail view is being built')">
            <div class="kanban-card-header">
                <div class="kanban-card-type ${req.type.toLowerCase()}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${typeIcon}</svg>
                </div>
                <span class="kanban-card-id">${req.id}</span>
            </div>
            <div class="kanban-card-title">${req.title}</div>
            <div class="kanban-card-footer">
                <div class="avatar kanban-card-avatar">${req.requester[0]}</div>
                <span class="kanban-card-time">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"/></svg>
                    ${formatDate(req.created)}
                </span>
            </div>
        </div>
    `;
}

function renderApprovalCard(req) {
    const typeIcon = req.type === 'TRAVEL'
        ? '<path d="M21 16v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><path d="M3 8l2.5-4h13L21 8"/>'
        : '<path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>';
    return `
        <div class="approval-card">
            <div class="approval-card-content">
                <div class="request-type-icon ${req.type.toLowerCase()}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${typeIcon}</svg>
                </div>
                <div class="approval-card-info">
                    <div class="approval-card-title">${req.title}</div>
                    <div class="approval-card-meta">
                        <span>Requested by ${req.requester}</span>
                        <span>${req.id}</span>
                    </div>
                </div>
                <div class="approval-card-amount">$${req.estimate.toLocaleString()}</div>
            </div>
            <div class="approval-card-actions">
                <button class="btn btn-secondary" onclick="handleReject('${req.id}')">Reject</button>
                <button class="btn btn-success" onclick="handleApprove('${req.id}')">Approve</button>
            </div>
        </div>
    `;
}

function renderActivityFeed() {
    const activities = [
        { text: '<strong>Sarah</strong> submitted a new travel request', time: '10 minutes ago' },
        { text: '<strong>David</strong> approved REQ-2026-003', time: '1 hour ago' },
        { text: '<strong>Glenda</strong> uploaded quotes for REQ-2026-004', time: '2 hours ago' },
        { text: '<strong>Emma</strong> selected preferred flight option', time: '3 hours ago' }
    ];
    return `<div class="activity-feed">${activities.map(a => `
        <div class="activity-item">
            <div class="activity-indicator"><div class="activity-dot"></div></div>
            <div class="activity-content">
                <p class="activity-text">${a.text}</p>
                <span class="activity-time">${a.time}</span>
            </div>
        </div>
    `).join('')}</div>`;
}

function renderEmptyState(title, desc) {
    return `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
            <h3 class="empty-state-title">${title}</h3>
            <p class="empty-state-desc">${desc}</p>
        </div>
    `;
}

// =====================
// MODAL HANDLERS
// =====================
function openNewRequestModal() {
    document.getElementById('new-request-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('new-request-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function selectRequestType(type) {
    document.querySelectorAll('.request-type-card').forEach(c => c.classList.remove('active'));
    document.querySelector(`.request-type-card[data-type="${type}"]`).classList.add('active');
    document.getElementById('travel-form').classList.toggle('hidden', type !== 'travel');
    document.getElementById('catering-form').classList.toggle('hidden', type !== 'catering');
}

async function submitRequest() {
    const activeType = document.querySelector('.request-type-card.active')?.dataset.type || 'travel';

    // Build request data based on type
    const requestData = {
        type: activeType.toUpperCase(),
        requester: AppState.currentUser?.name || 'Unknown',
        requesterEmail: AppState.currentUser?.email || '',
    };

    if (activeType === 'travel') {
        requestData.title = `${document.getElementById('travel-destination')?.value || 'Trip'} - ${document.getElementById('travel-start')?.value || 'TBD'}`;
        requestData.origin = document.getElementById('travel-origin')?.value || '';
        requestData.destination = document.getElementById('travel-destination')?.value || '';
        requestData.dates = `${document.getElementById('travel-start')?.value} - ${document.getElementById('travel-end')?.value}`;
        requestData.travellers = parseInt(document.getElementById('travel-travellers')?.value) || 1;
        requestData.estimate = parseFloat(document.getElementById('travel-estimate')?.value) || 0;
        requestData.purpose = document.getElementById('travel-purpose')?.value || '';
        requestData.costCentre = document.getElementById('travel-costcentre')?.value || '';
        requestData.directorate = document.getElementById('travel-directorate')?.value || '';
        requestData.preferences = document.getElementById('travel-preferences')?.value || '';
        requestData.notes = document.getElementById('travel-notes')?.value || '';
    } else {
        requestData.title = document.getElementById('catering-event')?.value || 'Catering Request';
        requestData.eventDate = document.getElementById('catering-date')?.value || '';
        requestData.eventTime = document.getElementById('catering-time')?.value || '';
        requestData.location = document.getElementById('catering-location')?.value || '';
        requestData.attendees = parseInt(document.getElementById('catering-attendees')?.value) || 10;
        requestData.estimate = parseFloat(document.getElementById('catering-estimate')?.value) || 0;
        requestData.costCentre = document.getElementById('catering-costcentre')?.value || '';
        requestData.dietary = document.getElementById('catering-dietary')?.value || '';
        requestData.instructions = document.getElementById('catering-instructions')?.value || '';
        // Get selected meal types
        const mealTypes = [];
        document.querySelectorAll('input[name="meal-type"]:checked').forEach(cb => {
            mealTypes.push(cb.value);
        });
        requestData.mealTypes = mealTypes;
    }

    try {
        let newRequest;
        if (window.RequestService) {
            // Save to Firestore
            newRequest = await window.RequestService.create(requestData);
        } else {
            // Fallback: add to local state only
            newRequest = {
                ...requestData,
                id: `REQ-2026-${String(AppState.requests.length + 1).padStart(3, '0')}`,
                status: 'SUBMITTED',
                created: new Date().toISOString()
            };
            AppState.requests.unshift(newRequest);
        }

        // Notify coordinators about new request
        if (window.NotificationService && window.UserStore) {
            const coordinators = window.UserStore.getAll().filter(u =>
                u.role === 'COORDINATOR' && u.status === 'active'
            );
            const coordinatorEmails = coordinators.map(c => c.email);
            await window.NotificationService.helpers.requestSubmitted(newRequest, coordinatorEmails);
        }

        // Log to audit
        if (typeof AuditLog !== 'undefined') {
            AuditLog.log('REQUEST_CREATED', {
                requestId: newRequest.id,
                type: newRequest.type,
                title: newRequest.title,
                requester: newRequest.requester
            });
        }

        closeModal();
        // Reset form
        document.getElementById('travel-form')?.reset();
        document.getElementById('catering-form')?.reset();

        navigateTo(AppState.currentPage);
        showToast('success', 'Request submitted!', `${newRequest.id} has been created and sent for processing.`);
    } catch (error) {
        console.error('Error submitting request:', error);
        showToast('error', 'Submission failed', 'Unable to submit request. Please try again.');
    }
}

// =====================
// UI HELPERS
// =====================
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    const toggle = document.getElementById('user-menu-toggle');
    const isOpen = !dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', !isOpen);
}

function closeUserMenu() {
    document.getElementById('user-dropdown')?.classList.add('hidden');
    document.getElementById('user-menu-toggle')?.setAttribute('aria-expanded', 'false');
}

function toggleMobileMenu() {
    document.getElementById('side-nav')?.classList.toggle('open');
}

async function handleApprove(id) {
    const req = AppState.requests.find(r => r.id === id);
    if (req) {
        try {
            if (window.RequestService) {
                await window.RequestService.update(id, { status: 'APPROVED' });
            } else {
                req.status = 'APPROVED';
            }

            // Notify requester about approval
            if (window.NotificationService && req.requesterEmail) {
                await window.NotificationService.helpers.requestApproved(
                    req,
                    req.requesterEmail,
                    AppState.currentUser?.name || 'Approver'
                );
            }

            // Log to audit
            if (typeof AuditLog !== 'undefined') {
                AuditLog.log('REQUEST_APPROVED', {
                    requestId: id,
                    approver: AppState.currentUser?.name,
                    requester: req.requester
                });
            }

            navigateTo(AppState.currentPage);
            showToast('success', 'Request approved', `${id} has been approved and sent to Ops for processing.`);
        } catch (error) {
            console.error('Error approving request:', error);
            showToast('error', 'Approval failed', 'Unable to approve request. Please try again.');
        }
    }
}

async function handleReject(id) {
    const req = AppState.requests.find(r => r.id === id);
    if (req) {
        try {
            if (window.RequestService) {
                await window.RequestService.update(id, { status: 'REJECTED' });
            } else {
                req.status = 'REJECTED';
            }

            // Notify requester about rejection
            if (window.NotificationService && req.requesterEmail) {
                await window.NotificationService.helpers.requestRejected(
                    req,
                    req.requesterEmail,
                    AppState.currentUser?.name || 'Approver',
                    '' // No reason provided in this flow
                );
            }

            // Log to audit
            if (typeof AuditLog !== 'undefined') {
                AuditLog.log('REQUEST_REJECTED', {
                    requestId: id,
                    rejectedBy: AppState.currentUser?.name,
                    requester: req.requester
                });
            }

            navigateTo(AppState.currentPage);
            showToast('info', 'Request rejected', `${id} has been rejected.`);
        } catch (error) {
            console.error('Error rejecting request:', error);
            showToast('error', 'Rejection failed', 'Unable to reject request. Please try again.');
        }
    }
}

// =====================
// TOAST NOTIFICATIONS
// =====================
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const icons = {
        success: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/>',
        error: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"/>',
        warning: '<path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"/>',
        info: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"/>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor">${icons[type]}</svg>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
        </button>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 200); }, 5000);
}

// =====================
// UTILITY FUNCTIONS
// =====================
function calculateStats() {
    const requests = AppState.requests;
    return {
        total: requests.length,
        pending: requests.filter(r => ['SUBMITTED', 'TRIAGE', 'AWAITING_APPROVAL'].includes(r.status)).length,
        inProgress: requests.filter(r => ['APPROVED', 'QUOTING', 'OPTION_REVIEW', 'BOOKED', 'ITINERARY_SENT'].includes(r.status)).length,
        completed: requests.filter(r => ['INVOICED', 'RECONCILED', 'CLOSED'].includes(r.status)).length
    };
}

// Filter functions for request status
function getFilteredRequests() {
    const filter = AppState.statusFilter;
    if (filter === 'all') return AppState.requests;

    if (filter === 'pending') {
        return AppState.requests.filter(r => ['SUBMITTED', 'TRIAGE', 'AWAITING_APPROVAL'].includes(r.status));
    }
    if (filter === 'in-progress') {
        return AppState.requests.filter(r => ['APPROVED', 'QUOTING', 'OPTION_REVIEW', 'BOOKED', 'ITINERARY_SENT'].includes(r.status));
    }
    if (filter === 'completed') {
        return AppState.requests.filter(r => ['INVOICED', 'RECONCILED', 'CLOSED'].includes(r.status));
    }
    return AppState.requests;
}

function navigateToFilteredRequests(filterValue) {
    AppState.statusFilter = filterValue;
    navigateTo('all-requests');
}

function filterByStatus(value) {
    AppState.statusFilter = value;
    navigateTo('all-requests');
}

function clearStatusFilter() {
    AppState.statusFilter = 'all';
    navigateTo('all-requests');
}

function formatStatus(status) {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatRole(role) {
    const roles = { 'OPS_COORDINATOR': 'Ops Coordinator', 'EMPLOYEE': 'Employee', 'APPROVER': 'Approver', 'FINANCE': 'Finance' };
    return roles[role] || role;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

// =====================
// REQUEST DETAIL VIEW
// =====================
function renderRequestDetail(requestId) {
    const req = AppState.requests.find(r => r.id === requestId);
    if (!req) return renderEmptyState('Request not found', 'The requested item could not be found.');

    const documents = typeof DocumentStore !== 'undefined' ? DocumentStore.getByRequestId(requestId) : [];
    const canUpload = typeof canUploadDocument !== 'undefined' ? canUploadDocument(AppState.currentUser, req) : true;
    const actions = typeof getAllowedActions !== 'undefined' ? getAllowedActions(AppState.currentUser, req) : [];
    const showForward = actions.includes('forward_to_finance');
    const timeline = getRequestTimeline(req);
    const notes = req.notes || [];

    const typeIcon = req.type === 'TRAVEL'
        ? '<path d="M21 16v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><path d="M3 8l2.5-4h13L21 8"/>'
        : '<path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>';

    return `
        <div class="page-header">
            <div class="page-header-content">
                <a href="#" onclick="navigateTo('all-requests'); return false;" class="btn btn-ghost btn-sm" style="margin-bottom: var(--space-2);">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" /></svg>
                    Back to Requests
                </a>
                <div class="request-detail-header">
                    <div class="request-type-icon ${req.type.toLowerCase()}" style="width: 64px; height: 64px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px;">${typeIcon}</svg>
                    </div>
                    <div class="request-detail-title">
                        <h1 class="page-title">${req.title}</h1>
                        <div class="request-detail-meta">
                            <span class="request-id-badge">${req.id}</span>
                            <span class="status-chip status-${req.status.toLowerCase().replace('_', '-')}">${formatStatus(req.status)}</span>
                            <span class="request-type-badge ${req.type.toLowerCase()}">${req.type}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="request-detail-layout">
            <!-- Main Content Column -->
            <div class="request-detail-main">
                <!-- Tabs -->
                <div class="detail-tabs">
                    <button class="tab-btn active" onclick="showDetailTab('details')">Details</button>
                    <button class="tab-btn" onclick="showDetailTab('timeline')">Timeline</button>
                    <button class="tab-btn" onclick="showDetailTab('documents')">Documents <span class="tab-badge">${documents.length}</span></button>
                    <button class="tab-btn" onclick="showDetailTab('invoices')">Invoices <span class="tab-badge">${typeof InvoiceStore !== 'undefined' ? InvoiceStore.getByRequestId(requestId).length : 0}</span></button>
                    <button class="tab-btn" onclick="showDetailTab('notes')">Notes <span class="tab-badge">${notes.length}</span></button>
                </div>
                
                <!-- Details Tab -->
                <div id="tab-details" class="tab-content active">
                    ${renderDetailsTab(req)}
                </div>
                
                <!-- Timeline Tab -->
                <div id="tab-timeline" class="tab-content">
                    ${renderTimelineTab(timeline)}
                </div>
                
                <!-- Documents Tab -->
                <div id="tab-documents" class="tab-content">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Attached Documents</h3>
                            <span style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${documents.length} file${documents.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="card-body">
                            ${typeof renderDocumentList !== 'undefined' ? renderDocumentList(documents, { showForward }) : '<p>Loading...</p>'}
                            ${canUpload ? (typeof renderDocumentUploadPanel !== 'undefined' ? renderDocumentUploadPanel(requestId) : '') : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Invoices Tab -->
                <div id="tab-invoices" class="tab-content">
                    ${renderInvoicesTab(requestId, req)}
                </div>
                
                <!-- Notes Tab -->
                <div id="tab-notes" class="tab-content">
                    ${renderNotesTab(req, notes)}
                </div>
            </div>
            
            <!-- Sidebar -->
            <div class="request-detail-sidebar">
                <!-- Actions Card -->
                ${renderActionsCard(req, actions)}
                
                <!-- Request Info Panel -->
                <div class="info-panel">
                    <div class="info-panel-header">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"/></svg>
                        <span>Request Info</span>
                    </div>
                    <div class="info-panel-body">
                        <div class="info-row">
                            <span class="info-label">Created</span>
                            <span class="info-value">${formatFullDate(req.created)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Requester</span>
                            <span class="info-value">${req.requester}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Type</span>
                            <span class="info-value">${req.type}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status</span>
                            <span class="info-value">${formatStatus(req.status)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Estimate</span>
                            <span class="info-value info-value-highlight">$${req.estimate.toLocaleString()}</span>
                        </div>
                        ${req.assignedVendor ? `
                        <div class="info-row">
                            <span class="info-label">Vendor</span>
                            <span class="info-value">FCCT</span>
                        </div>
                        ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Render the details tab content
function renderDetailsTab(req) {
    if (req.type === 'TRAVEL') {
        return `
            <div class="detail-section">
                <h3 class="detail-section-title">Trip Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Departing From</div>
                        <div class="detail-value">${req.departingFrom || 'Melbourne'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Destination</div>
                        <div class="detail-value">${req.destination || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Departure Date</div>
                        <div class="detail-value">${req.dates ? req.dates.split('-')[0].trim() : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Return Date</div>
                        <div class="detail-value">${req.dates ? req.dates.split('-')[1]?.trim() || 'N/A' : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Travellers</div>
                        <div class="detail-value">${req.travellers || 1} person(s)</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Estimated Cost</div>
                        <div class="detail-value detail-value-highlight">$${req.estimate.toLocaleString()}</div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3 class="detail-section-title">Traveller Details</h3>
                <div class="traveller-list">
                    <div class="traveller-card">
                        <div class="traveller-avatar">${req.requester[0]}</div>
                        <div class="traveller-info">
                            <div class="traveller-name">${req.requester}</div>
                            <div class="traveller-email">${req.requester.toLowerCase().replace(' ', '.')}@mhfa.com.au</div>
                        </div>
                        <span class="traveller-badge">Primary</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3 class="detail-section-title">Business Purpose</h3>
                <div class="detail-text">
                    ${req.purpose || 'Attending ' + req.title + ' for professional development and team collaboration.'}
                </div>
            </div>
            
            <div class="detail-section">
                <h3 class="detail-section-title">Special Requirements</h3>
                <div class="detail-text">
                    ${req.requirements || 'No special requirements specified.'}
                </div>
            </div>
        `;
    } else {
        // Catering request
        return `
            <div class="detail-section">
                <h3 class="detail-section-title">Event Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Event Name</div>
                        <div class="detail-value">${req.title}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Location</div>
                        <div class="detail-value">${req.location || 'MHFA Office'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${formatFullDate(req.eventDate || req.created)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time</div>
                        <div class="detail-value">${req.eventTime || '12:00 PM'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Attendees</div>
                        <div class="detail-value">${req.attendees || 10} people</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Estimated Cost</div>
                        <div class="detail-value detail-value-highlight">$${req.estimate.toLocaleString()}</div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3 class="detail-section-title">Menu Requirements</h3>
                <div class="detail-text">
                    ${req.menuRequirements || 'Standard catering package requested.'}
                </div>
            </div>
            
            <div class="detail-section">
                <h3 class="detail-section-title">Dietary Requirements</h3>
                <div class="dietary-tags">
                    ${(req.dietary || ['Vegetarian option', 'Gluten-free option']).map(d => `<span class="dietary-tag">${d}</span>`).join('')}
                </div>
            </div>
        `;
    }
}

// Render the timeline tab
function renderTimelineTab(timeline) {
    return `
        <div class="timeline">
            ${timeline.map((event, index) => `
                <div class="timeline-item ${index === 0 ? 'timeline-item-current' : ''}">
                    <div class="timeline-marker ${event.type}">
                        ${getTimelineIcon(event.type)}
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-title">${event.title}</span>
                            <span class="timeline-time">${event.time}</span>
                        </div>
                        <div class="timeline-description">${event.description}</div>
                        ${event.actor ? `<div class="timeline-actor">by ${event.actor}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render the invoices tab
function renderInvoicesTab(requestId, req) {
    const invoices = typeof InvoiceStore !== 'undefined' ? InvoiceStore.getByRequestId(requestId) : [];
    const canCreateInvoice = ['BOOKED', 'ITINERARY_SENT', 'INVOICED'].includes(req.status);
    const userRole = AppState.currentUser?.role;
    const canManageInvoices = ['COORDINATOR', 'OPS_COORDINATOR', 'ADMIN'].includes(userRole);

    const statusColors = {
        'DRAFT': 'status-triage',
        'SENT': 'status-submitted',
        'PAID': 'status-approved',
        'OVERDUE': 'status-rejected',
        'CANCELLED': 'status-cancelled'
    };

    return `
        <div class="card" style="margin-bottom: var(--space-4);">
            <div class="card-header">
                <h3 class="card-title">Invoices</h3>
                ${canManageInvoices && canCreateInvoice ? `
                    <button class="btn btn-primary btn-sm" onclick="createInvoiceForRequest('${requestId}')">
                        <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>
                        Create Invoice
                    </button>
                ` : ''}
            </div>
            <div class="card-body">
                ${invoices.length === 0 ? `
                    <div class="empty-state" style="padding: var(--space-8) 0;">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <h3 class="empty-state-title">No invoices yet</h3>
                        <p class="empty-state-desc">${canCreateInvoice ? 'Create an invoice once booking is confirmed.' : 'Invoices will appear here once the request is booked.'}</p>
                    </div>
                ` : `
                    <div class="invoice-list">
                        ${invoices.map(inv => `
                            <div class="invoice-item" onclick="viewInvoiceDetail('${inv.id}')">
                                <div class="invoice-item-main">
                                    <div class="invoice-id">${inv.id}</div>
                                    <div class="invoice-vendor">${inv.vendor}</div>
                                </div>
                                <div class="invoice-item-details">
                                    <span class="invoice-dates">
                                        <span style="color: var(--color-text-muted);">Issued:</span> ${inv.issueDate}
                                        <span style="margin: 0 var(--space-2);">•</span>
                                        <span style="color: var(--color-text-muted);">Due:</span> ${inv.dueDate}
                                    </span>
                                </div>
                                <div class="invoice-item-amount">
                                    <span class="invoice-total">$${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span class="status-chip ${statusColors[inv.status] || 'status-triage'}">${inv.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
        
        ${canManageInvoices ? `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Upload Invoice</h3>
            </div>
            <div class="card-body">
                <div class="upload-zone" onclick="document.getElementById('invoice-file-${requestId}').click()">
                    <input type="file" id="invoice-file-${requestId}" accept=".pdf,.jpg,.jpeg,.png" style="display: none;" onchange="handleInvoiceUpload('${requestId}', this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 32px; height: 32px; color: var(--color-text-muted); margin-bottom: var(--space-2);">
                        <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0;">Click to upload invoice (PDF, JPG, PNG)</p>
                </div>
            </div>
        </div>
        ` : ''}
    `;
}

// Create invoice for request
async function createInvoiceForRequest(requestId) {
    const req = AppState.requests.find(r => r.id === requestId);
    if (!req) {
        showToast('error', 'Error', 'Request not found.');
        return;
    }

    if (typeof InvoiceStore !== 'undefined') {
        const newInvoice = InvoiceStore.generateFromRequest(req);
        showToast('success', 'Invoice Created', `${newInvoice.id} has been created as a draft.`);
        navigateTo('request-detail', requestId);
    } else {
        showToast('error', 'Error', 'Invoice system not available.');
    }
}

// Handle invoice file upload
function handleInvoiceUpload(requestId, input) {
    const file = input.files?.[0];
    if (!file) return;

    const req = AppState.requests.find(r => r.id === requestId);
    if (!req) {
        showToast('error', 'Error', 'Request not found.');
        return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showToast('error', 'Invalid File', 'Please upload a PDF, JPG, or PNG file.');
        input.value = '';
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Maximum file size is 10MB.');
        input.value = '';
        return;
    }

    // Create invoice from uploaded file
    if (typeof InvoiceStore !== 'undefined') {
        const newInvoice = InvoiceStore.create({
            requestId: req.id,
            requestTitle: req.title,
            vendor: 'Uploaded Invoice',
            vendorEmail: '',
            lineItems: [
                { id: 1, description: `Invoice for ${req.title}`, quantity: 1, unitPrice: req.estimate || 0 }
            ],
            notes: `Uploaded file: ${file.name}`
        });

        // Store file reference (in production, would upload to storage)
        console.log('Invoice file uploaded:', file.name, 'for invoice:', newInvoice.id);

        showToast('success', 'Invoice Uploaded', `${newInvoice.id} created from uploaded file.`);
        navigateTo('request-detail', requestId);
    } else {
        showToast('error', 'Error', 'Invoice system not available.');
    }

    // Reset input
    input.value = '';
}

// Make upload function available globally
window.handleInvoiceUpload = handleInvoiceUpload;

// View invoice detail modal
function viewInvoiceDetail(invoiceId) {
    if (typeof InvoiceStore === 'undefined') {
        showToast('error', 'Error', 'Invoice system not available.');
        return;
    }

    const invoice = InvoiceStore.getById(invoiceId);
    if (!invoice) {
        showToast('error', 'Error', 'Invoice not found.');
        return;
    }

    const statusColors = {
        'DRAFT': 'status-triage',
        'SENT': 'status-submitted',
        'PAID': 'status-approved',
        'OVERDUE': 'status-rejected',
        'CANCELLED': 'status-cancelled'
    };

    const modalHtml = `
        <div id="invoice-modal" class="modal">
            <div class="modal-backdrop" onclick="closeInvoiceModal()"></div>
            <div class="modal-container">
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <div>
                            <h2 class="modal-title">${invoice.id}</h2>
                            <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0;">${invoice.requestTitle}</p>
                        </div>
                        <button class="modal-close-btn" onclick="closeInvoiceModal()">
                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Invoice Header Info -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-6);">
                            <div>
                                <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Vendor</div>
                                <div style="font-size: var(--font-size-base); font-weight: 600;">${invoice.vendor}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${invoice.vendorEmail}</div>
                            </div>
                            <div style="text-align: right;">
                                <span class="status-chip ${statusColors[invoice.status] || 'status-triage'}">${invoice.status}</span>
                            </div>
                        </div>

                        <!-- Dates -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); padding: var(--space-4); background: var(--color-grey-50); border-radius: var(--radius-md);">
                            <div>
                                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Issue Date</div>
                                <div style="font-size: var(--font-size-sm); font-weight: 500;">${invoice.issueDate}</div>
                            </div>
                            <div>
                                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Due Date</div>
                                <div style="font-size: var(--font-size-sm); font-weight: 500;">${invoice.dueDate}</div>
                            </div>
                            <div>
                                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Created By</div>
                                <div style="font-size: var(--font-size-sm); font-weight: 500;">${invoice.createdBy}</div>
                            </div>
                        </div>

                        <!-- Line Items -->
                        <div style="margin-bottom: var(--space-4);">
                            <h4 style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--space-3);">Line Items</h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 2px solid var(--color-border);">
                                        <th style="text-align: left; padding: var(--space-2); font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Description</th>
                                        <th style="text-align: right; padding: var(--space-2); font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Qty</th>
                                        <th style="text-align: right; padding: var(--space-2); font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Unit Price</th>
                                        <th style="text-align: right; padding: var(--space-2); font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoice.lineItems.map(item => `
                                        <tr style="border-bottom: 1px solid var(--color-border-light);">
                                            <td style="padding: var(--space-3) var(--space-2); font-size: var(--font-size-sm);">${item.description}</td>
                                            <td style="padding: var(--space-3) var(--space-2); font-size: var(--font-size-sm); text-align: right; font-variant-numeric: tabular-nums;">${item.quantity}</td>
                                            <td style="padding: var(--space-3) var(--space-2); font-size: var(--font-size-sm); text-align: right; font-variant-numeric: tabular-nums;">$${item.unitPrice.toFixed(2)}</td>
                                            <td style="padding: var(--space-3) var(--space-2); font-size: var(--font-size-sm); text-align: right; font-weight: 500; font-variant-numeric: tabular-nums;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Totals -->
                        <div style="margin-left: auto; width: 250px; border-top: 2px solid var(--color-border);">
                            <div style="display: flex; justify-content: space-between; padding: var(--space-2) 0; font-size: var(--font-size-sm);">
                                <span style="color: var(--color-text-muted);">Subtotal</span>
                                <span style="font-variant-numeric: tabular-nums;">$${invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--space-2) 0; font-size: var(--font-size-sm);">
                                <span style="color: var(--color-text-muted);">GST (10%)</span>
                                <span style="font-variant-numeric: tabular-nums;">$${invoice.gst.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--space-3) 0; font-size: var(--font-size-lg); font-weight: 700; border-top: 2px solid var(--color-border);">
                                <span>Total</span>
                                <span style="color: var(--color-primary); font-variant-numeric: tabular-nums;">$${invoice.total.toFixed(2)}</span>
                            </div>
                        </div>

                        ${invoice.notes ? `
                            <div style="margin-top: var(--space-4); padding: var(--space-3); background: var(--color-grey-50); border-radius: var(--radius-md); border-left: 3px solid var(--color-primary);">
                                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-1);">Notes</div>
                                <div style="font-size: var(--font-size-sm);">${invoice.notes}</div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        ${invoice.status === 'DRAFT' ? `
                            <button class="btn btn-secondary" onclick="updateInvoiceStatus('${invoice.id}', 'CANCELLED')">Cancel Invoice</button>
                            <button class="btn btn-primary" onclick="updateInvoiceStatus('${invoice.id}', 'SENT')">Mark as Sent</button>
                        ` : invoice.status === 'SENT' ? `
                            <button class="btn btn-secondary" onclick="updateInvoiceStatus('${invoice.id}', 'OVERDUE')">Mark Overdue</button>
                            <button class="btn btn-success" onclick="updateInvoiceStatus('${invoice.id}', 'PAID')">Mark as Paid</button>
                        ` : invoice.status === 'OVERDUE' ? `
                            <button class="btn btn-success" onclick="updateInvoiceStatus('${invoice.id}', 'PAID')">Mark as Paid</button>
                        ` : `
                            <button class="btn btn-secondary" onclick="closeInvoiceModal()">Close</button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    document.getElementById('invoice-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

// Close invoice modal
function closeInvoiceModal() {
    document.getElementById('invoice-modal')?.remove();
    document.body.style.overflow = '';
}

// Update invoice status
function updateInvoiceStatus(invoiceId, newStatus) {
    if (typeof InvoiceStore !== 'undefined') {
        InvoiceStore.updateStatus(invoiceId, newStatus);
        closeInvoiceModal();
        showToast('success', 'Invoice Updated', `Invoice status changed to ${newStatus}`);
        // Refresh current page
        navigateTo(AppState.currentPage, AppState.currentPageParam);
    }
}

// Make invoice functions available globally
window.createInvoiceForRequest = createInvoiceForRequest;
window.viewInvoiceDetail = viewInvoiceDetail;
window.closeInvoiceModal = closeInvoiceModal;
window.updateInvoiceStatus = updateInvoiceStatus;

// Render the notes tab
function renderNotesTab(req, notes) {
    return `
        <div class="card" style="margin-bottom: var(--space-4);">
            <div class="card-header">
                <h3 class="card-title">Add Note</h3>
            </div>
            <div class="card-body">
                <textarea id="new-note-input" class="form-textarea" placeholder="Add a note or comment..." rows="3"></textarea>
                <div style="display: flex; justify-content: flex-end; margin-top: var(--space-3);">
                    <button class="btn btn-primary" onclick="addNote('${req.id}')">Add Note</button>
                </div>
            </div>
        </div>
        
        <div class="notes-list">
            ${notes.length ? notes.map(note => `
                <div class="note-item">
                    <div class="note-header">
                        <div class="note-author">
                            <span class="avatar" style="width: 28px; height: 28px; font-size: 12px;">${note.author[0]}</span>
                            <span class="note-author-name">${note.author}</span>
                        </div>
                        <span class="note-time">${note.time}</span>
                    </div>
                    <div class="note-content">${note.content}</div>
                </div>
            `).join('') : `
                <div class="empty-state" style="padding: var(--space-8);">
                    <svg class="empty-state-icon" style="width: 48px; height: 48px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
                    </svg>
                    <p style="color: var(--color-text-muted);">No notes yet. Add a note to start the conversation.</p>
                </div>
            `}
        </div>
    `;
}

// Render actions card
function renderActionsCard(req, actions) {
    if (!actions.length) return '';

    return `
        <div class="card actions-card">
            <div class="card-header">
                <h3 class="card-title">Actions</h3>
            </div>
            <div class="card-body">
                <div class="action-buttons">
                    ${actions.includes('approve') ? `
                        <button class="btn btn-success btn-full" onclick="handleApprove('${req.id}')">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>
                            Approve Request
                        </button>
                    ` : ''}
                    ${actions.includes('reject') ? `
                        <button class="btn btn-danger btn-full" onclick="handleReject('${req.id}')">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>
                            Reject Request
                        </button>
                    ` : ''}
                    ${actions.includes('start_quoting') ? `
                        <button class="btn btn-primary btn-full" onclick="startQuoting('${req.id}')">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/></svg>
                            Send to FCCT
                        </button>
                    ` : ''}
                    ${actions.includes('add_quote') ? `
                        <button class="btn btn-secondary btn-full" onclick="openQuoteModal('${req.id}')">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.186.158C8.897 9.001 9.418 9.189 10 9.29V7.198a3.573 3.573 0 00-1.67.532z"/></svg>
                            Add Quote Option
                        </button>
                    ` : ''}
                    ${actions.includes('confirm_booking') ? `
                        <button class="btn btn-success btn-full" onclick="confirmBooking('${req.id}')">
                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                            Confirm Booking
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Helper functions
function getRequestTimeline(req) {
    const timeline = [
        { type: 'created', title: 'Request Created', description: `${req.requester} submitted this ${req.type.toLowerCase()} request`, actor: req.requester, time: formatFullDate(req.created) }
    ];

    // Add status-based events
    if (['TRIAGE', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'QUOTING', 'BOOKED', 'INVOICED'].includes(req.status)) {
        timeline.unshift({ type: 'status', title: 'Sent for Approval', description: 'Request sent to approver for review', actor: 'Glenda', time: 'Jan 14, 2026' });
    }
    if (['AWAITING_APPROVAL'].includes(req.status)) {
        timeline.unshift({ type: 'pending', title: 'Awaiting Approval', description: 'Waiting for management approval', time: 'Now' });
    }
    if (['APPROVED', 'QUOTING', 'BOOKED', 'INVOICED'].includes(req.status)) {
        timeline.unshift({ type: 'approved', title: 'Request Approved', description: 'Approved by management', actor: 'David', time: 'Jan 14, 2026' });
    }
    if (['QUOTING'].includes(req.status)) {
        timeline.unshift({ type: 'pending', title: 'Quoting in Progress', description: 'FCCT is preparing quote options', time: 'Now' });
    }
    if (['BOOKED', 'INVOICED'].includes(req.status)) {
        timeline.unshift({ type: 'success', title: 'Booking Confirmed', description: 'Travel has been booked', actor: 'Glenda', time: 'Jan 15, 2026' });
    }

    return timeline;
}

function getTimelineIcon(type) {
    const icons = {
        created: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>',
        status: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd"/></svg>',
        pending: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd"/></svg>',
        approved: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>',
        success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>'
    };
    return icons[type] || icons.status;
}

function formatFullDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showDetailTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Show selected tab
    document.getElementById('tab-' + tabId)?.classList.add('active');
    event.target.classList.add('active');
}

function addNote(requestId) {
    const input = document.getElementById('new-note-input');
    const content = input?.value?.trim();
    if (!content) return;

    const req = AppState.requests.find(r => r.id === requestId);
    if (!req) return;

    req.notes = req.notes || [];
    req.notes.unshift({
        id: Date.now(),
        author: AppState.currentUser?.name || 'Unknown',
        content: content,
        time: 'Just now'
    });

    input.value = '';
    navigateTo('request-' + requestId);
    showToast('success', 'Note added', 'Your note has been added to the request.');

    if (typeof AuditLog !== 'undefined') {
        AuditLog.log('NOTE_ADDED', { requestId, notePreview: content.substring(0, 50) });
    }
}

function viewRequestDetail(requestId) {
    navigateTo('request-' + requestId);
}

// =====================
// VENDOR PORTAL
// =====================
function renderVendorPortal() {
    const user = AppState.currentUser;
    const assignedRequests = AppState.requests.filter(r => r.assignedVendor === user?.id || r.status === 'QUOTING');

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Vendor Portal</h1>
                <p class="page-subtitle">Manage quotes and bookings for MHFA Australia.</p>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Assigned Requests</h3>
                <span style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${assignedRequests.length} request${assignedRequests.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="card-body" style="padding: 0;">
                ${assignedRequests.length ? renderRequestList(assignedRequests) : renderEmptyState('No assigned requests', 'You currently have no requests assigned to you.')}
            </div>
        </div>
    `;
}

// =====================
// DOCUMENTS PAGE
// =====================
function renderDocumentsPage() {
    const allDocs = typeof DocumentStore !== 'undefined' ? DocumentStore.documents : [];
    const invoices = allDocs.filter(d => d.type === 'INVOICE');
    const pending = invoices.filter(d => !d.metadata?.forwardedToFinance);

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Document Management</h1>
                <p class="page-subtitle">View and manage all uploaded documents.</p>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); margin-bottom: var(--space-6);">
            ${renderStatsCard('primary', 'clipboard', allDocs.length, 'Total Documents')}
            ${renderStatsCard('info', 'plane', invoices.length, 'Invoices')}
            ${renderStatsCard('warning', 'clock', pending.length, 'Pending Forward')}
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">All Documents</h3>
            </div>
            <div class="card-body">
                ${typeof renderDocumentList !== 'undefined' ? renderDocumentList(allDocs, { showForward: true }) : '<p>Loading...</p>'}
            </div>
        </div>
    `;
}

// =====================
// REPORTS PAGE
// =====================

const ReportsState = {
    dateRange: '30days', // 7days, 30days, 90days, year, all
    reportType: 'overview' // overview, requests, financial, status
};

function renderReportsPage() {
    // Access control - Coordinators, Finance, Admin only
    const allowedRoles = ['COORDINATOR', 'OPS_COORDINATOR', 'FINANCE', 'ADMIN'];
    if (!allowedRoles.includes(AppState.currentUser?.role)) {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1 class="page-title">Access Denied</h1>
                    <p class="page-subtitle">You do not have permission to view Reports.</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="empty-state" style="padding: var(--space-8);">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                        </svg>
                        <h3 class="empty-state-title">Coordinator/Finance Access Required</h3>
                        <p class="empty-state-desc">Only coordinators, finance, and administrators can view reports.</p>
                    </div>
                </div>
            </div>
        `;
    }

    const reportData = generateReportData();

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Reports & Analytics</h1>
                <p class="page-subtitle">View insights and statistics for travel and catering requests.</p>
            </div>
            <div class="page-actions">
                <select class="form-select" onchange="setReportDateRange(this.value)" style="min-width: 150px;">
                    <option value="7days" ${ReportsState.dateRange === '7days' ? 'selected' : ''}>Last 7 Days</option>
                    <option value="30days" ${ReportsState.dateRange === '30days' ? 'selected' : ''}>Last 30 Days</option>
                    <option value="90days" ${ReportsState.dateRange === '90days' ? 'selected' : ''}>Last 90 Days</option>
                    <option value="year" ${ReportsState.dateRange === 'year' ? 'selected' : ''}>This Year</option>
                    <option value="all" ${ReportsState.dateRange === 'all' ? 'selected' : ''}>All Time</option>
                </select>
                <button class="btn btn-secondary" onclick="exportReport('csv')">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;">
                        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"/>
                        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
                    </svg>
                    Export Report
                </button>
            </div>
        </div>
        
        <!-- Summary Stats -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-6);">
            ${renderStatsCard('primary', 'clipboard', reportData.totalRequests, 'Total Requests')}
            ${renderStatsCard('success', 'check', reportData.completedRequests, 'Completed')}
            ${renderStatsCard('warning', 'clock', reportData.pendingRequests, 'Pending')}
            ${renderStatsCard('info', 'currency', '$' + reportData.totalSpend.toLocaleString(), 'Total Spend')}
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
            <!-- Status Breakdown -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Request Status Breakdown</h3>
                </div>
                <div class="card-body">
                    <div class="status-breakdown">
                        ${Object.entries(reportData.statusBreakdown).map(([status, count]) => `
                            <div class="status-bar-item">
                                <div class="status-bar-label">
                                    <span class="status-chip status-${status.toLowerCase()}">${status}</span>
                                    <span class="status-count">${count}</span>
                                </div>
                                <div class="status-bar-track">
                                    <div class="status-bar-fill" style="width: ${reportData.totalRequests > 0 ? (count / reportData.totalRequests * 100) : 0}%; background: var(--color-${getStatusColor(status)});"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Type Distribution -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Request Types</h3>
                </div>
                <div class="card-body">
                    <div class="type-distribution">
                        ${Object.entries(reportData.typeBreakdown).map(([type, count]) => `
                            <div class="type-item">
                                <div class="type-icon ${type.toLowerCase()}">
                                    ${type === 'TRAVEL' ?
            '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/></svg>' :
            '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.218-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25z"/><path d="M10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z"/><path d="M2 15.312c.425.18.865.334 1.318.458C5.264 16.313 7.586 16.5 10 16.5c2.414 0 4.736-.187 6.682-.73.453-.124.893-.278 1.318-.458v1.438a2.75 2.75 0 01-2.75 2.75h-10.5A2.75 2.75 0 012 16.75v-1.438z"/></svg>'
        }
                                </div>
                                <div class="type-info">
                                    <div class="type-name">${type}</div>
                                    <div class="type-count">${count} requests</div>
                                </div>
                                <div class="type-percentage">${reportData.totalRequests > 0 ? Math.round(count / reportData.totalRequests * 100) : 0}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Financial Summary -->
        <div class="card" style="margin-bottom: var(--space-6);">
            <div class="card-header">
                <h3 class="card-title">Financial Summary</h3>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-6);">
                    <div class="financial-metric">
                        <div class="metric-label">Total Estimated</div>
                        <div class="metric-value">$${reportData.totalEstimate.toLocaleString()}</div>
                    </div>
                    <div class="financial-metric">
                        <div class="metric-label">Total Invoiced</div>
                        <div class="metric-value">$${reportData.totalInvoiced.toLocaleString()}</div>
                    </div>
                    <div class="financial-metric">
                        <div class="metric-label">Total Paid</div>
                        <div class="metric-value" style="color: var(--color-success);">$${reportData.totalPaid.toLocaleString()}</div>
                    </div>
                    <div class="financial-metric">
                        <div class="metric-label">Outstanding</div>
                        <div class="metric-value" style="color: var(--color-amber);">$${reportData.totalOutstanding.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Top Requesters -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6);">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Top Requesters</h3>
                </div>
                <div class="card-body">
                    ${reportData.topRequesters.length === 0 ? '<p style="color: var(--color-text-muted);">No data available</p>' : `
                        <div class="top-list">
                            ${reportData.topRequesters.map((r, i) => `
                                <div class="top-list-item">
                                    <span class="top-rank">${i + 1}</span>
                                    <span class="top-name">${r.name}</span>
                                    <span class="top-value">${r.count} requests</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Activity</h3>
                </div>
                <div class="card-body">
                    ${reportData.recentRequests.length === 0 ? '<p style="color: var(--color-text-muted);">No recent activity</p>' : `
                        <div class="recent-list">
                            ${reportData.recentRequests.map(r => `
                                <div class="recent-item" onclick="navigateTo('request-detail', '${r.id}')">
                                    <div class="recent-info">
                                        <div class="recent-title">${r.title}</div>
                                        <div class="recent-meta">${r.id} • ${r.requester}</div>
                                    </div>
                                    <span class="status-chip status-${r.status.toLowerCase()}">${r.status}</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function generateReportData() {
    const requests = AppState.requests || [];
    const invoices = typeof InvoiceStore !== 'undefined' ? InvoiceStore.getAll() : [];

    // Filter by date range
    const filteredRequests = filterByDateRange(requests, ReportsState.dateRange);
    const filteredInvoices = filterByDateRange(invoices, ReportsState.dateRange, 'issueDate');

    // Status breakdown
    const statusBreakdown = {};
    filteredRequests.forEach(r => {
        statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
    });

    // Type breakdown
    const typeBreakdown = {};
    filteredRequests.forEach(r => {
        typeBreakdown[r.type] = (typeBreakdown[r.type] || 0) + 1;
    });

    // Financial calculations
    const totalEstimate = filteredRequests.reduce((sum, r) => sum + (r.estimate || 0), 0);
    const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const totalPaid = filteredInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (i.total || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    // Top requesters
    const requesterCounts = {};
    filteredRequests.forEach(r => {
        requesterCounts[r.requester] = (requesterCounts[r.requester] || 0) + 1;
    });
    const topRequesters = Object.entries(requesterCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Recent requests
    const recentRequests = [...filteredRequests]
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(0, 5);

    return {
        totalRequests: filteredRequests.length,
        completedRequests: filteredRequests.filter(r => ['COMPLETED', 'INVOICED'].includes(r.status)).length,
        pendingRequests: filteredRequests.filter(r => ['SUBMITTED', 'APPROVED', 'QUOTING', 'BOOKED'].includes(r.status)).length,
        totalSpend: totalPaid,
        statusBreakdown,
        typeBreakdown,
        totalEstimate,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        topRequesters,
        recentRequests
    };
}

function filterByDateRange(items, range, dateField = 'created') {
    const now = new Date();
    let cutoff;

    switch (range) {
        case '7days': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
        case '30days': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
        case '90days': cutoff = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
        case 'year': cutoff = new Date(now.getFullYear(), 0, 1); break;
        default: return items;
    }

    return items.filter(item => new Date(item[dateField]) >= cutoff);
}

function setReportDateRange(range) {
    ReportsState.dateRange = range;
    navigateTo('reports');
}

function exportReport(format) {
    const reportData = generateReportData();
    const dateStr = new Date().toISOString().split('T')[0];

    // Readable date range names
    const rangeLabels = {
        '7days': 'last-7-days',
        '30days': 'last-30-days',
        '90days': 'last-90-days',
        'year': 'this-year',
        'all': 'all-time'
    };
    const rangePart = rangeLabels[ReportsState.dateRange] || ReportsState.dateRange;
    const filename = `mission-possible-report-${dateStr}-${rangePart}`;

    if (format === 'csv') {
        const lines = [
            'Mission Possible Travel - Report',
            `Generated: ${new Date().toLocaleString()}`,
            `Date Range: ${ReportsState.dateRange}`,
            '',
            'Summary',
            `Total Requests,${reportData.totalRequests}`,
            `Completed,${reportData.completedRequests}`,
            `Pending,${reportData.pendingRequests}`,
            `Total Spend,$${reportData.totalSpend}`,
            '',
            'Financial',
            `Total Estimated,$${reportData.totalEstimate}`,
            `Total Invoiced,$${reportData.totalInvoiced}`,
            `Total Paid,$${reportData.totalPaid}`,
            `Outstanding,$${reportData.totalOutstanding}`,
            '',
            'Status Breakdown',
            ...Object.entries(reportData.statusBreakdown).map(([s, c]) => `${s},${c}`),
            '',
            'Type Breakdown',
            ...Object.entries(reportData.typeBreakdown).map(([t, c]) => `${t},${c}`),
            '',
            'Top Requesters',
            ...reportData.topRequesters.map(r => `${r.name},${r.count}`)
        ];

        downloadFile(lines.join('\n'), `${filename}.csv`, 'text/csv');
    } else {
        downloadFile(JSON.stringify(reportData, null, 2), `${filename}.json`, 'application/json');
    }

    showToast('success', 'Report Exported', `Report downloaded as ${format.toUpperCase()}`);
}

function getStatusColor(status) {
    const colors = {
        'SUBMITTED': 'blue',
        'APPROVED': 'success',
        'REJECTED': 'error',
        'QUOTING': 'amber',
        'BOOKED': 'primary',
        'COMPLETED': 'success',
        'INVOICED': 'primary',
        'CANCELLED': 'grey'
    };
    return colors[status] || 'grey';
}

// Make report functions globally available
window.setReportDateRange = setReportDateRange;
window.exportReport = exportReport;

// =====================
// AUDIT LOG PAGE
// =====================

// Audit log state
const AuditLogState = {
    searchQuery: '',
    categoryFilter: 'ALL',
    logs: []
};

function renderAuditLogPage() {
    // Admin only access check
    if (AppState.currentUser?.role !== 'ADMIN') {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1 class="page-title">Access Denied</h1>
                    <p class="page-subtitle">You do not have permission to view the Audit Log.</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="empty-state" style="padding: var(--space-8);">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                        </svg>
                        <h3 class="empty-state-title">Admin Access Required</h3>
                        <p class="empty-state-desc">Only administrators can view the audit log.</p>
                    </div>
                </div>
            </div>
        `;
    }

    const allLogs = typeof AuditLog !== 'undefined' ? AuditLog.getRecent(100) : [];

    // Get unique action categories
    const categories = [...new Set(allLogs.map(l => l.action))].sort();

    // Apply filters
    let filteredLogs = allLogs;

    if (AuditLogState.searchQuery) {
        const query = AuditLogState.searchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
            log.action.toLowerCase().includes(query) ||
            log.actor.toLowerCase().includes(query) ||
            JSON.stringify(log.details).toLowerCase().includes(query)
        );
    }

    if (AuditLogState.categoryFilter !== 'ALL') {
        filteredLogs = filteredLogs.filter(log => log.action === AuditLogState.categoryFilter);
    }

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">Audit Log</h1>
                <p class="page-subtitle">Track all system activity and user actions. Admin access only.</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary" onclick="exportAuditLog('csv')">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;">
                        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"/>
                        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
                    </svg>
                    Export CSV
                </button>
                <button class="btn btn-secondary" onclick="exportAuditLog('json')">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;">
                        <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5z" clip-rule="evenodd"/>
                    </svg>
                    Export JSON
                </button>
            </div>
        </div>
        
        <!-- Search and Filter -->
        <div class="card" style="margin-bottom: var(--space-4);">
            <div class="card-body">
                <div style="display: grid; grid-template-columns: 1fr auto; gap: var(--space-4); align-items: end;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Search</label>
                        <input type="text" 
                               class="form-input" 
                               placeholder="Search by action, actor, or details..."
                               value="${AuditLogState.searchQuery}"
                               oninput="filterAuditLog(this.value, null)">
                    </div>
                    <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
                        <label class="form-label">Category</label>
                        <select class="form-select" onchange="filterAuditLog(null, this.value)">
                            <option value="ALL" ${AuditLogState.categoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
                            ${categories.map(cat => `
                                <option value="${cat}" ${AuditLogState.categoryFilter === cat ? 'selected' : ''}>${formatAuditAction(cat)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Stats -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-4);">
            ${renderStatsCard('primary', 'clipboard', allLogs.length, 'Total Events')}
            ${renderStatsCard('info', 'users', [...new Set(allLogs.map(l => l.actor))].length, 'Unique Actors')}
            ${renderStatsCard('warning', 'clock', allLogs.filter(l => new Date(l.timestamp) > new Date(Date.now() - 3600000)).length, 'Last Hour')}
            ${renderStatsCard('success', 'check', filteredLogs.length, 'Showing')}
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Activity Log</h3>
                <span style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${filteredLogs.length} entries</span>
            </div>
            <div class="card-body" style="max-height: 600px; overflow-y: auto;">
                ${filteredLogs.length === 0 ? `
                    <div class="empty-state" style="padding: var(--space-6);">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                        </svg>
                        <h3 class="empty-state-title">No matching entries</h3>
                        <p class="empty-state-desc">Try adjusting your search or filter criteria.</p>
                    </div>
                ` : `
                    <div class="audit-log">
                        ${filteredLogs.map(log => `
                            <div class="audit-item">
                                <div class="audit-icon ${getAuditIconClass(log.action)}">
                                    ${getAuditIcon(log.action)}
                                </div>
                                <div class="audit-content">
                                    <div class="audit-action">${formatAuditAction(log.action)}</div>
                                    <div class="audit-details">
                                        <strong>${log.actor}</strong> • 
                                        ${formatAuditDetails(log.details)}
                                    </div>
                                </div>
                                <div class="audit-meta">${new Date(log.timestamp).toLocaleString('en-AU')}</div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

function filterAuditLog(searchQuery, categoryFilter) {
    if (searchQuery !== null) AuditLogState.searchQuery = searchQuery;
    if (categoryFilter !== null) AuditLogState.categoryFilter = categoryFilter;
    navigateTo('audit-log');
}

function exportAuditLog(format) {
    const logs = typeof AuditLog !== 'undefined' ? AuditLog.getRecent(100) : [];

    // Build filename: date - search - category
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const searchPart = AuditLogState.searchQuery ? AuditLogState.searchQuery.replace(/[^a-zA-Z0-9]/g, '_') : 'all';
    const categoryPart = AuditLogState.categoryFilter === 'ALL' ? 'all' : AuditLogState.categoryFilter.toLowerCase().replace(/_/g, '-');
    const baseFilename = `${dateStr}-${searchPart}-${categoryPart}`;

    // Apply current filters to exported data
    let filteredLogs = logs;
    if (AuditLogState.searchQuery) {
        const query = AuditLogState.searchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
            log.action.toLowerCase().includes(query) ||
            log.actor.toLowerCase().includes(query) ||
            JSON.stringify(log.details).toLowerCase().includes(query)
        );
    }
    if (AuditLogState.categoryFilter !== 'ALL') {
        filteredLogs = filteredLogs.filter(log => log.action === AuditLogState.categoryFilter);
    }

    if (format === 'csv') {
        const headers = ['Timestamp', 'Action', 'Actor', 'Details'];
        const rows = filteredLogs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.action,
            log.actor,
            JSON.stringify(log.details)
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        downloadFile(csv, `${baseFilename}.csv`, 'text/csv');
    } else if (format === 'json') {
        const json = JSON.stringify(filteredLogs, null, 2);
        downloadFile(json, `${baseFilename}.json`, 'application/json');
    }

    showToast('success', 'Export Complete', `Exported ${filteredLogs.length} entries as ${format.toUpperCase()}`);
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function formatAuditAction(action) {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatAuditDetails(details) {
    if (!details || Object.keys(details).length === 0) return 'No details';

    const parts = [];
    if (details.requestId) parts.push(`Request: ${details.requestId}`);
    if (details.email) parts.push(`Email: ${details.email}`);
    if (details.userId) parts.push(`User ID: ${details.userId}`);
    if (details.type) parts.push(`Type: ${details.type}`);
    if (details.documentId) parts.push(`Doc: ${details.documentId}`);
    if (details.amount) parts.push(`Amount: $${details.amount}`);

    return parts.length > 0 ? parts.join(' | ') : JSON.stringify(details).substring(0, 60);
}

function getAuditIconClass(action) {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'audit-icon-user';
    if (action.includes('APPROVED')) return 'audit-icon-success';
    if (action.includes('REJECTED')) return 'audit-icon-error';
    if (action.includes('CREATED') || action.includes('UPLOADED')) return 'audit-icon-info';
    if (action.includes('CHANGED') || action.includes('UPDATED')) return 'audit-icon-warning';
    return '';
}

function getAuditIcon(action) {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
        return '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/></svg>';
    }
    if (action.includes('APPROVED')) {
        return '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>';
    }
    if (action.includes('REJECTED')) {
        return '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>';
    }
    if (action.includes('CREATED') || action.includes('UPLOADED')) {
        return '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>';
    }
    return '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"/></svg>';
}

// Make audit functions globally available
window.filterAuditLog = filterAuditLog;
window.exportAuditLog = exportAuditLog;

function startQuoting(id) {
    const req = AppState.requests.find(r => r.id === id);
    if (req) {
        req.status = 'QUOTING';
        req.assignedVendor = '5'; // Mel's ID
        if (typeof AuditLog !== 'undefined') {
            AuditLog.log('STATUS_CHANGED', { requestId: id, newStatus: 'QUOTING' });
        }
        navigateTo(AppState.currentPage);
        showToast('success', 'Quoting started', `${id} has been sent to FCCT for quotes.`);
    }
}

// =====================
// MY PROFILE PAGE
// =====================
function renderProfilePage() {
    const user = AppState.currentUser;
    if (!user) return renderEmptyState('Not logged in', 'Please log in to view your profile.');

    const userRequests = AppState.requests.filter(r => r.requester === user.name);
    const recentActivity = getRecentUserActivity(user);

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">My Profile</h1>
                <p class="page-subtitle">Manage your account settings and preferences.</p>
            </div>
        </div>
        
        <div class="profile-layout">
            <!-- Profile Card -->
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar-large">${user.avatar || user.name[0]}</div>
                    <div class="profile-info">
                        <h2 class="profile-name">${user.name}</h2>
                        <p class="profile-email">${user.email}</p>
                        <span class="role-badge role-badge-${user.role?.toLowerCase()}">${formatRoleDisplay(user.role)}</span>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="profile-stat">
                        <span class="profile-stat-value">${userRequests.length}</span>
                        <span class="profile-stat-label">My Requests</span>
                    </div>
                    <div class="profile-stat">
                        <span class="profile-stat-value">${userRequests.filter(r => r.status === 'BOOKED').length}</span>
                        <span class="profile-stat-label">Completed</span>
                    </div>
                    <div class="profile-stat">
                        <span class="profile-stat-value">${userRequests.filter(r => ['SUBMITTED', 'AWAITING_APPROVAL', 'QUOTING'].includes(r.status)).length}</span>
                        <span class="profile-stat-label">In Progress</span>
                    </div>
                </div>
            </div>
            
            <!-- Settings Column -->
            <div class="profile-settings">
                <!-- Account Settings -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Account Settings</h3>
                    </div>
                    <div class="card-body">
                        <div class="settings-group">
                            <div class="settings-item">
                                <div class="settings-item-info">
                                    <span class="settings-item-label">Full Name</span>
                                    <span class="settings-item-value">${user.name}</span>
                                </div>
                                <button class="btn btn-ghost btn-sm" onclick="editProfileField('name')">Edit</button>
                            </div>
                            
                            <div class="settings-item">
                                <div class="settings-item-info">
                                    <span class="settings-item-label">Email Address</span>
                                    <span class="settings-item-value">${user.email}</span>
                                </div>
                                <button class="btn btn-ghost btn-sm" onclick="editProfileField('email')">Edit</button>
                            </div>
                            
                            <div class="settings-item">
                                <div class="settings-item-info">
                                    <span class="settings-item-label">Password</span>
                                    <span class="settings-item-value">••••••••</span>
                                </div>
                                <button class="btn btn-ghost btn-sm" onclick="openChangePasswordModal()">Change</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Notification Preferences -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Notification Preferences</h3>
                    </div>
                    <div class="card-body">
                        <div class="settings-group">
                            <div class="settings-toggle-item">
                                <div class="settings-item-info">
                                    <span class="settings-item-label">Email Notifications</span>
                                    <span class="settings-item-desc">Receive updates about your requests via email</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="notify-email" checked onchange="updateNotificationPref('email', this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div class="settings-toggle-item">
                                <div class="settings-item-info">
                                    <span class="settings-item-label">Approval Alerts</span>
                                    <span class="settings-item-desc">Get notified when your requests are approved or rejected</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="notify-approvals" checked onchange="updateNotificationPref('approvals', this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div class="settings-toggle-item">
                                <div class="settings-item-info">
                                    <span class="settings-item-label">Travel Reminders</span>
                                    <span class="settings-item-desc">Receive reminders before your upcoming trips</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="notify-reminders" checked onchange="updateNotificationPref('reminders', this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Activity Column -->
            <div class="profile-activity">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Activity</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <div class="activity-list">
                            ${recentActivity.length ? recentActivity.map(activity => `
                                <div class="activity-item">
                                    <div class="activity-icon activity-icon-${activity.type}">
                                        ${getActivityIcon(activity.type)}
                                    </div>
                                    <div class="activity-content">
                                        <span class="activity-text">${activity.text}</span>
                                        <span class="activity-time">${activity.time}</span>
                                    </div>
                                </div>
                            `).join('') : `
                                <div style="padding: var(--space-6); text-align: center; color: var(--color-text-muted);">
                                    No recent activity
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- Quick Links -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Quick Links</h3>
                    </div>
                    <div class="card-body">
                        <div class="quick-links">
                            <a href="#" class="quick-link" onclick="navigateTo('my-requests'); return false;">
                                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>
                                <span>My Requests</span>
                            </a>
                            <a href="#" class="quick-link" onclick="openNewRequestModal(); return false;">
                                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>
                                <span>New Request</span>
                            </a>
                            <a href="mailto:support@mhfa.com.au" class="quick-link">
                                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"/></svg>
                                <span>Get Help</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function formatRoleDisplay(role) {
    const roleNames = {
        'OPS_COORDINATOR': 'Coordinator',
        'COORDINATOR': 'Coordinator',
        'ADMIN': 'Administrator',
        'APPROVER': 'Approver',
        'EMPLOYEE': 'Employee',
        'VENDOR': 'Vendor',
        'FINANCE': 'Finance'
    };
    return roleNames[role] || role;
}

function getRecentUserActivity(user) {
    // Generate sample activity based on user's requests
    const activities = [];
    const userRequests = AppState.requests.filter(r => r.requester === user.name);

    userRequests.slice(0, 3).forEach(req => {
        activities.push({
            type: 'request',
            text: `Created request: ${req.title}`,
            time: formatFullDate(req.created)
        });
    });

    // Add some generic activity
    activities.push({ type: 'login', text: 'Logged in to Mission Possible Travel', time: 'Today' });

    return activities.slice(0, 5);
}

function getActivityIcon(type) {
    const icons = {
        request: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 4.25a.75.75 0 01.75-.75h8.5a.75.75 0 01.75.75v8.5a.75.75 0 01-.75.75h-8.5a.75.75 0 01-.75-.75v-8.5zm6 2a.75.75 0 01.75.75v2.75h2.75a.75.75 0 010 1.5H11.75v2.75a.75.75 0 01-1.5 0V11.25H7.5a.75.75 0 010-1.5h2.75V7A.75.75 0 0111 6.25z" clip-rule="evenodd"/></svg>',
        login: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clip-rule="evenodd"/></svg>',
        approval: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>'
    };
    return icons[type] || icons.request;
}

function editProfileField(field) {
    showToast('info', 'Coming Soon', `Editing ${field} will be available in the next update.`);
}

function openChangePasswordModal() {
    const modalHtml = `
        <div id="password-modal" class="modal">
            <div class="modal-backdrop" onclick="closePasswordModal()"></div>
            <div class="modal-container">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Change Password</h2>
                        <button class="modal-close-btn" onclick="closePasswordModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group" style="margin-bottom: var(--space-4);">
                            <label class="form-label">Current Password</label>
                            <input type="password" id="current-password" class="form-input" placeholder="Enter current password">
                        </div>
                        <div class="form-group" style="margin-bottom: var(--space-4);">
                            <label class="form-label">New Password</label>
                            <input type="password" id="new-password" class="form-input" placeholder="Enter new password">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" id="confirm-password" class="form-input" placeholder="Confirm new password">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closePasswordModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    document.getElementById('password-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function closePasswordModal() {
    document.getElementById('password-modal')?.remove();
    document.body.style.overflow = '';
}

function changePassword() {
    const current = document.getElementById('current-password')?.value;
    const newPwd = document.getElementById('new-password')?.value;
    const confirm = document.getElementById('confirm-password')?.value;

    if (!current || !newPwd || !confirm) {
        showToast('error', 'Error', 'Please fill in all fields.');
        return;
    }

    if (newPwd !== confirm) {
        showToast('error', 'Error', 'New passwords do not match.');
        return;
    }

    if (newPwd.length < 6) {
        showToast('error', 'Error', 'Password must be at least 6 characters.');
        return;
    }

    // Update password in UserStore if available
    if (typeof UserStore !== 'undefined' && AppState.currentUser) {
        UserStore.resetPassword(AppState.currentUser.id, newPwd);
    }

    closePasswordModal();
    showToast('success', 'Password Updated', 'Your password has been changed successfully.');

    if (typeof AuditLog !== 'undefined') {
        AuditLog.log('PASSWORD_CHANGED', { userId: AppState.currentUser?.id });
    }
}

// =====================
// NOTIFICATIONS SYSTEM (Firestore-backed)
// =====================
const NotificationsState = {
    notifications: [],
    unsubscribe: null
};

/**
 * Initialize notifications with Firestore subscription
 */
function initNotifications() {
    if (!AppState.currentUser) return;

    const userEmail = AppState.currentUser.email;

    // Subscribe to real-time notification updates
    if (window.NotificationService) {
        NotificationsState.unsubscribe = window.NotificationService.subscribeToUserNotifications(
            userEmail,
            (notifications) => {
                NotificationsState.notifications = notifications;
                updateNotificationCount();
            }
        );
    }
}

/**
 * Cleanup notification subscription on logout
 */
function cleanupNotifications() {
    if (NotificationsState.unsubscribe) {
        NotificationsState.unsubscribe();
        NotificationsState.unsubscribe = null;
    }
    NotificationsState.notifications = [];
}

function toggleNotifications(e) {
    e?.stopPropagation();
    const dropdown = document.getElementById('notifications-dropdown');
    const isHidden = dropdown?.classList.contains('hidden');

    if (isHidden) {
        dropdown.classList.remove('hidden');
        renderNotifications();
    } else {
        dropdown?.classList.add('hidden');
    }
}

function closeNotifications() {
    document.getElementById('notifications-dropdown')?.classList.add('hidden');
}

function renderNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    const notifications = NotificationsState.notifications;

    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="notifications-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? 'read' : ''}" onclick="handleNotificationClick('${n.id}')">
            <div class="notification-icon ${n.type}">
                ${getNotificationIcon(n.type)}
            </div>
            <div class="notification-content">
                <div class="notification-title">${n.title}</div>
                <p class="notification-message">${n.message}</p>
                <span class="notification-time">${n.time || 'Just now'}</span>
            </div>
            ${!n.read ? '<span class="notification-dot"></span>' : ''}
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        approval: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"/></svg>',
        action: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"/></svg>',
        update: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"/></svg>'
    };
    return icons[type] || icons.update;
}

async function handleNotificationClick(id) {
    const notification = NotificationsState.notifications.find(n => n.id === id);
    if (notification) {
        // Mark as read in Firestore
        if (window.NotificationService) {
            await window.NotificationService.markRead(id);
        }

        closeNotifications();

        // Navigate to the related request
        if (notification.requestId) {
            viewRequestDetail(notification.requestId);
        }
    }
}

async function markNotificationRead(id) {
    if (window.NotificationService) {
        await window.NotificationService.markRead(id);
    }
}

async function clearAllNotifications() {
    if (!AppState.currentUser) return;

    if (window.NotificationService) {
        await window.NotificationService.clearAll(AppState.currentUser.email);
    }

    closeNotifications();
    showToast('success', 'Notifications Cleared', 'All notifications have been cleared.');
}

function updateNotificationCount() {
    const count = NotificationsState.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function updateNotificationPref(type, enabled) {
    showToast('success', 'Preference Updated', `${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${enabled ? 'enabled' : 'disabled'}.`);
}

// Make functions available globally
window.openNewRequestModal = openNewRequestModal;
window.navigateTo = navigateTo;
window.showToast = showToast;
window.handleApprove = handleApprove;
window.handleReject = handleReject;
window.viewRequestDetail = viewRequestDetail;
window.startQuoting = startQuoting;
window.showDetailTab = showDetailTab;
window.addNote = addNote;
window.openChangePasswordModal = openChangePasswordModal;
window.closePasswordModal = closePasswordModal;
window.changePassword = changePassword;
window.editProfileField = editProfileField;
window.updateNotificationPref = updateNotificationPref;
window.navigateToFilteredRequests = navigateToFilteredRequests;
window.filterByStatus = filterByStatus;
window.clearStatusFilter = clearStatusFilter;
window.viewInvoiceDetail = viewInvoiceDetail;
window.filterInvoices = filterInvoices;
window.clearInvoiceFilter = clearInvoiceFilter;
window.sendInvoice = sendInvoice;
window.markInvoicePaid = markInvoicePaid;
window.sendReminder = sendReminder;
window.printInvoice = printInvoice;
window.generateInvoiceFromRequest = generateInvoiceFromRequest;
window.handleSearch = handleSearch;
window.clearSearch = clearSearch;
window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;
window.markNotificationRead = markNotificationRead;
window.handleNotificationClick = handleNotificationClick;
window.clearAllNotifications = clearAllNotifications;
window.AppState = AppState;
