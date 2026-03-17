
-- Live quiz sessions table
CREATE TABLE public.live_quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  mode text NOT NULL DEFAULT 'teacher_paced', -- 'teacher_paced' or 'self_paced'
  theme text NOT NULL DEFAULT 'arcade', -- 'arcade', 'space', 'ocean', 'jungle', 'retro', 'minimal'
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'lobby', 'active', 'paused', 'completed'
  join_code text NOT NULL DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 6),
  current_question_index integer DEFAULT -1,
  question_time_seconds integer DEFAULT 20,
  points_per_question integer DEFAULT 1000,
  streak_bonus boolean DEFAULT true,
  enabled_powerups text[] DEFAULT ARRAY['double_points', 'fifty_fifty', 'extra_time', 'streak_freeze', 'hint_reveal', 'second_chance']::text[],
  show_leaderboard_after_each boolean DEFAULT true,
  shuffle_questions boolean DEFAULT false,
  shuffle_answers boolean DEFAULT false,
  redemption_round_enabled boolean DEFAULT true,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Live quiz questions
CREATE TABLE public.live_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_quiz_sessions(id) ON DELETE CASCADE,
  question_order integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'redemption'
  options jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{text, isCorrect}]
  correct_index integer NOT NULL DEFAULT 0,
  explanation text DEFAULT '',
  time_seconds integer, -- override per-question
  points integer, -- override per-question
  image_url text,
  ai_generated boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Players in a session
CREATE TABLE public.live_quiz_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_quiz_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nickname text NOT NULL DEFAULT 'Player',
  avatar text DEFAULT 'default',
  score integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  powerups_available jsonb NOT NULL DEFAULT '{"double_points":1,"fifty_fifty":1,"extra_time":1,"streak_freeze":1,"hint_reveal":1,"second_chance":1}'::jsonb,
  powerups_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_connected boolean DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Individual answers
CREATE TABLE public.live_quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_quiz_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.live_quiz_questions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.live_quiz_players(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  selected_index integer,
  is_correct boolean DEFAULT false,
  points_earned integer DEFAULT 0,
  time_taken_ms integer DEFAULT 0,
  powerup_used text,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(question_id, player_id)
);

-- Enable RLS
ALTER TABLE public.live_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_answers ENABLE ROW LEVEL SECURITY;

-- Sessions RLS
CREATE POLICY "Teachers can manage own quiz sessions" ON public.live_quiz_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Class members can view sessions" ON public.live_quiz_sessions
  FOR SELECT TO authenticated
  USING (is_class_member(auth.uid(), class_id) OR auth.uid() = teacher_id);

CREATE POLICY "Admins can manage all sessions" ON public.live_quiz_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Questions RLS
CREATE POLICY "Session teacher can manage questions" ON public.live_quiz_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM live_quiz_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM live_quiz_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));

CREATE POLICY "Players can view questions of active sessions" ON public.live_quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM live_quiz_sessions s WHERE s.id = session_id AND (s.status IN ('active', 'completed')) AND (s.teacher_id = auth.uid() OR is_class_member(auth.uid(), s.class_id))));

-- Players RLS
CREATE POLICY "Anyone can join as player" ON public.live_quiz_players
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can view all players in session" ON public.live_quiz_players
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM live_quiz_sessions s WHERE s.id = session_id AND (s.teacher_id = auth.uid() OR is_class_member(auth.uid(), s.class_id))));

CREATE POLICY "Players can update own record" ON public.live_quiz_players
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teacher can manage players" ON public.live_quiz_players
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM live_quiz_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM live_quiz_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));

-- Answers RLS
CREATE POLICY "Players can submit own answers" ON public.live_quiz_answers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players and teachers can view answers" ON public.live_quiz_answers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM live_quiz_sessions s WHERE s.id = session_id AND (s.teacher_id = auth.uid() OR is_class_member(auth.uid(), s.class_id))));

-- Enable realtime for live gameplay
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_quiz_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_quiz_answers;
