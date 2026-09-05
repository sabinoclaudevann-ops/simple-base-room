CREATE OR REPLACE FUNCTION public.has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
     OR EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = _user_id
         AND p.status = 'approved'
         AND GREATEST(COALESCE(p.subscription_until, 'epoch'::timestamptz),
                      COALESCE(p.trial_ends_at, 'epoch'::timestamptz)) > now()
     )
$$;