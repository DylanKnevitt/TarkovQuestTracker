-- SQL Migration: User Comparison Support
-- Purpose: Enable fetching user profiles with quest progress statistics
-- Feature: 002-user-quest-comparison

-- Note: This SQL should be run in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste this code > Run

-- Create a function to get all user profiles with quest stats
-- This function runs with security definer privileges to access auth.users
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_stats()
RETURNS TABLE (
  id UUID,
  email TEXT,
  total_quests BIGINT,
  completed_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COUNT(*) as total_quests,
    SUM(CASE WHEN qp.completed THEN 1 ELSE 0 END) as completed_count
  FROM auth.users u
  INNER JOIN public.quest_progress qp ON qp.user_id = u.id
  GROUP BY u.id, u.email
  HAVING COUNT(*) > 0
  ORDER BY completed_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profiles_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profiles_with_stats() TO anon;

-- Test the function (uncomment to test)
-- SELECT * FROM get_user_profiles_with_stats();
