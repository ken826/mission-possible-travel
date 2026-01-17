/**
 * Mission Possible Travel - User Management System
 * Admin user management with role assignment and account control
 * Now with Firestore persistence for cross-device sync
 */

// =====================
// USER STORE (Firestore-backed)
// =====================
const UserStore = {
    users: [],
    collectionName: 'users',
    isInitialized: false,
    unsubscribe: null,

    // Default users for initial setup
    getDefaultUsers() {
        return [
            { id: '1', name: 'Glenda', email: 'glenda@mhfa.com.au', password: 'demo123', role: 'COORDINATOR', status: 'active', created: '2025-01-01' },
            { id: '2', name: 'Amanda', email: 'amanda@mhfa.com.au', password: 'demo123', role: 'COORDINATOR', status: 'active', created: '2025-01-01' },
            { id: '3', name: 'Sarah', email: 'sarah@mhfa.com.au', password: 'demo123', role: 'EMPLOYEE', status: 'active', created: '2025-06-15' },
            { id: '4', name: 'David', email: 'director@mhfa.com.au', password: 'demo123', role: 'APPROVER', status: 'active', created: '2025-01-01' },
            { id: '5', name: 'Mel', email: 'mel@fcct.com.au', password: 'demo123', role: 'VENDOR', status: 'active', company: 'Flight Centre Corporate Travel', created: '2025-03-01' },
            { id: '6', name: 'Admin', email: 'admin@mhfa.com.au', password: 'admin123', role: 'ADMIN', status: 'active', created: '2025-01-01' }
        ];
    },

    async init() {
        if (this.isInitialized) return;

        // Try Firestore first
        if (window.FirebaseDB) {
            try {
                // Check if users collection exists and has data
                const snapshot = await window.FirebaseDB
                    .collection(this.collectionName)
                    .limit(1)
                    .get();

                // If empty, initialize with default users
                if (snapshot.empty) {
                    console.log('Initializing default users in Firestore...');
                    const defaultUsers = this.getDefaultUsers();
                    const batch = window.FirebaseDB.batch();

                    for (const user of defaultUsers) {
                        const docRef = window.FirebaseDB.collection(this.collectionName).doc(user.id);
                        batch.set(docRef, user);
                    }

                    await batch.commit();
                    console.log('Default users initialized in Firestore');
                }

                // Load all users
                await this.loadFromFirestore();

                // Subscribe to real-time updates
                this.subscribeToChanges();

                this.isInitialized = true;
                console.log('UserStore initialized with Firestore');
                return;
            } catch (error) {
                console.error('Firestore init error, falling back to localStorage:', error);
            }
        }

        // Fallback to localStorage
        this.loadFromLocalStorage();
        this.isInitialized = true;
        console.log('UserStore initialized with localStorage (fallback)');
    },

    async loadFromFirestore() {
        if (!window.FirebaseDB) return;

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .orderBy('created', 'desc')
                .get();

            this.users = snapshot.docs.map(doc => ({
                ...doc.data(),
                _docId: doc.id
            }));
        } catch (error) {
            console.error('Error loading users from Firestore:', error);
        }
    },

    loadFromLocalStorage() {
        const saved = localStorage.getItem('mptUsers');
        if (saved) {
            this.users = JSON.parse(saved);
        } else {
            this.users = this.getDefaultUsers();
            this.saveToLocalStorage();
        }
    },

    subscribeToChanges() {
        if (!window.FirebaseDB) return;

        this.unsubscribe = window.FirebaseDB
            .collection(this.collectionName)
            .onSnapshot(
                (snapshot) => {
                    this.users = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        _docId: doc.id
                    }));
                    // Refresh UI if on user management page
                    if (window.AppState?.currentPage === 'user-management') {
                        window.navigateTo?.('user-management');
                    }
                },
                (error) => {
                    console.error('Error in users real-time listener:', error);
                }
            );
    },

    saveToLocalStorage() {
        localStorage.setItem('mptUsers', JSON.stringify(this.users));
    },

    // Deprecated - kept for backward compatibility
    save() {
        this.saveToLocalStorage();
    },

    getAll() {
        return this.users;
    },

    getById(id) {
        return this.users.find(u => u.id === id || u._docId === id);
    },

    getByEmail(email) {
        return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    },

    async create(userData) {
        const newUser = {
            id: String(Date.now()),
            ...userData,
            status: 'active',
            created: new Date().toISOString().split('T')[0]
        };

        if (window.FirebaseDB) {
            try {
                const docRef = await window.FirebaseDB
                    .collection(this.collectionName)
                    .doc(newUser.id)
                    .set(newUser);

                // Reload to get the document
                await this.loadFromFirestore();
            } catch (error) {
                console.error('Error creating user in Firestore:', error);
                // Fallback to local
                this.users.push(newUser);
                this.saveToLocalStorage();
            }
        } else {
            this.users.push(newUser);
            this.saveToLocalStorage();
        }

        if (typeof AuditLog !== 'undefined') {
            AuditLog.log('USER_CREATED', { userId: newUser.id, email: newUser.email, role: newUser.role });
        }

        return newUser;
    },

    async update(id, updates) {
        const user = this.getById(id);
        if (!user) return null;

        const oldRole = user.role;

        if (window.FirebaseDB) {
            try {
                await window.FirebaseDB
                    .collection(this.collectionName)
                    .doc(user.id || user._docId)
                    .update(updates);
            } catch (error) {
                console.error('Error updating user in Firestore:', error);
                Object.assign(user, updates);
                this.saveToLocalStorage();
            }
        } else {
            Object.assign(user, updates);
            this.saveToLocalStorage();
        }

        if (typeof AuditLog !== 'undefined' && updates.role && updates.role !== oldRole) {
            AuditLog.log('USER_ROLE_CHANGED', { userId: id, oldRole, newRole: updates.role });
        }

        return user;
    },

    async suspend(id) {
        const user = this.getById(id);
        if (!user) return false;

        await this.update(id, { status: 'suspended' });

        if (typeof AuditLog !== 'undefined') {
            AuditLog.log('USER_SUSPENDED', { userId: id, email: user.email });
        }

        return true;
    },

    async activate(id) {
        const user = this.getById(id);
        if (!user) return false;

        await this.update(id, { status: 'active' });

        if (typeof AuditLog !== 'undefined') {
            AuditLog.log('USER_ACTIVATED', { userId: id, email: user.email });
        }

        return true;
    },

    async resetPassword(id, newPassword) {
        const user = this.getById(id);
        if (!user) return false;

        await this.update(id, { password: newPassword });

        if (typeof AuditLog !== 'undefined') {
            AuditLog.log('PASSWORD_RESET', { userId: id, email: user.email });
        }

        return true;
    },

    authenticate(email, password) {
        const user = this.getByEmail(email);
        if (!user) return { success: false, error: 'User not found' };
        if (user.status === 'suspended') return { success: false, error: 'Account suspended' };
        if (user.password !== password) return { success: false, error: 'Invalid password' };

        if (typeof AuditLog !== 'undefined') {
            AuditLog.log('USER_LOGIN', { userId: user.id, email: user.email });
        }

        return { success: true, user };
    }
};

