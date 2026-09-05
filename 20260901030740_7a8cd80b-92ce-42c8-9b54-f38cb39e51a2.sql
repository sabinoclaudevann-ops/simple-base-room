ALTER FUNCTION public.keep_alive() SECURITY INVOKER;

GRANT INSERT, DELETE ON public.keep_alive_log TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.keep_alive_log_id_seq TO anon;

DROP POLICY IF EXISTS "Anon can insert keep_alive_log" ON public.keep_alive_log;
CREATE POLICY "Anon can insert keep_alive_log" ON public.keep_alive_log FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete old keep_alive_log" ON public.keep_alive_log;
CREATE POLICY "Anon can delete old keep_alive_log" ON public.keep_alive_log FOR DELETE TO anon USING (pinged_at < now() - interval '7 days');