-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student', 'parent');

-- Create AI engine enum
CREATE TYPE public.ai_engine AS ENUM ('openai', 'anthropic', 'google', 'other');

-- Create prompt status enum
CREATE TYPE public.prompt_status AS ENUM ('approved', 'blocked', 'rewritten', 'flagged');

-- Create severity level enum
CREATE TYPE public.severity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create user roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    grade_level TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parent-child relationships
CREATE TABLE public.parent_child_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    child_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (parent_id, child_id)
);

-- Create prompt logs table
CREATE TABLE public.prompt_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_prompt TEXT NOT NULL,
    modified_prompt TEXT,
    response TEXT,
    ai_engine ai_engine DEFAULT 'openai',
    status prompt_status NOT NULL,
    severity severity_level DEFAULT 'low',
    flagged_keywords TEXT[],
    subject TEXT,
    grade_level TEXT,
    process_mode_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI configurations table
CREATE TABLE public.ai_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT,
    ai_engine ai_engine NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    endpoint_url TEXT,
    blocked_keywords TEXT[],
    process_mode_enabled BOOLEAN DEFAULT TRUE,
    subject_filters JSONB DEFAULT '{}'::JSONB,
    grade_level_rules JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bypass attempts table
CREATE TABLE public.bypass_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    attempt_type TEXT NOT NULL,
    details JSONB,
    severity severity_level DEFAULT 'medium',
    blocked BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ethical badges table
CREATE TABLE public.ethical_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, badge_name)
);

-- Create model training data table
CREATE TABLE public.model_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    grade_level TEXT,
    input_prompt TEXT NOT NULL,
    ideal_response TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create curriculum links table
CREATE TABLE public.curriculum_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assignment_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    linked_prompts TEXT[],
    lms_integration TEXT,
    external_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bypass_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ethical_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_links ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role app_role)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for parent_child_links
CREATE POLICY "Parents can view their children"
ON public.parent_child_links FOR SELECT
USING (auth.uid() = parent_id);

CREATE POLICY "Admins can manage parent-child links"
ON public.parent_child_links FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for prompt_logs
CREATE POLICY "Users can view their own logs"
ON public.prompt_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student logs"
ON public.prompt_logs FOR SELECT
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Parents can view their children's logs"
ON public.prompt_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_links
    WHERE parent_id = auth.uid() AND child_id = prompt_logs.user_id
  )
);

CREATE POLICY "Admins can view all logs"
ON public.prompt_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
ON public.prompt_logs FOR INSERT
WITH CHECK (TRUE);

-- RLS Policies for ai_configurations
CREATE POLICY "Admins can manage AI configurations"
ON public.ai_configurations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view AI configurations"
ON public.ai_configurations FOR SELECT
USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for bypass_attempts
CREATE POLICY "Admins can view bypass attempts"
ON public.bypass_attempts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can log bypass attempts"
ON public.bypass_attempts FOR INSERT
WITH CHECK (TRUE);

-- RLS Policies for ethical_badges
CREATE POLICY "Users can view their own badges"
ON public.ethical_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can award badges"
ON public.ethical_badges FOR INSERT
WITH CHECK (TRUE);

-- RLS Policies for model_training_data
CREATE POLICY "Users can view approved training data"
ON public.model_training_data FOR SELECT
USING (approved = TRUE OR created_by = auth.uid());

CREATE POLICY "Teachers can create training data"
ON public.model_training_data FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage training data"
ON public.model_training_data FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for curriculum_links
CREATE POLICY "Teachers can manage their curriculum links"
ON public.curriculum_links FOR ALL
USING (auth.uid() = teacher_id);

CREATE POLICY "Admins can view all curriculum links"
ON public.curriculum_links FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_prompt_logs_user_id ON public.prompt_logs(user_id);
CREATE INDEX idx_prompt_logs_created_at ON public.prompt_logs(created_at DESC);
CREATE INDEX idx_bypass_attempts_user_id ON public.bypass_attempts(user_id);
CREATE INDEX idx_parent_child_links_parent_id ON public.parent_child_links(parent_id);
CREATE INDEX idx_parent_child_links_child_id ON public.parent_child_links(child_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_configurations_updated_at
BEFORE UPDATE ON public.ai_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();