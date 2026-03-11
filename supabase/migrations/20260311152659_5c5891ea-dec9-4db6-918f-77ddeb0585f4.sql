
-- Add group assignment fields to class_assignments
ALTER TABLE public.class_assignments
  ADD COLUMN is_group_assignment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN group_formation TEXT NOT NULL DEFAULT 'student_choice',
  ADD COLUMN min_group_size INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN max_group_size INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN grading_type TEXT NOT NULL DEFAULT 'group';

-- Create assignment groups table
CREATE TABLE public.assignment_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL DEFAULT substr(md5(((random())::text || (clock_timestamp())::text)), 1, 8),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, join_code)
);

ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;

-- Teachers can manage groups for their assignments
CREATE POLICY "Teachers can manage assignment groups"
  ON public.assignment_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_assignments ca
      WHERE ca.id = assignment_groups.assignment_id AND ca.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_assignments ca
      WHERE ca.id = assignment_groups.assignment_id AND ca.teacher_id = auth.uid()
    )
  );

-- Students can view groups for assignments in their classes
CREATE POLICY "Students can view assignment groups"
  ON public.assignment_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_assignments ca
      JOIN class_members cm ON cm.class_id = ca.class_id AND cm.student_id = auth.uid()
      WHERE ca.id = assignment_groups.assignment_id
    )
  );

-- Students can create groups for student_choice assignments
CREATE POLICY "Students can create groups"
  ON public.assignment_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM class_assignments ca
      JOIN class_members cm ON cm.class_id = ca.class_id AND cm.student_id = auth.uid()
      WHERE ca.id = assignment_groups.assignment_id
      AND ca.group_formation = 'student_choice'
    )
  );

-- Create group members table
CREATE TABLE public.assignment_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, student_id)
);

ALTER TABLE public.assignment_group_members ENABLE ROW LEVEL SECURITY;

-- Teachers can manage group members
CREATE POLICY "Teachers can manage group members"
  ON public.assignment_group_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignment_groups ag
      JOIN class_assignments ca ON ca.id = ag.assignment_id
      WHERE ag.id = assignment_group_members.group_id AND ca.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignment_groups ag
      JOIN class_assignments ca ON ca.id = ag.assignment_id
      WHERE ag.id = assignment_group_members.group_id AND ca.teacher_id = auth.uid()
    )
  );

-- Students can view group members in their class assignments
CREATE POLICY "Students can view group members"
  ON public.assignment_group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignment_groups ag
      JOIN class_assignments ca ON ca.id = ag.assignment_id
      JOIN class_members cm ON cm.class_id = ca.class_id AND cm.student_id = auth.uid()
      WHERE ag.id = assignment_group_members.group_id
    )
  );

-- Students can join groups (insert themselves)
CREATE POLICY "Students can join groups"
  ON public.assignment_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM assignment_groups ag
      JOIN class_assignments ca ON ca.id = ag.assignment_id
      JOIN class_members cm ON cm.class_id = ca.class_id AND cm.student_id = auth.uid()
      WHERE ag.id = assignment_group_members.group_id
    )
  );

-- Students can leave groups (delete themselves)
CREATE POLICY "Students can leave groups"
  ON public.assignment_group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

-- Portfolio collaborators table
CREATE TABLE public.portfolio_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.portfolio_collaborators ENABLE ROW LEVEL SECURITY;

-- Project owner can manage collaborators
CREATE POLICY "Owner can manage collaborators"
  ON public.portfolio_collaborators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_projects pp
      WHERE pp.id = portfolio_collaborators.project_id AND pp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolio_projects pp
      WHERE pp.id = portfolio_collaborators.project_id AND pp.user_id = auth.uid()
    )
  );

-- Collaborators can view their own collaboration records
CREATE POLICY "Collaborators can view own records"
  ON public.portfolio_collaborators FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Collaborators can insert themselves (via invite)
CREATE POLICY "Users can join as collaborators"
  ON public.portfolio_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Collaborators can remove themselves
CREATE POLICY "Collaborators can leave"
  ON public.portfolio_collaborators FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow collaborators to view portfolio projects
CREATE POLICY "Collaborators can view projects"
  ON public.portfolio_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_collaborators pc
      WHERE pc.project_id = portfolio_projects.id AND pc.user_id = auth.uid()
    )
  );

-- Allow collaborators to update portfolio projects
CREATE POLICY "Collaborators can update projects"
  ON public.portfolio_projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_collaborators pc
      WHERE pc.project_id = portfolio_projects.id AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolio_collaborators pc
      WHERE pc.project_id = portfolio_projects.id AND pc.user_id = auth.uid()
    )
  );

-- Allow collaborators to insert portfolio updates
CREATE POLICY "Collaborators can add updates"
  ON public.portfolio_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM portfolio_collaborators pc
      WHERE pc.project_id = portfolio_updates.project_id AND pc.user_id = auth.uid()
    )
  );

-- Allow collaborators to view project updates
CREATE POLICY "Collaborators can view updates"
  ON public.portfolio_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_collaborators pc
      WHERE pc.project_id = portfolio_updates.project_id AND pc.user_id = auth.uid()
    )
  );

-- Add invite_code to portfolio_projects for collaboration invites
ALTER TABLE public.portfolio_projects
  ADD COLUMN invite_code TEXT DEFAULT substr(md5(((random())::text || (clock_timestamp())::text)), 1, 8);
