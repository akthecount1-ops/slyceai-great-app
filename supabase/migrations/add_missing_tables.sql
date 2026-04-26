-- ============================================================
-- Arogya Platform — Supplemental Tables Migration
-- Run these in Supabase SQL Editor if the tables don't exist
-- ============================================================

-- 1. medicine_logs — tracks whether a patient took their medicine today
CREATE TABLE IF NOT EXISTS medicine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id UUID,
  log_date DATE DEFAULT CURRENT_DATE,
  taken BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, medicine_id, log_date)
);

-- Enable RLS
ALTER TABLE medicine_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own medicine logs"
  ON medicine_logs FOR ALL
  USING (auth.uid() = user_id);

-- 2. daily_insights — caches AI-generated daily health insights per user per day
CREATE TABLE IF NOT EXISTS daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_date DATE DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_date)
);

-- Enable RLS
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily insights"
  ON daily_insights FOR ALL
  USING (auth.uid() = user_id);

-- 3. Ensure profiles has all required columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_ready INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
