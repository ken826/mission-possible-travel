/**
 * Mission: Possible - Document Management System
 * Upload, store, search, and audit documents
 */

// =====================
// DOCUMENT TYPES
// =====================
const DOCUMENT_TYPES = {
    ITINERARY: { label: 'Itinerary', icon: 'map', color: 'blue' },
    INVOICE: { label: 'Invoice', icon: 'receipt', color: 'green' },
    RECEIPT: { label: 'Receipt', icon: 'document', color: 'purple' },
    QUOTE: { label: 'Quote', icon: 'currency', color: 'amber' },
    OTHER: { label: 'Other', icon: 'file', color: 'grey' }
};

// =====================
// DOCUMENT STORE
// =====================
const DocumentStore = {
    documents: [],

    // Initialize with sample documents
    init() {
        this.documents = [
            {
                id: 'DOC-001',
                requestId: 'REQ-2026-003',
                type: 'QUOTE',
                fileName: 'FCCT_Quote_Perth_Feb2026.pdf',
                fileSize: 245000,
                mimeType: 'application/pdf',
                uploadedBy: 'Glenda',
                uploadedAt: '2026-01-12T14:30:00',
                metadata: { supplier: 'Flight Centre', amount: 2400, currency: 'AUD' }
            },
            {
                id: 'DOC-002',
                requestId: 'REQ-2026-004',
                type: 'ITINERARY',
                fileName: 'Brisbane_Workshop_Itinerary.pdf',
                fileSize: 180000,
                mimeType: 'application/pdf',
                uploadedBy: 'Glenda',
                uploadedAt: '2026-01-09T10:15:00',
                metadata: { carrier: 'Qantas' }
            },
            {
                id: 'DOC-003',
                requestId: 'REQ-2026-004',
                type: 'INVOICE',
                fileName: 'FCCT_Invoice_001234.pdf',
                fileSize: 125000,
                mimeType: 'application/pdf',
                uploadedBy: 'Glenda',
                uploadedAt: '2026-01-10T09:00:00',
                metadata: {
                    supplier: 'Flight Centre',
                    invoiceNumber: 'FCCT-001234',
                    amount: 980,
                    currency: 'AUD',
                    dueDate: '2026-02-10',
                    forwardedToFinance: true,
                    forwardedAt: '2026-01-10T09:30:00'
                }
            }
        ];
    },

    // Get documents for a request
    getByRequestId(requestId) {
        return this.documents.filter(d => d.requestId === requestId);
    },

    // Get document by ID
    getById(id) {
        return this.documents.find(d => d.id === id);
    },

    // Get all invoices pending finance review
    getPendingInvoices() {
        return this.documents.filter(d =>
            d.type === 'INVOICE' && !d.metadata?.forwardedToFinance
        );
    },

    // Get all forwarded invoices
    getForwardedInvoices() {
        return this.documents.filter(d =>
            d.type === 'INVOICE' && d.metadata?.forwardedToFinance
        );
    },

    // Search documents
    search(query, filters = {}) {
        let results = [...this.documents];

        if (query) {
            const q = query.toLowerCase();
            results = results.filter(d =>
                d.fileName.toLowerCase().includes(q) ||
                d.metadata?.supplier?.toLowerCase().includes(q) ||
                d.metadata?.invoiceNumber?.toLowerCase().includes(q)
            );
        }

        if (filters.type) {
            results = results.filter(d => d.type === filters.type);
        }

        if (filters.requestId) {
            results = results.filter(d => d.requestId === filters.requestId);
        }

        if (filters.dateFrom) {
            results = results.filter(d => new Date(d.uploadedAt) >= new Date(filters.dateFrom));
        }

        if (filters.dateTo) {
            results = results.filter(d => new Date(d.uploadedAt) <= new Date(filters.dateTo));
        }

        return results;
    },

    // Upload a new document (simulated)
    upload(requestId, file, type, metadata = {}) {
        const newDoc = {
            id: `DOC-${String(this.documents.length + 1).padStart(3, '0')}`,
            requestId,
            type,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadedBy: window.AppState?.currentUser?.name || 'Unknown',
            uploadedAt: new Date().toISOString(),
            metadata
        };

        this.documents.push(newDoc);

        // Log audit event
        AuditLog.log('DOCUMENT_UPLOADED', {
            documentId: newDoc.id,
            requestId,
            fileName: file.name,
            type
        });

        return newDoc;
    },

    // Delete a document
    delete(documentId) {
        const doc = this.getById(documentId);
        if (!doc) return false;

        this.documents = this.documents.filter(d => d.id !== documentId);

        // Log audit event
        AuditLog.log('DOCUMENT_DELETED', {
            documentId,
            fileName: doc.fileName,
            requestId: doc.requestId
        });

        return true;
    },

    // Forward invoice to finance
    forwardToFinance(documentId) {
        const doc = this.getById(documentId);
        if (!doc || doc.type !== 'INVOICE') return false;

        doc.metadata = doc.metadata || {};
        doc.metadata.forwardedToFinance = true;
        doc.metadata.forwardedAt = new Date().toISOString();
        doc.metadata.forwardedBy = window.AppState?.currentUser?.name;

        // Log audit event
        AuditLog.log('INVOICE_FORWARDED', {
            documentId,
            invoiceNumber: doc.metadata.invoiceNumber,
            amount: doc.metadata.amount,
            requestId: doc.requestId
        });

        return true;
    }
};