// =====================
// DARK MODE
// =====================
const DarkMode = {
    isEnabled: false,

    init() {
        // Load preference from localStorage
        const saved = localStorage.getItem('mptDarkMode');
        this.isEnabled = saved === 'true';
        this.apply();
        this.setupToggle();
    },

    toggle() {
        this.isEnabled = !this.isEnabled;
        localStorage.setItem('mptDarkMode', String(this.isEnabled));
        this.apply();
    },

    apply() {
        if (this.isEnabled) {
            document.documentElement.classList.add('dark-mode');
            // Update toggle icons
            document.querySelectorAll('.sun-icon').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.moon-icon').forEach(el => el.style.display = 'block');
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.querySelectorAll('.sun-icon').forEach(el => el.style.display = 'block');
            document.querySelectorAll('.moon-icon').forEach(el => el.style.display = 'none');
        }
    },

    setupToggle() {
        document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
            this.toggle();
        });
    }
};

// =====================
// ADMIN USER MANAGEMENT UI
// =====================

function renderUserManagementPage() {
    const users = UserStore.getAll();
    const currentUser = window.AppState?.currentUser;
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'COORDINATOR';

    return `
        <div class="page-header">
            <div class="page-header-content">
                <h1 class="page-title">User Management</h1>
                <p class="page-subtitle">Manage user accounts, roles, and access.</p>
            </div>
            ${isAdmin ? `
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openCreateUserModal()">
                    <svg class="btn-icon-left" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
                    </svg>
                    Create User
                </button>
            </div>
            ` : ''}
        </div>
        
        <div class="card">
            <div class="card-body" style="padding: 0;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created</th>
                            ${isAdmin ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: var(--space-3);">
                                        <span class="avatar">${user.name[0]}</span>
                                        <span style="font-weight: var(--font-weight-medium);">${user.name}</span>
                                    </div>
                                </td>
                                <td>${user.email}</td>
                                <td>
                                    <span class="role-badge role-badge-${user.role.toLowerCase()}">${formatRoleName(user.role)}</span>
                                </td>
                                <td>
                                    <span class="status-chip ${user.status === 'active' ? 'status-approved' : 'status-cancelled'}">${user.status}</span>
                                </td>
                                <td>${user.created}</td>
                                ${isAdmin ? `
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('${user.id}')" title="Edit">
                                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z"/></svg>
                                        </button>
                                        <button class="btn btn-ghost btn-sm" onclick="resetUserPassword('${user.id}')" title="Reset Password">
                                            <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"/></svg>
                                        </button>
                                        ${user.status === 'active' ? `
                                            <button class="btn btn-ghost btn-sm" onclick="suspendUser('${user.id}')" title="Suspend">
                                                <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;color:var(--color-error);"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>
                                            </button>
                                        ` : `
                                            <button class="btn btn-ghost btn-sm" onclick="activateUser('${user.id}')" title="Activate">
                                                <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;color:var(--color-success);"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                                            </button>
                                        `}
                                    </div>
                                </td>
                                ` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function formatRoleName(role) {
    const names = {
        'ADMIN': 'Administrator',
        'COORDINATOR': 'Coordinator',
        'APPROVER': 'Approver',
        'EMPLOYEE': 'Employee',
        'VENDOR': 'Vendor',
        'FINANCE': 'Finance'
    };
    return names[role] || role;
}

// Modal functions for user management
function openCreateUserModal() {
    const modal = document.getElementById('user-modal');
    if (!modal) {
        createUserModal();
    }

    document.getElementById('user-modal-title').textContent = 'Create User';
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-password-group').style.display = 'block';
    document.getElementById('user-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function openEditUserModal(userId) {
    const user = UserStore.getById(userId);
    if (!user) return;

    const modal = document.getElementById('user-modal');
    if (!modal) {
        createUserModal();
    }

    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name-input').value = user.name;
    document.getElementById('user-email-input').value = user.email;
    document.getElementById('user-role-select').value = user.role;
    document.getElementById('user-password-group').style.display = 'none';
    document.getElementById('user-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeUserModal() {
    document.getElementById('user-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
}

async function saveUser() {
    const id = document.getElementById('user-id').value;
    const name = document.getElementById('user-name-input').value;
    const email = document.getElementById('user-email-input').value;
    const role = document.getElementById('user-role-select').value;
    const password = document.getElementById('user-password-input')?.value;

    if (!name || !email || !role) {
        showToast('error', 'Validation Error', 'Please fill in all required fields.');
        return;
    }

    try {
        if (id) {
            // Update existing user
            await UserStore.update(id, { name, email, role });
            showToast('success', 'User Updated', `${name}'s account has been updated.`);
        } else {
            // Create new user
            if (!password) {
                showToast('error', 'Validation Error', 'Password is required for new users.');
                return;
            }
            await UserStore.create({ name, email, role, password });
            showToast('success', 'User Created', `${name}'s account has been created.`);
        }

        closeUserModal();
        navigateTo('user-management');
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('error', 'Save Failed', 'Unable to save user. Please try again.');
    }
}

