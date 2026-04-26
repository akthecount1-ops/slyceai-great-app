-- Knowledge Base Tables
CREATE TABLE IF NOT EXISTS public.kb_symptoms (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    aliases JSONB DEFAULT '[]'::jsonb,
    body_system TEXT,
    severity_levels JSONB DEFAULT '[]'::jsonb,
    commonly_associated_diseases JSONB DEFAULT '[]'::jsonb,
    red_flag BOOLEAN DEFAULT false,
    follow_up_questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kb_medicines (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    manufacturer TEXT,
    uses JSONB DEFAULT '[]'::jsonb,
    how_it_works TEXT,
    dosage_forms JSONB DEFAULT '[]'::jsonb,
    side_effects_common JSONB DEFAULT '[]'::jsonb,
    side_effects_serious JSONB DEFAULT '[]'::jsonb,
    drug_interactions JSONB DEFAULT '[]'::jsonb,
    food_interactions JSONB DEFAULT '[]'::jsonb,
    contraindications JSONB DEFAULT '[]'::jsonb,
    what_to_avoid JSONB DEFAULT '[]'::jsonb,
    storage TEXT,
    source_note TEXT,
    last_updated TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_kb_symptoms_label ON public.kb_symptoms USING gin (label gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kb_symptoms_aliases ON public.kb_symptoms USING gin (aliases);
CREATE INDEX IF NOT EXISTS idx_kb_medicines_name ON public.kb_medicines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kb_medicines_generic_name ON public.kb_medicines USING gin (generic_name gin_trgm_ops);

-- RLS policies
ALTER TABLE public.kb_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_medicines ENABLE ROW LEVEL SECURITY;

-- Allow public read access to knowledge base
CREATE POLICY "Allow public read access to kb_symptoms" ON public.kb_symptoms FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read access to kb_medicines" ON public.kb_medicines FOR SELECT TO public USING (true);

-- Allow public insert for seeding (you can restrict this to authenticated/service role later)
CREATE POLICY "Allow public insert to kb_symptoms" ON public.kb_symptoms FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public insert to kb_medicines" ON public.kb_medicines FOR INSERT TO public WITH CHECK (true);
