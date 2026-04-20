
-- Paddle price ID mapping (admin-managed)
CREATE TABLE public.paddle_price_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly','one_time')),
  paddle_price_id TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, billing_cycle)
);

ALTER TABLE public.paddle_price_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active prices"
ON public.paddle_price_ids FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins manage prices"
ON public.paddle_price_ids FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_paddle_price_ids_updated_at
BEFORE UPDATE ON public.paddle_price_ids
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Discount codes (admin-managed)
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  applies_to_plans TEXT[] DEFAULT NULL, -- NULL = all plans
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can validate codes"
ON public.discount_codes FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins manage discount codes"
ON public.discount_codes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment transactions audit log
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_request_id UUID REFERENCES public.registration_requests(id) ON DELETE SET NULL,
  paddle_transaction_id TEXT UNIQUE,
  paddle_customer_id TEXT,
  amount_inr NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',
  discount_code TEXT,
  discount_amount NUMERIC DEFAULT 0,
  raw_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend registration_requests
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS paddle_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount_inr NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
