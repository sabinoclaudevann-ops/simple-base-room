CREATE OR REPLACE FUNCTION public.cloud_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  total_limit bigint := 8589934592; -- 8 GB
  db_bytes bigint;
  result json;
BEGIN
  IF auth.email() IS DISTINCT FROM 'sabinoclaudevann@gmail.com' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT pg_database_size(current_database()) INTO db_bytes;

  SELECT json_build_object(
    'db_size_pretty', pg_size_pretty(db_bytes),
    'db_size_bytes', db_bytes,
    'usage_percent', round((db_bytes::numeric / total_limit::numeric) * 100, 2),
    'limit_pretty', pg_size_pretty(total_limit),
    'tables', COALESCE((
      SELECT json_agg(json_build_object(
        'table', t.relname,
        'rows', t.n_live_tup,
        'size', pg_size_pretty(pg_total_relation_size(t.relid))
      ) ORDER BY pg_total_relation_size(t.relid) DESC)
      FROM pg_stat_user_tables t
    ), '[]'::json),
    'users_total', (SELECT count(*) FROM auth.users)
  ) INTO result;

  RETURN result;
END;
$$;