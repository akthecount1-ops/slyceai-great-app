-- ─── KNOWLEDGE BASE TABLES ──────────────────────────────────────────

-- Symptoms Knowledge Base
CREATE TABLE IF NOT EXISTS kb_symptoms (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  aliases JSONB,
  description TEXT,
  red_flag BOOLEAN DEFAULT false,
  severity_levels JSONB,
  commonly_associated_diseases JSONB,
  follow_up_questions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medicines Knowledge Base
CREATE TABLE IF NOT EXISTS kb_medicines (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  uses JSONB,
  dosage_forms JSONB,
  side_effects_common JSONB,
  side_effects_serious JSONB,
  drug_interactions JSONB,
  food_interactions JSONB,
  contraindications JSONB,
  what_to_avoid JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EXTEND PROFILES TABLE ──────────────────────────────────────────

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
ADD COLUMN IF NOT EXISTS onboarding_complete INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chat_ready INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{"current_step": 1}'::jsonb;

-- ─── CHAT SESSIONS (If not already using chat_history session_id) ───
-- We'll use the session_id in our existing chat_history table.
