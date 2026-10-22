-- ============================================================
-- DOMAINE PRO — Automation Tables Migration
-- Run this AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- NURTURE SEQUENCES (templates admin creates)
-- ============================================================
CREATE TABLE nurture_sequences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'on_lead' | 'on_cold' | 'on_warm'
  target_lead_score TEXT, -- 'hot' | 'warm' | 'cold' | 'all'
  steps_count INTEGER NOT NULL DEFAULT 5,
  delay_days INTEGER[] NOT NULL DEFAULT '{1, 7, 14, 30, 60}', -- days between steps
  context TEXT, -- extra context for AI generation
  is_active BOOLEAN DEFAULT true,
  total_enrolled INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NURTURE QUEUE (scheduled email jobs)
-- ============================================================
CREATE TABLE nurture_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sequence_id UUID REFERENCES nurture_sequences(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  step_number INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'skipped' | 'cancelled'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, lead_id, step_number)
);

-- ============================================================
-- NURTURE ENROLLMENTS (track which leads are in which sequence)
-- ============================================================
CREATE TABLE nurture_enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sequence_id UUID REFERENCES nurture_sequences(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'cancelled' | 'unsubscribed'
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(sequence_id, lead_id)
);

-- ============================================================
-- LISTING LEAD MATCHES (property match engine results)
-- ============================================================
CREATE TABLE listing_lead_matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 0,
  match_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'notified' | 'dismissed'
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, lead_id)
);

-- ============================================================
-- AUTOMATION LOG (audit trail of all automations run)
-- ============================================================
CREATE TABLE automation_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  automation_type TEXT NOT NULL, -- 'lead_alert' | 'nurture' | 'match_engine' | 'market_report' | 'content_suite'
  status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed' | 'partial'
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GENERATED CONTENT (listing content suite cache)
-- ============================================================
CREATE TABLE generated_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  description TEXT,
  instagram_caption TEXT,
  facebook_post TEXT,
  email_newsletter TEXT,
  meta_description TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  regenerated_count INTEGER DEFAULT 0
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_nurture_queue_status ON nurture_queue(status);
CREATE INDEX idx_nurture_queue_scheduled ON nurture_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_nurture_queue_lead ON nurture_queue(lead_id);
CREATE INDEX idx_listing_lead_matches_listing ON listing_lead_matches(listing_id);
CREATE INDEX idx_listing_lead_matches_status ON listing_lead_matches(status);
CREATE INDEX idx_automation_logs_type ON automation_logs(automation_type);
CREATE INDEX idx_automation_logs_created ON automation_logs(created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE nurture_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_lead_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Admins only for all automation tables
CREATE POLICY "Admins manage nurture_sequences" ON nurture_sequences FOR ALL USING (is_admin());
CREATE POLICY "Admins manage nurture_queue" ON nurture_queue FOR ALL USING (is_admin());
CREATE POLICY "Admins manage nurture_enrollments" ON nurture_enrollments FOR ALL USING (is_admin());
CREATE POLICY "Admins manage listing_lead_matches" ON listing_lead_matches FOR ALL USING (is_admin());
CREATE POLICY "Admins manage automation_logs" ON automation_logs FOR ALL USING (is_admin());
CREATE POLICY "Admins manage generated_content" ON generated_content FOR ALL USING (is_admin());

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER nurture_sequences_updated_at BEFORE UPDATE ON nurture_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DEFAULT NURTURE SEQUENCES (seed data)
-- ============================================================
INSERT INTO nurture_sequences (name, description, trigger_type, target_lead_score, steps_count, delay_days, context) VALUES
(
  'New Lead Follow-Up',
  'Automatically follows up with any new lead who hasn''t booked a viewing within 24 hours',
  'on_lead',
  'all',
  5,
  '{1, 7, 14, 30, 60}',
  'Focus on building trust and providing value. Share relevant listings and market insights. Never be pushy.'
),
(
  'Hot Lead Fast Track',
  'Aggressive 3-step follow-up for hot leads who haven''t responded in 24 hours',
  'on_lead',
  'hot',
  3,
  '{1, 3, 7}',
  'These leads are highly qualified. Be direct, create mild urgency, offer to schedule a call or viewing immediately.'
),
(
  'Cold Lead Re-Engagement',
  'Revive cold leads who went quiet 30+ days ago with fresh market insights',
  'manual',
  'cold',
  3,
  '{1, 14, 30}',
  'These leads went cold. Re-engage with genuinely useful market information, not sales pressure. Ask if their timeline or needs have changed.'
),
(
  'Past Client Anniversary',
  'Annual check-in with past clients — their home may have appreciated significantly',
  'manual',
  'all',
  2,
  '{1, 30}',
  'These are clients who already bought/rented through us. Be warm and personal. Mention how the market has changed. Ask if they know anyone looking.'
);


git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/edsimondev/Domain.git
git push -u origin man

git remote set-url origin https://github.com/edsimondev/Domain.git