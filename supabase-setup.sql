-- ============================================
-- Mission Possible Travel - Supabase Setup SQL
-- Run this in your Supabase SQL Editor
-- Project: mnwxsjgtcztfykbokfrz
-- ============================================

-- =====================
-- 1. USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'EMPLOYEE',
    status TEXT NOT NULL DEFAULT 'active',
    company TEXT,
    created TEXT,
    avatar TEXT
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for demo app - tighten for production)
CREATE POLICY "Allow anonymous read access on users"
    ON users FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anonymous insert on users"
    ON users FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update on users"
    ON users FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on users"
    ON users FOR DELETE
    TO anon
    USING (true);

-- Enable realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- =====================
-- 2. REQUESTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    title TEXT,
    requester TEXT,
    requester_email TEXT,
    destination TEXT,
    origin TEXT,
    location TEXT,
    dates TEXT,
    attendees INTEGER,
    travellers INTEGER,
    estimate NUMERIC(10,2),
    actual_cost NUMERIC(10,2),
    cost_centre TEXT,
    directorate TEXT,
    purpose TEXT,
    preferences TEXT,
    notes TEXT,
    dietary TEXT,
    instructions TEXT,
    meal_type TEXT,
    event_name TEXT,
    event_date TEXT,
    event_time TEXT,
    approved_by TEXT,
    approved_date TEXT,
    vendor_notes TEXT,
    booking_ref TEXT,
    invoice_number TEXT,
    created TEXT,
    updated TEXT
);

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for demo app)
CREATE POLICY "Allow anonymous read access on requests"
    ON requests FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anonymous insert on requests"
    ON requests FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update on requests"
    ON requests FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on requests"
    ON requests FOR DELETE
    TO anon
    USING (true);

-- Enable realtime for requests table
ALTER PUBLICATION supabase_realtime ADD TABLE requests;

-- =====================
-- 3. NOTIFICATIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    request_id TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for demo app)
CREATE POLICY "Allow anonymous read access on notifications"
    ON notifications FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anonymous insert on notifications"
    ON notifications FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update on notifications"
    ON notifications FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on notifications"
    ON notifications FOR DELETE
    TO anon
    USING (true);

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================
-- 4. SEED DATA - SAMPLE REQUESTS
-- =====================
INSERT INTO requests (id, type, status, title, requester, requester_email, destination, location, attendees, dates, estimate, created, updated)
VALUES
    ('REQ-2026-001', 'TRAVEL', 'AWAITING_APPROVAL', 'Sydney Conference - Feb 2026', 'Sarah', 'sarah@mhfa.com.au', 'Sydney', NULL, NULL, '10-12 Feb 2026', 1850.00, '2026-01-14T00:00:00.000Z', '2026-01-14T00:00:00.000Z'),
    ('REQ-2026-002', 'CATERING', 'SUBMITTED', 'Team Planning Day Lunch', 'Michael', 'michael@mhfa.com.au', NULL, 'MHFA Office', 25, NULL, 625.00, '2026-01-15T00:00:00.000Z', '2026-01-15T00:00:00.000Z'),
    ('REQ-2026-003', 'TRAVEL', 'QUOTING', 'Perth Training Delivery', 'Emma', 'emma@mhfa.com.au', 'Perth', NULL, NULL, '20-22 Feb 2026', 2400.00, '2026-01-12T00:00:00.000Z', '2026-01-12T00:00:00.000Z'),
    ('REQ-2026-004', 'TRAVEL', 'BOOKED', 'Brisbane Workshop', 'James', 'james@mhfa.com.au', 'Brisbane', NULL, NULL, '5-6 Feb 2026', 980.00, '2026-01-08T00:00:00.000Z', '2026-01-08T00:00:00.000Z'),
    ('REQ-2026-005', 'CATERING', 'APPROVED', 'Board Meeting Catering', 'Amanda', 'amanda@mhfa.com.au', NULL, 'Board Room', 12, NULL, 360.00, '2026-01-13T00:00:00.000Z', '2026-01-13T00:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- NOTE: Users are auto-seeded by the app on first load.
-- The app's UserStore.init() will detect an empty users
-- table and insert the default demo users automatically.
-- =====================
