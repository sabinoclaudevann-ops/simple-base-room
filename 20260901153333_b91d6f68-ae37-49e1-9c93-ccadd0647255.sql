CREATE OR REPLACE FUNCTION public.cloud_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  is_main boolean;
  total_limit bigint := 8 * 1024 * 1024 * 1024; -- 8 GB padrão
  db_size bigint;
  tables_json json;
  users_total bigint;
begin
  select (auth.jwt() ->> 'email') = 'sabinoclaudevann@gmail.com'
     or public.has_role(auth.uid(), 'admin')
    into is_main;
  if not is_main then
    raise exception 'forbidden';
  end if;

  db_size := pg_database_size(current_database());

  select coalesce(json_agg(json_build_object(
    'table', t.tablename,
    'rows', t.n_live_tup,
    'size', pg_size_pretty(pg_total_relation_size(format('%I.%I', t.schemaname, t.tablename)))
  ) order by pg_total_relation_size(format('%I.%I', t.schemaname, t.tablename)) desc), '[]'::json)
  into tables_json
  from (
    select s.schemaname, s.relname as tablename, s.n_live_tup
    from pg_stat_user_tables s
    where s.schemaname = 'public'
  ) t;

  select count(*) into users_total from auth.users;

  return json_build_object(
    'db_size_pretty', pg_size_pretty(db_size),
    'db_size_bytes', db_size,
    'usage_percent', round((db_size::numeric / total_limit) * 100, 2),
    'limit_pretty', pg_size_pretty(total_limit),
    'tables', tables_json,
    'users_total', users_total
  );
end;
$function$