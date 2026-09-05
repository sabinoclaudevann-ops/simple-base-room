CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 1;
$$;

GRANT EXECUTE ON FUNCTION public.keep_alive() TO anon;
GRANT EXECUTE ON FUNCTION public.keep_alive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.keep_alive() TO service_role;

SELECT cron.schedule(
  'keep-alive-every-6h',
  '0 */6 * * *',
  'SELECT public.keep_alive();'
);