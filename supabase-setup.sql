-- =========================================================================
-- Fund My Mac / Brand My Mac Realtime Database Schema (Supabase SQL Editor)
-- Copy and run this in: https://supabase.com/dashboard/project/lavydeusonwqjrlhtqzv/sql/new
-- =========================================================================

-- 1. Create the site_stats table for real visitor tracking
CREATE TABLE IF NOT EXISTS public.site_stats (
    id SERIAL PRIMARY KEY,
    views BIGINT NOT NULL DEFAULT 140548,
    x_views BIGINT NOT NULL DEFAULT 13000000,
    spots_sold INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial milestone row (if not already present)
INSERT INTO public.site_stats (id, views, x_views, spots_sold)
VALUES (1, 140548, 13000000, 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Create brand_spots table to store real claimed sponsors & logos
CREATE TABLE IF NOT EXISTS public.brand_spots (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'standard',
    view_type TEXT NOT NULL DEFAULT 'lid', -- 'lid' | 'inside' | 'accessory'
    is_sold BOOLEAN NOT NULL DEFAULT false,
    sponsor_name TEXT,
    sponsor_url TEXT,
    logo_url TEXT,
    top_bid_usd INT NOT NULL DEFAULT 0,
    top_bid_eur INT NOT NULL DEFAULT 0,
    bid_count INT NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ
);

-- Seed initial 20 spots if not already created
INSERT INTO public.brand_spots (id, name, category, view_type, top_bid_usd, top_bid_eur)
VALUES
(1, 'Spot #1 (Top-Left Anchor)', 'standard', 'lid', 100, 90),
(2, 'Spot #2 (Top-Right Anchor)', 'standard', 'lid', 100, 90),
(3, 'Spot #3 (Apple Core Hero)', 'apple_adjacent', 'lid', 500, 460),
(4, 'Spot #4 (Center Orbit)', 'standard', 'lid', 100, 90),
(5, 'Spot #5 (Center Orbit West)', 'standard', 'lid', 100, 90),
(6, 'Spot #6 (Center Orbit East)', 'standard', 'lid', 100, 90),
(7, 'Spot #7 (Lower Left Wing)', 'standard', 'lid', 100, 90),
(8, 'Spot #8 (Lower Right Wing)', 'standard', 'lid', 100, 90),
(9, 'Spot #9 (South-West Corner)', 'corner', 'lid', 100, 90),
(10, 'Spot #10 (The Founder Corner)', 'corner', 'lid', 100, 90),
(11, 'Inside #11 (Left Palm Outer Top)', 'inside_standard', 'inside', 100, 90),
(12, 'Inside #12 (Left Palm Inner Top)', 'inside_standard', 'inside', 100, 90),
(13, 'Inside #13 (Left Palm Outer Btm)', 'inside_standard', 'inside', 100, 90),
(14, 'Inside #14 (Left Palm Inner Btm)', 'inside_standard', 'inside', 100, 90),
(15, 'Inside #15 (Right Palm Inner Top)', 'inside_standard', 'inside', 100, 90),
(16, 'Inside #16 (Right Palm Outer Top)', 'inside_standard', 'inside', 100, 90),
(17, 'Inside #17 (Right Palm Inner Btm)', 'inside_standard', 'inside', 100, 90),
(18, 'Inside #18 (Right Palm Outer Btm)', 'inside_standard', 'inside', 100, 90),
(19, 'Spot #19 (140W Fast Charger)', 'accessory', 'accessory', 100, 90),
(20, 'Spot #20 (Magic Mouse Badge)', 'accessory', 'accessory', 100, 90)
ON CONFLICT (id) DO NOTHING;

-- 3. Create donations table to track real backer pledges
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount_usd NUMERIC(10, 2) NOT NULL,
    amount_eur NUMERIC(10, 2) NOT NULL,
    tier_name TEXT,
    backer_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Supabase Realtime WebSocket broadcast on all three tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_spots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;

-- 5. Enable Row Level Security (RLS) & Grant Access
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on site_stats"
ON public.site_stats FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read on brand_spots"
ON public.brand_spots FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public update on brand_spots"
ON public.brand_spots FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow public read on donations"
ON public.donations FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert on donations"
ON public.donations FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 6. Atomic function to record each real visitor without fake loops
CREATE OR REPLACE FUNCTION public.record_view()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_views BIGINT;
BEGIN
    UPDATE public.site_stats
    SET views = views + 1,
        updated_at = NOW()
    WHERE id = 1
    RETURNING views INTO new_views;

    RETURN new_views;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_view() TO anon, authenticated;
