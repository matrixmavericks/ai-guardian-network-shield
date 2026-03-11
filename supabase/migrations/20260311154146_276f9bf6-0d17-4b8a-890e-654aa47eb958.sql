
-- Fix portfolio_projects: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view own projects" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Collaborators can view projects" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Collaborators can update projects" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Published projects viewable by share token" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Teachers can view student projects" ON public.portfolio_projects;

CREATE POLICY "Users can view own projects" ON public.portfolio_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.portfolio_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.portfolio_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.portfolio_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can view projects" ON public.portfolio_projects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM portfolio_collaborators pc WHERE pc.project_id = portfolio_projects.id AND pc.user_id = auth.uid()));
CREATE POLICY "Collaborators can update projects" ON public.portfolio_projects FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM portfolio_collaborators pc WHERE pc.project_id = portfolio_projects.id AND pc.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM portfolio_collaborators pc WHERE pc.project_id = portfolio_projects.id AND pc.user_id = auth.uid()));
CREATE POLICY "Published projects viewable by share token" ON public.portfolio_projects FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Teachers can view student projects" ON public.portfolio_projects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM class_members cm JOIN classes c ON c.id = cm.class_id WHERE cm.student_id = portfolio_projects.user_id AND c.teacher_id = auth.uid()));

-- Fix portfolio_updates: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view own updates" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Users can insert own updates" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Users can delete own updates" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Collaborators can view updates" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Collaborators can add updates" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Public updates viewable via published project" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Teachers can view student updates" ON public.portfolio_updates;

CREATE POLICY "Users can view own updates" ON public.portfolio_updates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own updates" ON public.portfolio_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own updates" ON public.portfolio_updates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can view updates" ON public.portfolio_updates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM portfolio_collaborators pc WHERE pc.project_id = portfolio_updates.project_id AND pc.user_id = auth.uid()));
CREATE POLICY "Collaborators can add updates" ON public.portfolio_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM portfolio_collaborators pc WHERE pc.project_id = portfolio_updates.project_id AND pc.user_id = auth.uid()));
CREATE POLICY "Public updates viewable via published project" ON public.portfolio_updates FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM portfolio_projects pp WHERE pp.id = portfolio_updates.project_id AND pp.is_published = true));
CREATE POLICY "Teachers can view student updates" ON public.portfolio_updates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM portfolio_projects pp JOIN class_members cm ON cm.student_id = pp.user_id JOIN classes c ON c.id = cm.class_id WHERE pp.id = portfolio_updates.project_id AND c.teacher_id = auth.uid()));

-- Fix portfolio_collaborators: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Owner can manage collaborators" ON public.portfolio_collaborators;
DROP POLICY IF EXISTS "Collaborators can view own records" ON public.portfolio_collaborators;
DROP POLICY IF EXISTS "Collaborators can leave" ON public.portfolio_collaborators;
DROP POLICY IF EXISTS "Users can join as collaborators" ON public.portfolio_collaborators;

CREATE POLICY "Owner can manage collaborators" ON public.portfolio_collaborators FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM portfolio_projects pp WHERE pp.id = portfolio_collaborators.project_id AND pp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM portfolio_projects pp WHERE pp.id = portfolio_collaborators.project_id AND pp.user_id = auth.uid()));
CREATE POLICY "Collaborators can view own records" ON public.portfolio_collaborators FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can leave" ON public.portfolio_collaborators FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can join as collaborators" ON public.portfolio_collaborators FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix portfolio_comments: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Teachers can insert comments" ON public.portfolio_comments;
DROP POLICY IF EXISTS "Teachers can view own comments" ON public.portfolio_comments;
DROP POLICY IF EXISTS "Teachers can update own comments" ON public.portfolio_comments;
DROP POLICY IF EXISTS "Teachers can delete own comments" ON public.portfolio_comments;
DROP POLICY IF EXISTS "Students can view public comments on own projects" ON public.portfolio_comments;

CREATE POLICY "Teachers can insert comments" ON public.portfolio_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Teachers can view own comments" ON public.portfolio_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Teachers can update own comments" ON public.portfolio_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can delete own comments" ON public.portfolio_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students can view public comments on own projects" ON public.portfolio_comments FOR SELECT TO authenticated USING (is_private = false AND EXISTS (SELECT 1 FROM portfolio_projects pp WHERE pp.id = portfolio_comments.project_id AND pp.user_id = auth.uid()));
