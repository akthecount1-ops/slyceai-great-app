-- Add is_starred and session_title to chat_history
ALTER TABLE public.chat_history
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS session_title TEXT;

-- Index for title and starred status
CREATE INDEX IF NOT EXISTS idx_chat_history_starred ON public.chat_history(is_starred) WHERE is_starred = true;
