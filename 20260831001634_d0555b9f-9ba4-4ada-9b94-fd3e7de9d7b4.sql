REVOKE ALL ON FUNCTION public.keep_alive() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.keep_alive() TO postgres, service_role;