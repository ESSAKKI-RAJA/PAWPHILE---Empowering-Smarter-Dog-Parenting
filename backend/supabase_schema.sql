-- PAWPHILE SUPABASE SCHEMAS (Clerk Integration)
-- Execute this in the Supabase SQL Editor

-- 1. Profiles (Linked to Clerk via clerk_user_id)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  app_language VARCHAR(10) DEFAULT 'en',
  subscription_status VARCHAR(20) DEFAULT 'free',
  cloud_backup_enabled BOOLEAN DEFAULT true,
  consent_for_ai BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Dogs
CREATE TABLE dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  breed TEXT NOT NULL,
  dob DATE NOT NULL,
  gender VARCHAR(10) NOT NULL,
  weight_kg DECIMAL(5,2),
  diet_type TEXT,
  activity_level VARCHAR(20),
  health_goal VARCHAR(20),
  neutered BOOLEAN,
  allergies TEXT[],
  past_illnesses TEXT[],
  medical_history TEXT,
  linked_vet_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Dog Health Logs
CREATE TABLE dog_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_type VARCHAR(50), 
  value TEXT,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Triage Events
CREATE TABLE triage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  symptoms TEXT[] NOT NULL,
  duration VARCHAR(50),
  severity_rating INTEGER,
  calculated_risk_level VARCHAR(20), 
  ai_assessment TEXT,
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Vision Scans
CREATE TABLE vision_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  body_area VARCHAR(50),
  concern_type VARCHAR(50),
  ai_confidence DECIMAL(3,2),
  ai_findings TEXT,
  disclaimer_accepted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Nutrition Logs
CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_type VARCHAR(50),
  food_name TEXT,
  calories_kcal INTEGER,
  amount_grams INTEGER,
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Behavior Logs
CREATE TABLE behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  appetite_score INTEGER CHECK (appetite_score BETWEEN 1 AND 5),
  lethargy_score INTEGER CHECK (lethargy_score BETWEEN 1 AND 5),
  sleep_hours DECIMAL(4,1),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Preventive Care Records
CREATE TABLE preventive_care_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  care_type VARCHAR(50), 
  name TEXT,
  administered_date DATE,
  next_due_date DATE,
  veterinarian TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_type VARCHAR(50), 
  file_path TEXT NOT NULL,
  file_size INTEGER,
  included_sections TEXT[],
  upload_status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Reminder Preferences
CREATE TABLE reminder_preferences (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  walks_enabled BOOLEAN DEFAULT false,
  vaccines_enabled BOOLEAN DEFAULT true,
  vet_visits_enabled BOOLEAN DEFAULT true,
  nutrition_enabled BOOLEAN DEFAULT false,
  email_address TEXT,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  quiet_hours_start TIME DEFAULT '09:00',
  quiet_hours_end TIME DEFAULT '18:00',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10b. Reminder Events (Smart Urgency Audit Log)
CREATE TABLE reminder_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  urgency_level VARCHAR(20) CHECK (urgency_level IN ('critical', 'high', 'medium', 'low')),
  event_type VARCHAR(50), -- e.g. toxic_food_alert, vaccine_due
  channel VARCHAR(20) DEFAULT 'email',
  delivery_status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  user_action VARCHAR(50),
  resolved_at TIMESTAMPTZ,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Vet Clinics — REMOVED (Vet Locator permanently removed from the product).
-- The vet_clinics table, its GIST index, and the search_clinics RPC below
-- are intentionally deleted. Existing deployments may DROP TABLE
-- vet_clinics and DROP FUNCTION search_clinics at their discretion; no
-- application code references them.

-- PAWNEWS SCHEMA
-- 12. PawNews Sources
CREATE TABLE pawnews_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50), 
  trust_label VARCHAR(50),
  is_verified BOOLEAN DEFAULT false
);

-- 13. PawNews Articles
CREATE TABLE pawnews_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES pawnews_sources(id),
  title TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(50), 
  region VARCHAR(50), 
  url TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, 
  refresh_cycle VARCHAR(20) DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. PawNews User Interactions
CREATE TABLE pawnews_user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  article_id UUID REFERENCES pawnews_articles(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20), 
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. PAW AI Events
CREATE TABLE paw_ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  query_intent VARCHAR(50),
  risk_level VARCHAR(20),
  confidence_score DECIMAL(3,2),
  guardrail_triggered BOOLEAN DEFAULT false,
  source_context_used TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ROW LEVEL SECURITY (RLS) via CLERK JWT ──────────────────────────────

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventive_care_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pawnews_user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paw_ai_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Can read/write their own profile using clerk_user_id from auth.jwt()->>'sub'
CREATE POLICY "Profiles - read own" ON profiles FOR SELECT USING (auth.jwt()->>'sub' = clerk_user_id);
CREATE POLICY "Profiles - insert own" ON profiles FOR INSERT WITH CHECK (auth.jwt()->>'sub' = clerk_user_id);
CREATE POLICY "Profiles - update own" ON profiles FOR UPDATE USING (auth.jwt()->>'sub' = clerk_user_id);

-- Helper function to get current user's profile_id based on Clerk JWT
CREATE OR REPLACE FUNCTION get_my_profile_id() RETURNS UUID AS $$
  SELECT id FROM profiles WHERE clerk_user_id = auth.jwt()->>'sub' LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Generic Policies for dependent tables using get_my_profile_id()
CREATE POLICY "Dogs - all access" ON dogs FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Health Logs - all access" ON dog_health_logs FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Triage - all access" ON triage_events FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Vision - all access" ON vision_scans FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Nutrition - all access" ON nutrition_logs FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Behavior - all access" ON behavior_logs FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Preventive - all access" ON preventive_care_records FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Reports - all access" ON reports FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Reminders - all access" ON reminder_preferences FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Reminder Events - all access" ON reminder_events FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "Pawnews Interactions - all access" ON pawnews_user_interactions FOR ALL USING (profile_id = get_my_profile_id());
CREATE POLICY "PAW AI Events - all access" ON paw_ai_events FOR ALL USING (profile_id = get_my_profile_id());

-- PawNews (Public read)
ALTER TABLE pawnews_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE pawnews_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pawnews Sources - read all" ON pawnews_sources FOR SELECT USING (true);
CREATE POLICY "Pawnews Articles - read all" ON pawnews_articles FOR SELECT USING (true);
