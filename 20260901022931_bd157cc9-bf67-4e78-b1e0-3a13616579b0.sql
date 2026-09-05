CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status, trial_ends_at)
  VALUES (NEW.id, NEW.email, 'approved', now() + interval '1 day')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET status = 'approved',
    trial_ends_at = COALESCE(trial_ends_at, now() + interval '1 day'),
    updated_at = now()
WHERE status = 'pending'
  AND id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  );

DROP POLICY IF EXISTS "Approved users manage their own app state" ON public.app_state;
DROP POLICY IF EXISTS "Active subscribers manage their own app state" ON public.app_state;
CREATE POLICY "Active subscribers manage their own app state" ON public.app_state
FOR ALL TO authenticated
USING (auth.uid() = user_id AND public.has_access(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.has_access(auth.uid()));