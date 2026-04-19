UPDATE public.user_plans SET tokens_used_this_month = 0 WHERE tokens_used_this_month >= monthly_token_limit;
UPDATE public.user_plans SET monthly_token_limit = 100000 WHERE plan_id = 'starter' AND monthly_token_limit < 100000;
UPDATE public.user_plans SET monthly_token_limit = 500000 WHERE plan_id = 'standard' AND monthly_token_limit < 500000;
UPDATE public.user_plans SET monthly_token_limit = 2000000 WHERE plan_id = 'premium' AND monthly_token_limit < 2000000;