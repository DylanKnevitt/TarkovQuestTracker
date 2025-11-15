-- Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor (https://app.supabase.com/project/YOUR_PROJECT/sql)

-- Step 1: Create quest_progress table (if not exists)
CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id 
  ON public.quest_progress(user_id);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Users can view own quest progress" ON public.quest_progress;
DROP POLICY IF EXISTS "Users can insert own quest progress" ON public.quest_progress;
DROP POLICY IF EXISTS "Users can update own quest progress" ON public.quest_progress;
DROP POLICY IF EXISTS "Users can delete own quest progress" ON public.quest_progress;

-- Step 5: Create RLS Policies

-- Policy 1: Users can view their own quest progress
CREATE POLICY "Users can view own quest progress"
  ON public.quest_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own quest progress
CREATE POLICY "Users can insert own quest progress"
  ON public.quest_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own quest progress
CREATE POLICY "Users can update own quest progress"
  ON public.quest_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own quest progress
CREATE POLICY "Users can delete own quest progress"
  ON public.quest_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.quest_progress TO authenticated;
GRANT SELECT ON public.quest_progress TO anon;

-- Verification query - run this after setup to confirm
-- SELECT * FROM pg_policies WHERE tablename = 'quest_progress';
