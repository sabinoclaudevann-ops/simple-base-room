create or replace function public.cloud_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  is_main boolean;
begin
  select (auth.jwt() ->> 'email') = 'sabinoclaudevann@gmail.com'
     or public.has_role(auth.uid(), 'admin')
    into is_main;
  if not is_main then
    raise exception 'forbidden';
  end if;

  return json_build_object(
    'db_size_pretty', pg_size_pretty(pg_database_size(current_database())),
    'db_size_bytes', pg_database_size(current_database()),
    'tables', (
      select coalesce(json_agg(json_build_object(
        'table', t.tablename,
        'rows', t.n_live_tup,
        'size', pg_size_pretty(pg_total_relation_size(format('%I.%I', t.schemaname, t.tablename)))
      ) order by pg_total_relation_size(format('%I.%I', t.schemaname, t.tablename)) desc), '[]'::json)
      from (
        select s.schemaname, s.relname as tablename, s.n_live_tup
        from pg_stat_user_tables s
      ) t
    ),
    'users_total', (select count(*) from auth.users)
  );
end;
$$;

revoke all on function public.cloud_stats() from public, anon;
grant execute on function public.cloud_stats() to authenticated;