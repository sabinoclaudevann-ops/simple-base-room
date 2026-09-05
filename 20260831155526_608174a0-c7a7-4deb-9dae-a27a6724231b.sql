CREATE POLICY "Admins read all app state"
ON public.app_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));