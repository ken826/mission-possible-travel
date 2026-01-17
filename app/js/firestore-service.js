/**
 * Firestore Request Service
 * Handles all CRUD operations for travel/catering requests
 */

const RequestService = {
    collectionName: 'requests',

    /**
     * Get all requests from Firestore
     * @returns {Promise<Array>} Array of request objects
     */
    async getAll() {
        if (!window.FirebaseDB) {
            console.warn('Firestore not available, using sample data');
            return this._getSampleData();
        }

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .orderBy('created', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                ...doc.data(),
                _docId: doc.id
            }));
        } catch (error) {
            console.error('Error fetching requests:', error);
            throw error;
        }
    },

    /**
     * Get a single request by ID
     * @param {string} id - Request ID (e.g., 'REQ-2026-001')
     * @returns {Promise<Object|null>} Request object or null
     */
    async getById(id) {
        if (!window.FirebaseDB) {
            const sample = this._getSampleData();
            return sample.find(r => r.id === id) || null;
        }

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .where('id', '==', id)
                .limit(1)
                .get();

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return { ...doc.data(), _docId: doc.id };
        } catch (error) {
            console.error('Error fetching request:', error);
            throw error;
        }
    },

    /**
     * Create a new request
     * @param {Object} data - Request data
     * @returns {Promise<Object>} Created request with ID
     */
    async create(data) {
        const id = await this._generateRequestId();
        const now = new Date().toISOString();

        const request = {
            ...data,
            id,
            status: 'SUBMITTED',
            created: now,
            updated: now
        };

        if (!window.FirebaseDB) {
            console.warn('Firestore not available, request not persisted');
            return request;
        }

        try {
            const docRef = await window.FirebaseDB
                .collection(this.collectionName)
                .add(request);

            return { ...request, _docId: docRef.id };
        } catch (error) {
            console.error('Error creating request:', error);
            throw error;
        }
    },

    /**
     * Update an existing request
     * @param {string} id - Request ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated request
     */
    async update(id, updates) {
        if (!window.FirebaseDB) {
            console.warn('Firestore not available, update not persisted');
            return { id, ...updates };
        }

        try {
            // Find the document by request ID
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .where('id', '==', id)
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error(`Request ${id} not found`);
            }

            const docRef = snapshot.docs[0].ref;
            const updateData = {
                ...updates,
                updated: new Date().toISOString()
            };

            await docRef.update(updateData);

            return { id, ...updateData };
        } catch (error) {
            console.error('Error updating request:', error);
            throw error;
        }
    },

    /**
     * Delete a request
     * @param {string} id - Request ID
     * @returns {Promise<void>}
     */
    async delete(id) {
        if (!window.FirebaseDB) {
            console.warn('Firestore not available, delete not persisted');
            return;
        }

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .where('id', '==', id)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                await snapshot.docs[0].ref.delete();
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            throw error;
        }
    },

    /**
     * Subscribe to real-time changes
     * @param {Function} callback - Called with updated requests array
     * @returns {Function} Unsubscribe function
     */
    subscribeToChanges(callback) {
        if (!window.FirebaseDB) {
            console.warn('Firestore not available, real-time sync disabled');
            callback(this._getSampleData());
            return () => { };
        }

        return window.FirebaseDB
            .collection(this.collectionName)
            .orderBy('created', 'desc')
            .onSnapshot(
                (snapshot) => {
                    const requests = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        _docId: doc.id
                    }));
                    callback(requests);
                },
                (error) => {
                    console.error('Error in real-time listener:', error);
                }
            );
    },

    /**
     * Initialize sample data in Firestore (if empty)
     * @returns {Promise<void>}
     */
    async initializeSampleData() {
        if (!window.FirebaseDB) return;

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .limit(1)
                .get();

            // Only add sample data if collection is empty
            if (snapshot.empty) {
                console.log('Initializing sample data in Firestore...');
                const sampleData = this._getSampleData();
                const batch = window.FirebaseDB.batch();

                sampleData.forEach(request => {
                    const docRef = window.FirebaseDB.collection(this.collectionName).doc();
                    batch.set(docRef, request);
                });

                await batch.commit();
                console.log('Sample data initialized successfully');
            }
        } catch (error) {
            console.error('Error initializing sample data:', error);
        }
    },

    /**
     * Generate unique request ID
     * @returns {Promise<string>} New request ID
     */
    async _generateRequestId() {
        const year = new Date().getFullYear();
        const prefix = `REQ-${year}-`;

        if (!window.FirebaseDB) {
            return `${prefix}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        }

        try {
            // Get the highest existing ID for this year
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .where('id', '>=', prefix)
                .where('id', '<', `REQ-${year + 1}-`)
                .orderBy('id', 'desc')
                .limit(1)
                .get();

            let nextNum = 1;
            if (!snapshot.empty) {
                const lastId = snapshot.docs[0].data().id;
                const lastNum = parseInt(lastId.split('-')[2], 10);
                nextNum = lastNum + 1;
            }

            return `${prefix}${String(nextNum).padStart(3, '0')}`;
        } catch (error) {
            console.warn('Error generating ID, using random:', error);
            return `${prefix}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        }
    },

    /**
     * Sample data for demo/fallback mode
     */
    _getSampleData() {
        return [
            { id: 'REQ-2026-001', type: 'TRAVEL', status: 'AWAITING_APPROVAL', title: 'Sydney Conference - Feb 2026', requester: 'Sarah', requesterEmail: 'sarah@mhfa.com.au', destination: 'Sydney', dates: '10-12 Feb 2026', estimate: 1850, created: '2026-01-14T00:00:00.000Z' },
            { id: 'REQ-2026-002', type: 'CATERING', status: 'SUBMITTED', title: 'Team Planning Day Lunch', requester: 'Michael', requesterEmail: 'michael@mhfa.com.au', location: 'MHFA Office', attendees: 25, estimate: 625, created: '2026-01-15T00:00:00.000Z' },
            { id: 'REQ-2026-003', type: 'TRAVEL', status: 'QUOTING', title: 'Perth Training Delivery', requester: 'Emma', requesterEmail: 'emma@mhfa.com.au', destination: 'Perth', dates: '20-22 Feb 2026', estimate: 2400, created: '2026-01-12T00:00:00.000Z' },
            { id: 'REQ-2026-004', type: 'TRAVEL', status: 'BOOKED', title: 'Brisbane Workshop', requester: 'James', requesterEmail: 'james@mhfa.com.au', destination: 'Brisbane', dates: '5-6 Feb 2026', estimate: 980, created: '2026-01-08T00:00:00.000Z' },
            { id: 'REQ-2026-005', type: 'CATERING', status: 'APPROVED', title: 'Board Meeting Catering', requester: 'Amanda', requesterEmail: 'amanda@mhfa.com.au', location: 'Board Room', attendees: 12, estimate: 360, created: '2026-01-13T00:00:00.000Z' }
        ];
    }
};

// Export for global access
window.RequestService = RequestService;