// =====================
// AUDIT LOG
// =====================
const AuditLog = {
    logs: [],

    init() {
        this.logs = [
            { id: 1, action: 'USER_LOGIN', actor: 'Glenda', timestamp: '2026-01-15T08:00:00', details: { email: 'glenda@mhfa.com.au' } },
            { id: 2, action: 'REQUEST_CREATED', actor: 'Sarah', timestamp: '2026-01-14T10:30:00', details: { requestId: 'REQ-2026-001' } },
            { id: 3, action: 'DOCUMENT_UPLOADED', actor: 'Glenda', timestamp: '2026-01-12T14:30:00', details: { documentId: 'DOC-001', type: 'QUOTE' } },
            { id: 4, action: 'REQUEST_APPROVED', actor: 'David', timestamp: '2026-01-13T11:00:00', details: { requestId: 'REQ-2026-003' } },
            { id: 5, action: 'INVOICE_FORWARDED', actor: 'Glenda', timestamp: '2026-01-10T09:30:00', details: { documentId: 'DOC-003', amount: 980 } }
        ];
    },

    log(action, details = {}) {
        const entry = {
            id: this.logs.length + 1,
            action,
            actor: window.AppState?.currentUser?.name || 'System',
            timestamp: new Date().toISOString(),
            details
        };
        this.logs.unshift(entry);
        console.log('[AUDIT]', action, details);
        return entry;
    },

    getRecent(limit = 20) {
        return this.logs.slice(0, limit);
    },

    search(query, filters = {}) {
        let results = [...this.logs];

        if (query) {
            const q = query.toLowerCase();
            results = results.filter(l =>
                l.action.toLowerCase().includes(q) ||
                l.actor.toLowerCase().includes(q) ||
                JSON.stringify(l.details).toLowerCase().includes(q)
            );
        }

        if (filters.action) {
            results = results.filter(l => l.action === filters.action);
        }

        if (filters.actor) {
            results = results.filter(l => l.actor === filters.actor);
        }

        return results;
    }
};

// =====================
// DOCUMENT UI COMPONENTS
// =====================

function renderDocumentList(documents, options = {}) {
    if (!documents.length) {
        return `
            <div class="empty-state" style="padding: var(--space-6);">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px;">
                    <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                </svg>
                <p style="color: var(--color-text-muted); margin-top: var(--space-2);">No documents attached</p>
            </div>
        `;
    }

    return `
        <div class="document-list">
            ${documents.map(doc => renderDocumentItem(doc, options)).join('')}
        </div>
    `;
}

