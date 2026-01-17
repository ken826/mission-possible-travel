/**
 * Firebase Configuration
 * Mission: Possible Travel - MHFA Australia
 */

// Firebase configuration - using CDN loaded Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDL-8VdUKdxNFHZDb4EZpC65gUPT95613g",
    authDomain: "mission-possible-travel.firebaseapp.com",
    projectId: "mission-possible-travel",
    storageBucket: "mission-possible-travel.firebasestorage.app",
    messagingSenderId: "916557832414",
    appId: "1:916557832414:web:9b1b1c4ffbef4bb12b224f",
    measurementId: "G-85CBJSBJ25"
};

// Initialize Firebase
let app;
let db;

try {
    // Check if Firebase is loaded
    if (typeof firebase !== 'undefined') {
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
    } else {
        console.warn('Firebase SDK not loaded - running in demo mode');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Export for use in other modules
window.FirebaseDB = db;
