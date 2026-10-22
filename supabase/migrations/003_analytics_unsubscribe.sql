-- ============================================================
-- Migration 003: Analytics + Unsubscribe
-- Run this in your Supabase SQL editor
-- ============================================================

-- Add unsubscribe fields to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- RPC: increment listing views atomically
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: increment blog post views atomically
CREATE OR REPLACE FUNCTION increment_blog_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for faster lead lookups by email (unsubscribe uses this)
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Index for nurture queue processing
CREATE INDEX IF NOT EXISTS idx_nurture_queue_status_scheduled
  ON nurture_queue(status, scheduled_for)
  WHERE status = 'pending';
