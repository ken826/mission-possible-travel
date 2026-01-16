/**
 * Invoice Store - Mission Possible Travel
 * Manages invoice data for travel and catering requests
 */

// Invoice statuses
const INVOICE_STATUS = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED'
};

// Sample invoices data
const SAMPLE_INVOICES = [
    {
        id: 'INV-2026-001',
        requestId: 'REQ-2026-004',
        requestTitle: 'Brisbane Workshop',
        status: 'SENT',
        vendor: 'Flight Centre Corporate Travel',
        vendorEmail: 'invoices@fcct.com.au',
        issueDate: '2026-01-10',
        dueDate: '2026-02-10',
        lineItems: [
            { id: 1, description: 'Return Flight MEL-BNE (Economy)', quantity: 1, unitPrice: 450 },
            { id: 2, description: 'Hotel Accommodation (2 nights)', quantity: 2, unitPrice: 180 },
            { id: 3, description: 'Airport Transfers', quantity: 2, unitPrice: 45 }
        ],
        subtotal: 900,
        gst: 90,
        total: 990,
        notes: 'Booking reference: FCCT-78234',
        createdBy: 'Glenda',
        createdAt: '2026-01-10T09:00:00'
    },
    {
        id: 'INV-2026-002',
        requestId: 'REQ-2026-005',
        requestTitle: 'Board Meeting Catering',
        status: 'DRAFT',
        vendor: 'Gourmet Events Co',
        vendorEmail: 'accounts@gourmetevents.com.au',
        issueDate: '2026-01-15',
        dueDate: '2026-02-15',
        lineItems: [
            { id: 1, description: 'Executive Lunch Package (12 pax)', quantity: 12, unitPrice: 28 },
            { id: 2, description: 'Premium Beverage Service', quantity: 1, unitPrice: 85 },
            { id: 3, description: 'Setup & Service Staff (2 hrs)', quantity: 2, unitPrice: 45 }
        ],
        subtotal: 511,
        gst: 51.10,
        total: 562.10,
        notes: '',
        createdBy: 'Glenda',
        createdAt: '2026-01-15T14:30:00'
    },
    {
        id: 'INV-2026-003',
        requestId: 'REQ-2026-003',
        requestTitle: 'Perth Training Delivery',
        status: 'OVERDUE',
        vendor: 'Flight Centre Corporate Travel',
        vendorEmail: 'invoices@fcct.com.au',
        issueDate: '2025-12-20',
        dueDate: '2026-01-05',
        lineItems: [
            { id: 1, description: 'Return Flight MEL-PER (Business)', quantity: 1, unitPrice: 1200 },
            { id: 2, description: 'Hotel Accommodation (3 nights)', quantity: 3, unitPrice: 220 },
            { id: 3, description: 'Car Hire (3 days)', quantity: 3, unitPrice: 85 },
            { id: 4, description: 'Travel Insurance', quantity: 1, unitPrice: 65 }
        ],
        subtotal: 2180,
        gst: 218,
        total: 2398,
        notes: 'OVERDUE - Please follow up with vendor',
        createdBy: 'Amanda',
        createdAt: '2025-12-20T11:00:00'
    }
];

// Invoice Store
const InvoiceStore = {
    invoices: [...SAMPLE_INVOICES],

    // Get all invoices
    getAll() {
        return this.invoices;
    },

    // Get invoice by ID
    getById(id) {
        return this.invoices.find(inv => inv.id === id);
    },

    // Get invoices by request ID
    getByRequestId(requestId) {
        return this.invoices.filter(inv => inv.requestId === requestId);
    },

    // Get invoices by status
    getByStatus(status) {
        if (status === 'all') return this.invoices;
        return this.invoices.filter(inv => inv.status === status);
    },

    // Create new invoice
    create(invoiceData) {
        const id = `INV-2026-${String(this.invoices.length + 1).padStart(3, '0')}`;
        const newInvoice = {
            id,
            status: INVOICE_STATUS.DRAFT,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: this.calculateDueDate(30),
            createdAt: new Date().toISOString(),
            createdBy: AppState.currentUser?.name || 'System',
            ...invoiceData,
            subtotal: this.calculateSubtotal(invoiceData.lineItems || []),
            gst: 0,
            total: 0
        };
        newInvoice.gst = newInvoice.subtotal * 0.1;
        newInvoice.total = newInvoice.subtotal + newInvoice.gst;

        this.invoices.push(newInvoice);
        return newInvoice;
    },

    // Update invoice
    update(id, updates) {
        const index = this.invoices.findIndex(inv => inv.id === id);
        if (index !== -1) {
            this.invoices[index] = { ...this.invoices[index], ...updates };
            // Recalculate totals if line items changed
            if (updates.lineItems) {
                this.invoices[index].subtotal = this.calculateSubtotal(updates.lineItems);
                this.invoices[index].gst = this.invoices[index].subtotal * 0.1;
                this.invoices[index].total = this.invoices[index].subtotal + this.invoices[index].gst;
            }
            return this.invoices[index];
        }
        return null;
    },

    // Update invoice status
    updateStatus(id, newStatus) {
        return this.update(id, { status: newStatus });
    },

    // Delete invoice
    delete(id) {
        const index = this.invoices.findIndex(inv => inv.id === id);
        if (index !== -1) {
            this.invoices.splice(index, 1);
            return true;
        }
        return false;
    },

    // Calculate subtotal from line items
    calculateSubtotal(lineItems) {
        return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    },

    // Calculate due date (days from today)
    calculateDueDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    },

    // Get invoice statistics
    getStats() {
        return {
            total: this.invoices.length,
            draft: this.invoices.filter(i => i.status === 'DRAFT').length,
            sent: this.invoices.filter(i => i.status === 'SENT').length,
            paid: this.invoices.filter(i => i.status === 'PAID').length,
            overdue: this.invoices.filter(i => i.status === 'OVERDUE').length,
            totalValue: this.invoices.reduce((sum, i) => sum + i.total, 0),
            outstandingValue: this.invoices
                .filter(i => ['SENT', 'OVERDUE'].includes(i.status))
                .reduce((sum, i) => sum + i.total, 0)
        };
    },

    // Generate invoice from request
    generateFromRequest(request) {
        const invoiceData = {
            requestId: request.id,
            requestTitle: request.title,
            vendor: request.type === 'TRAVEL' ? 'Flight Centre Corporate Travel' : 'Catering Vendor',
            vendorEmail: request.type === 'TRAVEL' ? 'invoices@fcct.com.au' : 'accounts@vendor.com.au',
            lineItems: this.generateLineItemsFromRequest(request),
            notes: `Generated from request ${request.id}`
        };
        return this.create(invoiceData);
    },

    // Generate line items based on request type
    generateLineItemsFromRequest(request) {
        if (request.type === 'TRAVEL') {
            return [
                { id: 1, description: `Flights to ${request.destination}`, quantity: 1, unitPrice: request.estimate * 0.5 },
                { id: 2, description: 'Accommodation', quantity: 1, unitPrice: request.estimate * 0.35 },
                { id: 3, description: 'Transfers & Incidentals', quantity: 1, unitPrice: request.estimate * 0.15 }
            ];
        } else {
            return [
                { id: 1, description: `Catering for ${request.attendees || 10} attendees`, quantity: request.attendees || 10, unitPrice: (request.estimate || 500) / (request.attendees || 10) },
                { id: 2, description: 'Setup & Service', quantity: 1, unitPrice: 50 }
            ];
        }
    }
};

// Make available globally
window.InvoiceStore = InvoiceStore;
window.INVOICE_STATUS = INVOICE_STATUS;
