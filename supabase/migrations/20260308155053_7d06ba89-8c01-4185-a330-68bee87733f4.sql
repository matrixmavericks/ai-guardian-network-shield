
-- Create grading_systems table
CREATE TABLE public.grading_systems (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  scale_config jsonb NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_systems ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view grading systems
CREATE POLICY "Authenticated users can view grading systems"
ON public.grading_systems FOR SELECT TO authenticated
USING (true);

-- Only admins can manage grading systems
CREATE POLICY "Admins can manage grading systems"
ON public.grading_systems FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add grading_system_id to classes
ALTER TABLE public.classes ADD COLUMN grading_system_id uuid REFERENCES public.grading_systems(id) DEFAULT NULL;

-- Insert pre-built grading systems
INSERT INTO public.grading_systems (name, code, description, is_default, scale_config) VALUES
(
  'Percentage (0-100%)',
  'percentage',
  'Standard percentage-based grading from 0 to 100%.',
  true,
  '{"type":"percentage","max":100,"boundaries":[{"label":"A+","min":97},{"label":"A","min":93},{"label":"A-","min":90},{"label":"B+","min":87},{"label":"B","min":83},{"label":"B-","min":80},{"label":"C+","min":77},{"label":"C","min":73},{"label":"C-","min":70},{"label":"D","min":60},{"label":"F","min":0}]}'
),
(
  'IB (1-7 Criterion)',
  'ib',
  'International Baccalaureate grading: Criteria A-D each 0-8, final grade 1-7.',
  false,
  '{"type":"ib","max_criterion":8,"criteria":["A","B","C","D"],"final_max":7,"boundaries":[{"grade":7,"min_pct":86},{"grade":6,"min_pct":72},{"grade":5,"min_pct":58},{"grade":4,"min_pct":44},{"grade":3,"min_pct":30},{"grade":2,"min_pct":16},{"grade":1,"min_pct":0}]}'
),
(
  'IGCSE (A*-G)',
  'igcse',
  'Cambridge IGCSE letter grades from A* to G with Ungraded.',
  false,
  '{"type":"igcse","boundaries":[{"label":"A*","min":90},{"label":"A","min":80},{"label":"B","min":70},{"label":"C","min":60},{"label":"D","min":50},{"label":"E","min":40},{"label":"F","min":30},{"label":"G","min":20},{"label":"U","min":0}]}'
),
(
  'US Letter Grade (A-F)',
  'us_letter',
  'Standard American letter grading with +/- variants and GPA points.',
  false,
  '{"type":"us_letter","gpa_scale":4.0,"boundaries":[{"label":"A+","min":97,"gpa":4.0},{"label":"A","min":93,"gpa":4.0},{"label":"A-","min":90,"gpa":3.7},{"label":"B+","min":87,"gpa":3.3},{"label":"B","min":83,"gpa":3.0},{"label":"B-","min":80,"gpa":2.7},{"label":"C+","min":77,"gpa":2.3},{"label":"C","min":73,"gpa":2.0},{"label":"C-","min":70,"gpa":1.7},{"label":"D+","min":67,"gpa":1.3},{"label":"D","min":63,"gpa":1.0},{"label":"D-","min":60,"gpa":0.7},{"label":"F","min":0,"gpa":0.0}]}'
);
