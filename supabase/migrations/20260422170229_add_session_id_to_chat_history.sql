-- Add session_id to chat_history
ALTER TABLE public.chat_history
ADD COLUMN session_id UUID DEFAULT gen_random_uuid();

-- Create an index to make querying by session fast
CREATE INDEX idx_chat_history_session_id ON public.chat_history(session_id);
