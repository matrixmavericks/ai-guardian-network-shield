
CREATE TABLE public.prompt_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  grade_band TEXT,
  prompt_template TEXT NOT NULL,
  example_output TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  uses_count INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  ratings_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_recipes TO authenticated;
GRANT ALL ON public.prompt_recipes TO service_role;

ALTER TABLE public.prompt_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View public or own recipes" ON public.prompt_recipes
FOR SELECT TO authenticated
USING (is_public = true OR author_id = auth.uid());

CREATE POLICY "Authors insert their own recipes" ON public.prompt_recipes
FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors update their own recipes" ON public.prompt_recipes
FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors delete their own recipes" ON public.prompt_recipes
FOR DELETE TO authenticated
USING (author_id = auth.uid());

CREATE TRIGGER update_prompt_recipes_updated_at
BEFORE UPDATE ON public.prompt_recipes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.prompt_recipe_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.prompt_recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_recipe_ratings TO authenticated;
GRANT ALL ON public.prompt_recipe_ratings TO service_role;

ALTER TABLE public.prompt_recipe_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View ratings on visible recipes" ON public.prompt_recipe_ratings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prompt_recipes pr
    WHERE pr.id = recipe_id AND (pr.is_public = true OR pr.author_id = auth.uid())
  )
);

CREATE POLICY "Users rate recipes" ON public.prompt_recipe_ratings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own rating" ON public.prompt_recipe_ratings
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own rating" ON public.prompt_recipe_ratings
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.recalc_recipe_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID;
BEGIN
  target := COALESCE(NEW.recipe_id, OLD.recipe_id);
  UPDATE public.prompt_recipes
  SET
    avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.prompt_recipe_ratings WHERE recipe_id = target), 0),
    ratings_count = (SELECT COUNT(*) FROM public.prompt_recipe_ratings WHERE recipe_id = target)
  WHERE id = target;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_recipe_rating
AFTER INSERT OR UPDATE OR DELETE ON public.prompt_recipe_ratings
FOR EACH ROW EXECUTE FUNCTION public.recalc_recipe_rating();
