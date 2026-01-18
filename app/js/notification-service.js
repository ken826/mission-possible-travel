/**
 * Mission Possible Travel - Notification Service
 * Firestore-backed notification system with real-time updates
 */

const NotificationService = {
    collectionName: 'notifications',
    unsubscribe: null,

    /**
     * Create a new notification
     * @param {Object} notification - Notification data
     * @returns {Promise<string>} - Notification ID
     */
    async create(notification) {
        if (!window.FirebaseDB) {
            console.warn('Firestore not available for notifications');
            return null;
        }

        try {
            const docRef = await window.FirebaseDB
                .collection(this.collectionName)
                .add({
                    ...notification,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            console.log('Notification created:', docRef.id);
            return docRef.id;
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
        if (!window.FirebaseDB) return [];

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: this.formatTime(doc.data().createdAt?.toDate())
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
        if (!window.FirebaseDB) {
            console.warn('Firestore not available for notification subscription');
            return () => { };
        }

        // Unsubscribe from previous listener
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        try {
            this.unsubscribe = window.FirebaseDB
                .collection(this.collectionName)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .onSnapshot(
                    (snapshot) => {
                        const notifications = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                            time: this.formatTime(doc.data().createdAt?.toDate())
                        }));
                        callback(notifications);
                    },
                    (error) => {
                        console.error('Notification subscription error:', error);
                        callback([]);
                    }
                );

            return this.unsubscribe;
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
        if (!window.FirebaseDB) return false;

        try {
            await window.FirebaseDB
                .collection(this.collectionName)
                .doc(notificationId)
                .update({ read: true });
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
        if (!window.FirebaseDB) return false;

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();

            const batch = window.FirebaseDB.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });

            await batch.commit();
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
        if (!window.FirebaseDB) return false;

        try {
            const snapshot = await window.FirebaseDB
                .collection(this.collectionName)
                .where('userId', '==', userId)
                .get();

            const batch = window.FirebaseDB.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
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
        if (!window.FirebaseDB) return false;

        try {
            await window.FirebaseDB
                .collection(this.collectionName)
                .doc(notificationId)
                .delete();
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
