CREATE TABLE IF NOT EXISTS public.keep_alive_log (
  id bigserial primary key,
  pinged_at timestamptz not null default now()
);
GRANT ALL ON public.keep_alive_log TO service_role;
GRANT SELECT ON public.keep_alive_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.keep_alive_log_id_seq TO service_role;
ALTER TABLE public.keep_alive_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read keep alive log" ON public.keep_alive_log;
CREATE POLICY "Admins read keep alive log" ON public.keep_alive_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.keep_alive_log DEFAULT VALUES;
  DELETE FROM public.keep_alive_log WHERE pinged_at < now() - interval '7 days';
END;
$$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE command LIKE '%keep_alive%';
SELECT cron.schedule('qgestao-keep-alive', '0 * * * *', $$SELECT public.keep_alive();$$);
SELECT public.keep_alive();