async function resetUserPassword(userId) {
    const user = UserStore.getById(userId);
    if (!user) return;

    const newPassword = 'reset' + Math.random().toString(36).substring(2, 8);
    try {
        await UserStore.resetPassword(userId, newPassword);
        showToast('success', 'Password Reset', `Password for ${user.name} has been reset to: ${newPassword}`);
    } catch (error) {
        console.error('Error resetting password:', error);
        showToast('error', 'Reset Failed', 'Unable to reset password. Please try again.');
    }
}

async function suspendUser(userId) {
    const user = UserStore.getById(userId);
    if (!user) return;

    if (confirm(`Are you sure you want to suspend ${user.name}'s account?`)) {
        try {
            await UserStore.suspend(userId);
            showToast('warning', 'User Suspended', `${user.name}'s account has been suspended.`);
            navigateTo('user-management');
        } catch (error) {
            console.error('Error suspending user:', error);
            showToast('error', 'Suspend Failed', 'Unable to suspend user. Please try again.');
        }
    }
}

async function activateUser(userId) {
    const user = UserStore.getById(userId);
    if (!user) return;

    try {
        await UserStore.activate(userId);
        showToast('success', 'User Activated', `${user.name}'s account has been activated.`);
        navigateTo('user-management');
    } catch (error) {
        console.error('Error activating user:', error);
        showToast('error', 'Activation Failed', 'Unable to activate user. Please try again.');
    }
}