function renderDocumentItem(doc, options = {}) {
    const typeInfo = DOCUMENT_TYPES[doc.type] || DOCUMENT_TYPES.OTHER;
    const fileSize = formatFileSize(doc.fileSize);
    const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

    const showForward = options.showForward && doc.type === 'INVOICE' && !doc.metadata?.forwardedToFinance;
    const isForwarded = doc.metadata?.forwardedToFinance;

    return `
        <div class="document-item" data-doc-id="${doc.id}">
            <div class="document-icon document-icon-${typeInfo.color}">
                ${getDocumentIcon(typeInfo.icon)}
            </div>
            <div class="document-info">
                <div class="document-name">${doc.fileName}</div>
                <div class="document-meta">
                    <span class="document-type-badge">${typeInfo.label}</span>
                    <span>${fileSize}</span>
                    <span>Uploaded ${uploadDate}</span>
                    ${doc.metadata?.invoiceNumber ? `<span>#${doc.metadata.invoiceNumber}</span>` : ''}
                    ${isForwarded ? '<span class="forwarded-badge">✓ Forwarded to Finance</span>' : ''}
                </div>
            </div>
            <div class="document-actions">
                <button class="btn btn-ghost btn-sm" onclick="previewDocument('${doc.id}')" title="Preview">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clip-rule="evenodd"/></svg>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="downloadDocument('${doc.id}')" title="Download">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"/><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/></svg>
                </button>
                ${showForward ? `
                    <button class="btn btn-sm btn-secondary" onclick="forwardToFinance('${doc.id}')" title="Forward to Finance">
                        <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/></svg>
                        Forward
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function renderDocumentUploadPanel(requestId) {
    return `
        <div class="document-upload-panel">
            <div class="upload-dropzone" id="upload-dropzone" onclick="document.getElementById('file-input').click()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 40px; height: 40px; color: var(--color-text-muted);">
                    <path d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"/>
                </svg>
                <p class="upload-text">Click or drag files to upload</p>
                <p class="upload-hint">PDF, Images, Word documents up to 10MB</p>
                <input type="file" id="file-input" hidden accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onchange="handleFileSelect(event, '${requestId}')">
            </div>
            
            <div class="upload-type-selector" id="upload-type-selector" style="display: none;">
                <label class="form-label">Document Type</label>
                <select id="upload-doc-type" class="form-select">
                    <option value="ITINERARY">Itinerary</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="RECEIPT">Receipt</option>
                    <option value="QUOTE">Quote</option>
                    <option value="OTHER">Other</option>
                </select>
                
                <div id="invoice-fields" style="display: none; margin-top: var(--space-3);">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Invoice Number</label>
                            <input type="text" id="invoice-number" class="form-input" placeholder="e.g. INV-12345">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Amount ($)</label>
                            <input type="number" id="invoice-amount" class="form-input" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" id="invoice-due-date" class="form-input">
                    </div>
                </div>
                
                <button class="btn btn-primary btn-full" style="margin-top: var(--space-4);" onclick="confirmUpload('${requestId}')">
                    Upload Document
                </button>
            </div>
        </div>
    `;
}

// Helper functions
function getDocumentIcon(icon) {
    const icons = {
        map: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.157 2.175a1.5 1.5 0 00-1.147 0l-4.084 1.69A1.5 1.5 0 002 5.251v10.877a1.5 1.5 0 002.074 1.386l3.51-1.453 4.26 1.763a1.5 1.5 0 001.146 0l4.083-1.69A1.5 1.5 0 0018 14.748V3.873a1.5 1.5 0 00-2.073-1.386l-3.51 1.452-4.26-1.763z" clip-rule="evenodd"/></svg>',
        receipt: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M1 2.75A.75.75 0 011.75 2h16.5a.75.75 0 010 1.5H18v11.978a2.143 2.143 0 01-3.425 1.714L12.5 15.5l-2.075 1.692a2.143 2.143 0 01-2.85 0L5.5 15.5l-2.075 1.692A2.143 2.143 0 010 15.478V3.5h.25a.75.75 0 00.75-.75zM5 6a.75.75 0 000 1.5h10A.75.75 0 0015 6H5zm0 3.5a.75.75 0 000 1.5h10a.75.75 0 000-1.5H5z"/></svg>',
        document: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"/></svg>',
        currency: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.186.158C8.897 9.001 9.418 9.189 10 9.29V7.198c-.51.1-1.02.327-1.377.602-.156.121-.287.243-.392.428-.086.153-.126.304-.126.453 0 .149.04.3.126.453.105.185.236.307.392.428.053.042.114.085.177.128z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-16.75V3.5a1 1 0 01-2 0v1.25c-.621.052-1.214.2-1.752.46-.621.3-1.18.76-1.503 1.412-.32.642-.347 1.392-.03 2.104.283.65.798 1.107 1.371 1.429.52.292 1.148.508 1.913.688v2.62c-.582-.102-1.102-.289-1.483-.512-.393-.223-.656-.47-.804-.685a1 1 0 10-1.632 1.15c.372.527.896.954 1.435 1.26.528.297 1.168.541 1.885.647V15.5a1 1 0 102 0v-1.223c.621-.053 1.214-.2 1.752-.46.621-.3 1.18-.76 1.503-1.412.32-.642.347-1.392.03-2.104-.283-.65-.798-1.107-1.371-1.429-.52-.292-1.148-.508-1.914-.688V5.563c.582.102 1.103.29 1.484.512.393.223.656.47.804.685a1 1 0 101.632-1.15c-.372-.527-.896-.954-1.435-1.26-.528-.297-1.168-.541-1.885-.647V3.5a1 1 0 00-2 0v-2.25z"/></svg>',
        file: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z"/></svg>'
    };
    return icons[icon] || icons.file;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Document action handlers
let pendingFile = null;

function handleFileSelect(event, requestId) {
    const file = event.target.files[0];
    if (!file) return;

    pendingFile = file;
    document.getElementById('upload-type-selector').style.display = 'block';
    document.querySelector('.upload-dropzone').innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor" style="width: 40px; height: 40px; color: var(--color-success);">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"/>
        </svg>
        <p class="upload-text" style="color: var(--color-text-primary);">${file.name}</p>
        <p class="upload-hint">${formatFileSize(file.size)}</p>
    `;

    // Show/hide invoice fields
    document.getElementById('upload-doc-type').addEventListener('change', function () {
        document.getElementById('invoice-fields').style.display = this.value === 'INVOICE' ? 'block' : 'none';
    });
}

function confirmUpload(requestId) {
    if (!pendingFile) return;

    const type = document.getElementById('upload-doc-type').value;
    const metadata = {};

    if (type === 'INVOICE') {
        metadata.invoiceNumber = document.getElementById('invoice-number').value;
        metadata.amount = parseFloat(document.getElementById('invoice-amount').value) || 0;
        metadata.dueDate = document.getElementById('invoice-due-date').value;
    }

    DocumentStore.upload(requestId, pendingFile, type, metadata);
    pendingFile = null;

    showToast('success', 'Document uploaded', `${pendingFile?.name || 'Document'} has been attached to the request.`);

    // Refresh the view
    if (typeof viewRequestDetail === 'function') {
        viewRequestDetail(requestId);
    } else {
        navigateTo(AppState.currentPage);
    }
}

function previewDocument(docId) {
    const doc = DocumentStore.getById(docId);
    if (doc) {
        showToast('info', 'Preview', `Would open preview for: ${doc.fileName}`);
        AuditLog.log('DOCUMENT_VIEWED', { documentId: docId, fileName: doc.fileName });
    }
}

function downloadDocument(docId) {
    const doc = DocumentStore.getById(docId);
    if (doc) {
        showToast('info', 'Download', `Would download: ${doc.fileName}`);
        AuditLog.log('DOCUMENT_DOWNLOADED', { documentId: docId, fileName: doc.fileName });
    }
}

function forwardToFinance(docId) {
    if (DocumentStore.forwardToFinance(docId)) {
        showToast('success', 'Invoice forwarded', 'The invoice has been sent to the Finance team for processing.');
        navigateTo(AppState.currentPage);
    }
}

// Initialize stores
DocumentStore.init();
AuditLog.init();

// Make available globally
window.DocumentStore = DocumentStore;
window.AuditLog = AuditLog;
window.DOCUMENT_TYPES = DOCUMENT_TYPES;
window.renderDocumentList = renderDocumentList;
window.renderDocumentItem = renderDocumentItem;
window.renderDocumentUploadPanel = renderDocumentUploadPanel;
window.handleFileSelect = handleFileSelect;
window.confirmUpload = confirmUpload;
window.previewDocument = previewDocument;
window.downloadDocument = downloadDocument;
window.forwardToFinance = forwardToFinance;
