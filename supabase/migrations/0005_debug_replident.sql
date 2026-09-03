create or replace function debug_replident(p_table text)
returns text
language sql
security definer
set search_path = public
as $$
  select relreplident::text from pg_class where relname = p_table;
$$;

grant execute on function debug_replident(text) to anon, authenticated;
