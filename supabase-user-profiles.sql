-- User Profiles Table
-- Purpose: Store user-specific settings including current level
-- Run this SQL in your Supabase SQL Editor (https://app.supabase.com/project/YOUR_PROJECT/sql)

-- Step 1: Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 79),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
  ON public.user_profiles(user_id);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;

-- Step 5: Create RLS Policies

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Verification queries (uncomment to test):
-- SELECT * FROM public.user_profiles;
-- SELECT tablename, policyname FROM pg_policies WHERE tablename = 'user_profiles';
