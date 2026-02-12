/**
 * Mission Possible Travel - Notification Service
 * Supabase-backed notification system with real-time updates
 */

const NotificationService = {
    tableName: 'notifications',
    realtimeChannel: null,

    /**
     * Create a new notification
     * @param {Object} notification - Notification data
     * @returns {Promise<string>} - Notification ID
     */
    async create(notification) {
        if (!window.SupabaseClient) {
            console.warn('Supabase not available for notifications');
            return null;
        }

        try {
            // Build database record with snake_case columns only
            const dbRecord = {
                user_id: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                request_id: notification.requestId || null,
                read: false,
                created_at: new Date().toISOString()
            };

            const { data, error } = await window.SupabaseClient
                .from(this.tableName)
                .insert(dbRecord)
                .select()
                .single();

            if (error) throw error;

            console.log('Notification created:', data.id);
            return data.id;
        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    },

    /**
     * Get notifications for a specific user
     * @param {string} userId - User ID or email
     * @returns {Promise<Array>} - Array of notifications
     */
    async getForUser(userId) {
        if (!window.SupabaseClient) return [];

        try {
            const { data, error } = await window.SupabaseClient
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            return (data || []).map(doc => ({
                id: doc.id,
                userId: doc.user_id,
                type: doc.type,
                title: doc.title,
                message: doc.message,
                requestId: doc.request_id,
                read: doc.read,
                time: this.formatTime(new Date(doc.created_at))
            }));
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    },

    /**
     * Subscribe to real-time notification updates for a user
     * @param {string} userId - User ID or email
     * @param {Function} callback - Callback with notifications array
     */
    subscribeToUserNotifications(userId, callback) {
        if (!window.SupabaseClient) {
            console.warn('Supabase not available for notification subscription');
            return () => { };
        }

        // Unsubscribe from previous listener
        if (this.realtimeChannel) {
            window.SupabaseClient.removeChannel(this.realtimeChannel);
        }

        try {
            this.realtimeChannel = window.SupabaseClient
                .channel(`notifications-${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: this.tableName,
                        filter: `user_id=eq.${userId}`
                    },
                    async (payload) => {
                        console.log('Notification update received:', payload);
                        const notifications = await this.getForUser(userId);
                        callback(notifications);
                    }
                )
                .subscribe((status) => {
                    console.log('Notification subscription status:', status);
                });

            // Initial data load
            this.getForUser(userId).then(notifications => callback(notifications));

            return () => {
                if (this.realtimeChannel) {
                    window.SupabaseClient.removeChannel(this.realtimeChannel);
                    this.realtimeChannel = null;
                }
            };
        } catch (error) {
            console.error('Error setting up notification subscription:', error);
            return () => { };
        }
    },

    /**
     * Mark a notification as read
     * @param {string} notificationId - Notification document ID
     */
    async markRead(notificationId) {
        if (!window.SupabaseClient) return false;

        try {
            const { error } = await window.SupabaseClient
                .from(this.tableName)
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking notification read:', error);
            return false;
        }
    },

    /**
     * Mark all notifications as read for a user
     * @param {string} userId - User ID or email
     */
    async markAllRead(userId) {
        if (!window.SupabaseClient) return false;

        try {
            const { error } = await window.SupabaseClient
                .from(this.tableName)
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking all notifications read:', error);
            return false;
        }
    },

    /**
     * Clear all notifications for a user
     * @param {string} userId - User ID or email
     */
    async clearAll(userId) {
        if (!window.SupabaseClient) return false;

        try {
            const { error } = await window.SupabaseClient
                .from(this.tableName)
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error clearing notifications:', error);
            return false;
        }
    },

    /**
     * Delete a single notification
     * @param {string} notificationId - Notification document ID
     */
    async delete(notificationId) {
        if (!window.SupabaseClient) return false;

        try {
            const { error } = await window.SupabaseClient
                .from(this.tableName)
                .delete()
                .eq('id', notificationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting notification:', error);
            return false;
        }
    },

    /**
     * Format timestamp to relative time
     * @param {Date} date - Date object
     * @returns {string} - Formatted time string
     */
    formatTime(date) {
        if (!date) return 'Just now';

        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

        return date.toLocaleDateString();
    },

    /**
     * Helper to create notification for specific events
     */
    helpers: {
        /**
         * Notify when a new request is submitted
         */
        async requestSubmitted(request, coordinatorEmails) {
            for (const email of coordinatorEmails) {
                await NotificationService.create({
                    userId: email,
                    type: 'action',
                    title: 'New Request Submitted',
                    message: `${request.requester} submitted a new ${request.type.toLowerCase()} request: ${request.title}`,
                    requestId: request.id
                });
            }
        },

        /**
         * Notify when a request is approved
         */
        async requestApproved(request, requesterEmail, approverName) {
            await NotificationService.create({
                userId: requesterEmail,
                type: 'approval',
                title: 'Request Approved',
                message: `Your request "${request.title}" has been approved by ${approverName}`,
                requestId: request.id
            });
        },

        /**
         * Notify when a request is rejected
         */
        async requestRejected(request, requesterEmail, rejectorName, reason) {
            await NotificationService.create({
                userId: requesterEmail,
                type: 'update',
                title: 'Request Rejected',
                message: `Your request "${request.title}" was rejected by ${rejectorName}${reason ? ': ' + reason : ''}`,
                requestId: request.id
            });
        },

        /**
         * Notify when request status changes
         */
        async statusChanged(request, recipientEmail, newStatus) {
            const statusNames = {
                'SUBMITTED': 'Submitted',
                'TRIAGE': 'Under Triage',
                'AWAITING_APPROVAL': 'Awaiting Approval',
                'APPROVED': 'Approved',
                'QUOTING': 'Quoting in Progress',
                'BOOKED': 'Booked',
                'CLOSED': 'Closed'
            };

            await NotificationService.create({
                userId: recipientEmail,
                type: 'update',
                title: 'Request Status Updated',
                message: `Request "${request.title}" is now ${statusNames[newStatus] || newStatus}`,
                requestId: request.id
            });
        }
    }
};

// Make service available globally
window.NotificationService = NotificationService;
