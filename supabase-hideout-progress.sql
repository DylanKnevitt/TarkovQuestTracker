-- Feature 004: Hideout Progress Tracking
-- Database migration for hideout module build status sync
-- Run this in Supabase SQL Editor after supabase-item-collection.sql

-- Create hideout_progress table
CREATE TABLE IF NOT EXISTS hideout_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 4),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, station_id, level)
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_hideout_progress_user 
ON hideout_progress(user_id);

-- Create index for station lookups
CREATE INDEX IF NOT EXISTS idx_hideout_progress_station 
ON hideout_progress(station_id, level);

-- Enable Row Level Security
ALTER TABLE hideout_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own hideout progress" ON hideout_progress;
DROP POLICY IF EXISTS "Users can insert own hideout progress" ON hideout_progress;
DROP POLICY IF EXISTS "Users can update own hideout progress" ON hideout_progress;
DROP POLICY IF EXISTS "Users can delete own hideout progress" ON hideout_progress;

-- RLS Policy: Users can view their own hideout progress
CREATE POLICY "Users can view own hideout progress"
ON hideout_progress FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own hideout progress
CREATE POLICY "Users can insert own hideout progress"
ON hideout_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own hideout progress
CREATE POLICY "Users can update own hideout progress"
ON hideout_progress FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own hideout progress
CREATE POLICY "Users can delete own hideout progress"
ON hideout_progress FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger function for updating updated_at timestamp
-- (Reuse existing function if already created for other tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_hideout_progress_updated_at ON hideout_progress;
CREATE TRIGGER update_hideout_progress_updated_at
    BEFORE UPDATE ON hideout_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users
GRANT ALL ON hideout_progress TO authenticated;

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE 'Hideout Progress table created successfully!';
    RAISE NOTICE 'RLS policies enabled for authenticated users';
    RAISE NOTICE 'Ready to sync hideout progress across devices';
END $$;
