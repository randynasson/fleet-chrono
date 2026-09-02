-- Lets either device signal "we're both here, begin the live game" and lets
-- the joiner (sitting on the confirm screen) detect it in realtime, or on
-- load if they missed the live event (e.g. a refresh while waiting).
alter table games add column if not exists started_at timestamptz;

create or replace function start_game(p_game_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update games set started_at = now() where id = p_game_id and started_at is null;
end;
$$;

grant execute on function start_game(text) to anon, authenticated;

alter publication supabase_realtime add table games;
