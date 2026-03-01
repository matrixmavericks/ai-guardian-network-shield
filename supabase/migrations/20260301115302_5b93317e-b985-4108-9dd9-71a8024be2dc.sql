
-- AI Chat Sessions table
CREATE TABLE public.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text DEFAULT 'general',
  title text DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.ai_chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.ai_chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view student sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Chat Messages table
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'rewritten', 'flagged', 'blocked')),
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can view student messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages(session_id);
CREATE INDEX idx_ai_chat_messages_user ON public.ai_chat_messages(user_id);
CREATE INDEX idx_ai_chat_sessions_user ON public.ai_chat_sessions(user_id);

-- Add INSERT policy for profiles so new users can create their profile
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
