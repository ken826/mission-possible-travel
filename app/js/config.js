/**
 * Mission Possible Travel - Runtime Configuration Loader
 * Reads config from meta tags or window globals (set server-side).
 * NEVER hardcode API keys in source files.
 */

const AppConfig = {
    /**
     * Read a config value from (in priority order):
     * 1. window.__APP_CONFIG__[key]   (server-side injection)
     * 2. <meta name="config:{key}">   (meta tag in HTML)
     * Returns empty string if not found.
     */
    get(key) {
        // 1. Global config object (e.g. injected by Vercel edge middleware)
        if (window.__APP_CONFIG__ && window.__APP_CONFIG__[key]) {
            return window.__APP_CONFIG__[key];
        }

        // 2. Meta tag
        const meta = document.querySelector(`meta[name="config:${key}"]`);
        if (meta) {
            return meta.getAttribute('content') || '';
        }

        console.warn(`AppConfig: missing config key "${key}"`);
        return '';
    },

    firebase() {
        return {
            apiKey: this.get('firebase-api-key'),
            authDomain: this.get('firebase-auth-domain'),
            projectId: this.get('firebase-project-id'),
            storageBucket: this.get('firebase-storage-bucket'),
            messagingSenderId: this.get('firebase-messaging-sender-id'),
            appId: this.get('firebase-app-id'),
            measurementId: this.get('firebase-measurement-id')
        };
    },

    supabase() {
        return {
            url: this.get('supabase-url'),
            anonKey: this.get('supabase-anon-key')
        };
    }
};

window.AppConfig = AppConfig;
