-- =====================================================================
-- BOFLAN PLATFORM - SUPABASE DATABASE SETUP SCHEMA
-- =====================================================================
-- Copy and execute the following SQL script inside the Supabase SQL Editor
-- (https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new)
-- to instantly set up your tables, security policies, and storage buckets!

-- OPTIONAL CLEAN SLATE RESET:
-- If you have conflict errors or want to start fresh (deletes existing mock/live data):
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.portfolio CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.group_posts CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create User Profiles Table (Unified Profile Store)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    wallet_address TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    wallet_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Groups Table (Premium Community Channels)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    price_usd NUMERIC DEFAULT 0,
    price_eth VARCHAR(255) DEFAULT '0',
    max_members INT DEFAULT 100,
    tags TEXT[],
    premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Group Members Table (Tracks active joinees)
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 5. Create Group Posts Table (Crypto signals, buy/sell recommendations)
CREATE TABLE IF NOT EXISTS public.group_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type VARCHAR(50) DEFAULT 'general', -- 'signal' or 'general'
    coin_symbol VARCHAR(50),
    direction VARCHAR(50), -- 'LONG' or 'SHORT'
    entry_price NUMERIC,
    target_price NUMERIC,
    stop_loss NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Payments Table (Access registrations & subscription earnings)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    amount_usd NUMERIC NOT NULL,
    amount_eth NUMERIC,
    tx_hash TEXT,
    status VARCHAR(50) DEFAULT 'success', -- 'pending' or 'success'
    platform_fee NUMERIC DEFAULT 0,
    creator_payout NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Portfolio Table (Holds simulated coin asset stats)
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    coin_symbol VARCHAR(50) NOT NULL,
    coin_name VARCHAR(255),
    amount NUMERIC NOT NULL DEFAULT 0,
    avg_buy_price NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Global Feed Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    coin VARCHAR(50),
    coin_name VARCHAR(255),
    direction VARCHAR(50),
    target VARCHAR(255),
    timeframe VARCHAR(255),
    text TEXT,
    chart_data JSONB DEFAULT '[]'::jsonb,
    images TEXT[] DEFAULT '{}',
    current_price VARCHAR(255),
    price_change VARCHAR(255),
    positive BOOLEAN,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    reposts INT DEFAULT 0,
    accuracy VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    type VARCHAR(50),
    text TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS) policies on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

-- 11. Create easy-access default security policies (SELECT all, update by authenticated self/anon fallback)
DROP POLICY IF EXISTS "Allow All Select user_profiles" ON public.user_profiles;
CREATE POLICY "Allow All Select user_profiles" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update user_profiles" ON public.user_profiles;
CREATE POLICY "Allow All Insert/Update user_profiles" ON public.user_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Select groups" ON public.groups;
CREATE POLICY "Allow All Select groups" ON public.groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update groups" ON public.groups;
CREATE POLICY "Allow All Insert/Update groups" ON public.groups FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Select group_members" ON public.group_members;
CREATE POLICY "Allow All Select group_members" ON public.group_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update group_members" ON public.group_members;
CREATE POLICY "Allow All Insert/Update group_members" ON public.group_members FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Select group_posts" ON public.group_posts;
CREATE POLICY "Allow All Select group_posts" ON public.group_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update group_posts" ON public.group_posts;
CREATE POLICY "Allow All Insert/Update group_posts" ON public.group_posts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Select posts" ON public.posts;
CREATE POLICY "Allow All Select posts" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update posts" ON public.posts;
CREATE POLICY "Allow All Insert/Update posts" ON public.posts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Select notifications" ON public.notifications;
CREATE POLICY "Allow All Select notifications" ON public.notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update notifications" ON public.notifications;
CREATE POLICY "Allow All Insert/Update notifications" ON public.notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Select payments" ON public.payments;
CREATE POLICY "Allow All Select payments" ON public.payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update payments" ON public.payments;
CREATE POLICY "Allow All Insert/Update payments" ON public.payments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All Select portfolio" ON public.portfolio;
CREATE POLICY "Allow All Select portfolio" ON public.portfolio FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update portfolio" ON public.portfolio;
CREATE POLICY "Allow All Insert/Update portfolio" ON public.portfolio FOR ALL USING (true);

-- 12. Automatically provision the storage bucket for image uploads
-- You can run the commands below or manually create a public bucket named 'post-images' in the dashboard.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Row Level Security (RLS) policies for image file uploading and reading
DROP POLICY IF EXISTS "Aesthetic Public Image Read" ON storage.objects;
CREATE POLICY "Aesthetic Public Image Read" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
DROP POLICY IF EXISTS "Aesthetic Public Image Insert" ON storage.objects;
CREATE POLICY "Aesthetic Public Image Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images');
DROP POLICY IF EXISTS "Aesthetic Public Image Modify" ON storage.objects;
CREATE POLICY "Aesthetic Public Image Modify" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'post-images');

-- 13. Create Chat Messages Table for Group Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    username VARCHAR(255),
    avatar VARCHAR(255),
    text TEXT NOT NULL,
    is_guest BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) DEFAULT 'text',
    signal_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Select chat_messages" ON public.chat_messages;
CREATE POLICY "Allow All Select chat_messages" ON public.chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Insert/Update chat_messages" ON public.chat_messages;
CREATE POLICY "Allow All Insert/Update chat_messages" ON public.chat_messages FOR ALL USING (true);
