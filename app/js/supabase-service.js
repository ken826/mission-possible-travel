/**
 * Supabase Request Service
 * Handles all CRUD operations for travel/catering requests
 */

const RequestService = {
    tableName: 'requests',
    realtimeChannel: null,

    /**
     * Convert camelCase to snake_case for database columns
     */
    _toSnakeCase(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Convert camelCase to snake_case
                const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                result[snakeKey] = obj[key];
            }
        }
        return result;
    },

    /**
     * Convert snake_case to camelCase for JavaScript
     */
    _toCamelCase(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Convert snake_case to camelCase
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = obj[key];
            }
        }
        return result;
    },

    /**
     * Get all requests from Supabase
     * @returns {Promise<Array>} Array of request objects
     */
    async getAll() {
        if (!window.SupabaseClient) {
            console.warn('Supabase not available, using sample data');
            return this._getSampleData();
        }

        try {
            const { data, error } = await window.SupabaseClient
                .from(this.tableName)
                .select('*')
                .order('created', { ascending: false });

            if (error) throw error;

            // Convert snake_case to camelCase for each record
            return (data || []).map(record => this._toCamelCase(record));
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
        if (!window.SupabaseClient) {
            const sample = this._getSampleData();
            return sample.find(r => r.id === id) || null;
        }

        try {
            const { data, error } = await window.SupabaseClient
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

            return data ? this._toCamelCase(data) : null;
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
    async create(inputData) {
        const id = await this._generateRequestId();
        const now = new Date().toISOString();

        const request = {
            ...inputData,
            id,
            status: 'SUBMITTED',
            created: now,
            updated: now
        };

        if (!window.SupabaseClient) {
            console.warn('Supabase not available, request not persisted');
            return request;
        }

        try {
            // Convert to snake_case for database
            const dbRecord = this._toSnakeCase(request);

            const { data: created, error } = await window.SupabaseClient
                .from(this.tableName)
                .insert(dbRecord)
                .select()
                .single();

            if (error) throw error;

            return this._toCamelCase(created);
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
        if (!window.SupabaseClient) {
            console.warn('Supabase not available, update not persisted');
            return { id, ...updates };
        }

        try {
            const updateData = {
                ...updates,
                updated: new Date().toISOString()
            };

            // Convert to snake_case for database
            const dbRecord = this._toSnakeCase(updateData);

            const { data, error } = await window.SupabaseClient
                .from(this.tableName)
                .update(dbRecord)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return this._toCamelCase(data);
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
        if (!window.SupabaseClient) {
            console.warn('Supabase not available, delete not persisted');
            return;
        }

        try {
            const { error } = await window.SupabaseClient
                .from(this.tableName)
                .delete()
                .eq('id', id);

            if (error) throw error;
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
        if (!window.SupabaseClient) {
            console.warn('Supabase not available, real-time sync disabled');
            callback(this._getSampleData());
            return () => { };
        }

        // Clean up existing subscription
        if (this.realtimeChannel) {
            window.SupabaseClient.removeChannel(this.realtimeChannel);
        }

        // Create new subscription
        this.realtimeChannel = window.SupabaseClient
            .channel('requests-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: this.tableName
                },
                async (payload) => {
                    console.log('Realtime update received:', payload);
                    // Fetch fresh data on any change
                    const requests = await this.getAll();
                    callback(requests);
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        // Initial data load
        this.getAll().then(requests => callback(requests));

        // Return unsubscribe function
        return () => {
            if (this.realtimeChannel) {
                window.SupabaseClient.removeChannel(this.realtimeChannel);
                this.realtimeChannel = null;
            }
        };
    },

    /**
     * Initialize sample data in Supabase (if empty)
     * @returns {Promise<void>}
     */
    async initializeSampleData() {
        if (!window.SupabaseClient) return;

        try {
            const { data, error } = await window.SupabaseClient
                .from(this.tableName)
                .select('id')
                .limit(1);

            if (error) throw error;

            // Only add sample data if table is empty
            if (!data || data.length === 0) {
                console.log('Initializing sample data in Supabase...');
                const sampleData = this._getSampleData().map(record => this._toSnakeCase(record));

                const { error: insertError } = await window.SupabaseClient
                    .from(this.tableName)
                    .insert(sampleData);

                if (insertError) throw insertError;

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

        if (!window.SupabaseClient) {
            return `${prefix}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        }

        try {
            // Get the highest existing ID for this year
            const { data, error } = await window.SupabaseClient
                .from(this.tableName)
                .select('id')
                .like('id', `${prefix}%`)
                .order('id', { ascending: false })
                .limit(1);

            if (error) throw error;

            let nextNum = 1;
            if (data && data.length > 0) {
                const lastId = data[0].id;
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
