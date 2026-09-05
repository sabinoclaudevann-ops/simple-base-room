ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_until timestamptz,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial';

-- Contas que já existem continuam liberadas (não perdem acesso)
UPDATE public.profiles
SET subscription_until = now() + interval '10 years',
    plan = 'legacy'
WHERE subscription_until IS NULL;

CREATE OR REPLACE FUNCTION public.has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.status = 'approved'
      AND (
        public.has_role(_user_id, 'admin')
        OR now() < COALESCE(p.subscription_until, p.trial_ends_at, 'epoch'::timestamptz)
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_access(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Approved users manage their own app state" ON public.app_state;
CREATE POLICY "Subscribed users manage their own app state"
ON public.app_state FOR ALL TO authenticated
USING (auth.uid() = user_id AND public.has_access(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.has_access(auth.uid()));