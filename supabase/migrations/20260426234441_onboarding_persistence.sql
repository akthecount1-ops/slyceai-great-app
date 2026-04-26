-- 1) Standardize onboarding_complete and chat_ready to boolean
ALTER TABLE public.profiles 
  ALTER COLUMN onboarding_complete DROP DEFAULT,
  ALTER COLUMN onboarding_complete TYPE BOOLEAN USING (onboarding_complete::INT::BOOLEAN),
  ALTER COLUMN onboarding_complete SET DEFAULT FALSE;

ALTER TABLE public.profiles 
  ALTER COLUMN chat_ready DROP DEFAULT,
  ALTER COLUMN chat_ready TYPE BOOLEAN USING (chat_ready::INT::BOOLEAN),
  ALTER COLUMN chat_ready SET DEFAULT FALSE;

-- 2) Onboarding state table
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step SMALLINT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_steps SMALLINT[] NOT NULL DEFAULT '{}',
  draft JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER trg_onboarding_progress_updated_at
BEFORE UPDATE ON public.onboarding_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_progress_select_own" ON public.onboarding_progress;
CREATE POLICY "onboarding_progress_select_own"
ON public.onboarding_progress
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "onboarding_progress_insert_own" ON public.onboarding_progress;
CREATE POLICY "onboarding_progress_insert_own"
ON public.onboarding_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "onboarding_progress_update_own" ON public.onboarding_progress;
CREATE POLICY "onboarding_progress_update_own"
ON public.onboarding_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "onboarding_progress_delete_own" ON public.onboarding_progress;
CREATE POLICY "onboarding_progress_delete_own"
ON public.onboarding_progress
FOR DELETE
USING (auth.uid() = user_id);

-- 5) Optional index
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_last_saved_at
  ON public.onboarding_progress (last_saved_at DESC);

-- 6) Helper function for array_distinct
CREATE OR REPLACE FUNCTION public.array_distinct(anyarray)
RETURNS anyarray AS $$
  SELECT ARRAY(SELECT DISTINCT unnest($1))
$$ LANGUAGE sql;

-- 7) Upsert RPC
CREATE OR REPLACE FUNCTION public.upsert_onboarding_progress(
  _user_id UUID,
  _current_step SMALLINT,
  _draft JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.onboarding_progress (user_id, current_step, draft, completed_steps)
  VALUES (_user_id, _current_step, _draft, ARRAY[(_current_step - 1)::SMALLINT])
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_step = EXCLUDED.current_step,
    draft = onboarding_progress.draft || EXCLUDED.draft,
    completed_steps = public.array_distinct(ARRAY_APPEND(onboarding_progress.completed_steps, (EXCLUDED.current_step - 1)::SMALLINT)),
    last_saved_at = NOW();
END;
$$;
