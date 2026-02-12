/**
 * Firebase Configuration
 * Mission: Possible Travel - MHFA Australia
 * Keys are loaded from runtime config (meta tags / server injection).
 */

// Firebase configuration - loaded from runtime config
const firebaseConfig = window.AppConfig ? window.AppConfig.firebase() : {};

// Initialize Firebase
let app;
let db;

try {
    // Check if Firebase is loaded
    if (typeof firebase !== 'undefined') {
        // Validate config has required keys
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            console.warn('Firebase config missing — check meta tags or AppConfig. Running in demo mode.');
        } else {
            // Initialize Firebase App (if not already initialized)
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.apps[0];
            }

            // Initialize Firestore
            db = firebase.firestore();

            // Enable offline persistence for better UX
            db.enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Firestore persistence unavailable: Multiple tabs open');
                    } else if (err.code === 'unimplemented') {
                        console.warn('Firestore persistence unavailable: Browser not supported');
                    }
                });

            console.log('Firebase initialized successfully');
        }
    } else {
        console.warn('Firebase SDK not loaded - running in demo mode');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Export for use in other modules
window.FirebaseDB = db;
