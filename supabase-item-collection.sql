-- SQL Migration: Item Collection Sync Support
-- Purpose: Enable syncing item collection quantities per user
-- Feature: 003-item-tracker

-- Note: This SQL should be run in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste this code > Run

-- Create item_collection table
CREATE TABLE IF NOT EXISTS public.item_collection (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id VARCHAR(255) NOT NULL,
  collected_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_collection_user_id ON public.item_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_item_collection_item_id ON public.item_collection(item_id);

-- Enable Row Level Security
ALTER TABLE public.item_collection ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own item collection
CREATE POLICY "Users can view own item collection"
  ON public.item_collection
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own item collection
CREATE POLICY "Users can insert own item collection"
  ON public.item_collection
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own item collection
CREATE POLICY "Users can update own item collection"
  ON public.item_collection
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own item collection
CREATE POLICY "Users can delete own item collection"
  ON public.item_collection
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_item_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_item_collection_timestamp
  BEFORE UPDATE ON public.item_collection
  FOR EACH ROW
  EXECUTE FUNCTION update_item_collection_updated_at();

-- Grant permissions
GRANT ALL ON public.item_collection TO authenticated;

-- Test queries (uncomment to test)
-- SELECT * FROM item_collection WHERE user_id = auth.uid();
-- INSERT INTO item_collection (user_id, item_id, collected_quantity) VALUES (auth.uid(), 'test-item-1', 5);
