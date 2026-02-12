/**
 * Supabase Configuration - Mission Possible Travel
 * Keys are loaded from runtime config (meta tags / server injection).
 */

// Read config from runtime loader
const _supaConfig = window.AppConfig ? window.AppConfig.supabase() : {};
const SUPABASE_URL = _supaConfig.url || '';
const SUPABASE_ANON_KEY = _supaConfig.anonKey || '';

// Initialize Supabase Client
let supabaseClient = null;

try {
    // Check if Supabase SDK is loaded (the CDN exposes window.supabase.createClient)
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.warn('Supabase config missing — check meta tags or AppConfig. Running in demo mode.');
        } else {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
        }
    } else {
        console.warn('Supabase SDK not loaded - running in demo mode');
    }
} catch (error) {
    console.error('Supabase initialization error:', error);
}

// Export for use in other modules
window.SupabaseClient = supabaseClient;