function createUserModal() {
    const modalHtml = `
        <div id="user-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeUserModal()"></div>
            <div class="modal-container">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="user-modal-title">Create User</h2>
                        <button class="modal-close-btn" onclick="closeUserModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="user-form" onsubmit="event.preventDefault(); saveUser();">
                            <input type="hidden" id="user-id">
                            
                            <div class="form-group" style="margin-bottom: var(--space-4);">
                                <label class="form-label">Full Name *</label>
                                <input type="text" id="user-name-input" class="form-input" required placeholder="e.g. Jane Smith">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: var(--space-4);">
                                <label class="form-label">Email *</label>
                                <input type="email" id="user-email-input" class="form-input" required placeholder="jane@mhfa.com.au">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: var(--space-4);" id="user-password-group">
                                <label class="form-label">Password *</label>
                                <input type="password" id="user-password-input" class="form-input" placeholder="Enter password">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: var(--space-4);">
                                <label class="form-label">Role *</label>
                                <select id="user-role-select" class="form-select" required>
                                    <option value="">Select a role...</option>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="COORDINATOR">Coordinator</option>
                                    <option value="APPROVER">Approver</option>
                                    <option value="VENDOR">External Vendor</option>
                                    <option value="FINANCE">Finance</option>
                                    <option value="ADMIN">Administrator</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeUserModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveUser()">Save User</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    UserStore.init();
    DarkMode.init();
});

// Make available globally
window.UserStore = UserStore;
window.DarkMode = DarkMode;
window.renderUserManagementPage = renderUserManagementPage;
window.openCreateUserModal = openCreateUserModal;
window.openEditUserModal = openEditUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.resetUserPassword = resetUserPassword;
window.suspendUser = suspendUser;
window.activateUser = activateUser;
