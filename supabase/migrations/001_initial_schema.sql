-- ============================================================================
-- Tarkov Quest Tracker - Initial Database Schema
-- ============================================================================
-- Feature: 001-vercel-supabase-deployment
-- Date: 2025-11-15
-- Description: Creates quest_progress table with RLS policies for multi-user
--              quest tracking with cloud sync
-- ============================================================================

-- ============================================================================
-- TABLE: quest_progress
-- ============================================================================
-- Purpose: Store user quest completion status with timestamps for sync
-- Composite Primary Key: (user_id, quest_id) - one record per user per quest
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Purpose: Optimize queries for user-specific lookups and sync operations
-- ============================================================================

-- Index for fast user-specific queries (get all progress for a user)
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id 
  ON public.quest_progress(user_id);

-- Index for timestamp-based sync queries (get updates since last sync)
CREATE INDEX IF NOT EXISTS idx_quest_progress_updated_at 
  ON public.quest_progress(updated_at);

-- ============================================================================
-- TRIGGER FUNCTION: update_updated_at
-- ============================================================================
-- Purpose: Automatically update the updated_at timestamp on every UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: quest_progress_updated_at
-- ============================================================================
-- Purpose: Call update_updated_at() function before every UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS quest_progress_updated_at ON public.quest_progress;

CREATE TRIGGER quest_progress_updated_at
  BEFORE UPDATE ON public.quest_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Purpose: Ensure users can only access their own quest progress
-- ============================================================================

-- Enable RLS on quest_progress table
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICY: Users can view own quest progress
-- ============================================================================
-- Purpose: Allow SELECT queries only for authenticated user's own data
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own quest progress" ON public.quest_progress;

CREATE POLICY "Users can view own quest progress"
  ON public.quest_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICY: Users can insert own quest progress
-- ============================================================================
-- Purpose: Allow INSERT queries only with authenticated user's ID
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own quest progress" ON public.quest_progress;

CREATE POLICY "Users can insert own quest progress"
  ON public.quest_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICY: Users can update own quest progress
-- ============================================================================
-- Purpose: Allow UPDATE queries only for authenticated user's own data
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own quest progress" ON public.quest_progress;

CREATE POLICY "Users can update own quest progress"
  ON public.quest_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICY: Users can delete own quest progress
-- ============================================================================
-- Purpose: Allow DELETE queries only for authenticated user's own data
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own quest progress" ON public.quest_progress;

CREATE POLICY "Users can delete own quest progress"
  ON public.quest_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Uncomment and run these queries to verify the migration succeeded:
--
-- -- 1. Verify table exists with correct columns
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'quest_progress'
-- ORDER BY ordinal_position;
--
-- -- 2. Verify indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'quest_progress';
--
-- -- 3. Verify RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'quest_progress';
--
-- -- 4. Verify RLS policies exist
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'quest_progress';
--
-- -- 5. Verify trigger exists
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table = 'quest_progress';
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Copy Supabase URL and anon key from Project Settings > API
-- 2. Add to Vercel environment variables:
--    - VITE_SUPABASE_URL
--    - VITE_SUPABASE_ANON_KEY
-- 3. Test authentication by creating a test user
-- 4. Test RLS by querying data as different users
-- ============================================================================
