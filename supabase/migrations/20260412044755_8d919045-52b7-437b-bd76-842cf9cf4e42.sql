
-- Create registration_requests table
CREATE TABLE public.registration_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'student',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on email for pending requests
CREATE UNIQUE INDEX idx_registration_requests_email_pending 
  ON public.registration_requests (email) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a registration request (no auth required)
CREATE POLICY "Anyone can submit registration requests"
  ON public.registration_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can check status of their own request by email (for the register page check)
CREATE POLICY "Anyone can check request status by email"
  ON public.registration_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only the hardcoded admin can update (approve/reject) requests
CREATE POLICY "Only website admin can update requests"
  ON public.registration_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.email = 'info.aiconditioner@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.email = 'info.aiconditioner@gmail.com'
    )
  );

-- Only the hardcoded admin can delete requests
CREATE POLICY "Only website admin can delete requests"
  ON public.registration_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.email = 'info.aiconditioner@gmail.com'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON public.registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
