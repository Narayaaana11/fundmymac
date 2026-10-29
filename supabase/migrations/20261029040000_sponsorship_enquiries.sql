-- =========================================================================
-- Fund My Mac: Migration 20261029040000_sponsorship_enquiries.sql
-- Description: Sponsorship Enquiries & Public Preview Waitlist Table
-- Target: Safe, idempotent creation with Row Level Security (RLS)
-- Security:
--   - Public (anon) can INSERT valid enquiries (strict regex & length checks)
--   - Public (anon) CANNOT read (SELECT) any enquiries (zero PII exposure)
--   - Only service_role can read/manage enquiries
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.sponsorship_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    preferred_spot_id INTEGER REFERENCES public.brand_spots(id) ON DELETE SET NULL,
    tier_id TEXT,
    website_url TEXT,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT valid_enquiry_name CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 120),
    CONSTRAINT valid_enquiry_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND char_length(email) <= 255),
    CONSTRAINT valid_enquiry_url CHECK (website_url IS NULL OR char_length(website_url) <= 300),
    CONSTRAINT valid_enquiry_message CHECK (message IS NULL OR char_length(message) <= 2000)
);

-- Index on created_at and email
CREATE INDEX IF NOT EXISTS idx_sponsorship_enquiries_created_at ON public.sponsorship_enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsorship_enquiries_email ON public.sponsorship_enquiries(email);

-- Enable Row Level Security
ALTER TABLE public.sponsorship_enquiries ENABLE ROW LEVEL SECURITY;

-- 1. Anonymous / Public users can INSERT their own enquiry
DROP POLICY IF EXISTS "anon_can_insert_enquiry" ON public.sponsorship_enquiries;
CREATE POLICY "anon_can_insert_enquiry"
    ON public.sponsorship_enquiries
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        char_length(trim(name)) >= 1 AND
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    );

-- 2. Service role has full management access
DROP POLICY IF EXISTS "service_role_all_enquiries" ON public.sponsorship_enquiries;
CREATE POLICY "service_role_all_enquiries"
    ON public.sponsorship_enquiries
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure anon and authenticated cannot SELECT, UPDATE, or DELETE (explicit denial / no policy for SELECT)
REVOKE SELECT, UPDATE, DELETE ON public.sponsorship_enquiries FROM anon, authenticated;
GRANT INSERT ON public.sponsorship_enquiries TO anon, authenticated;
GRANT ALL ON public.sponsorship_enquiries TO service_role;
