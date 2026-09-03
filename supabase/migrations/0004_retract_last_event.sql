-- Multi-device undo: deletes the single most recent event, mirroring what
-- single-device undo already does to its local array. p_expected_seq is a
-- cheap race guard — the client passes the seq it currently believes is
-- last; if the log has moved on since (the other device acted a moment
-- earlier), this just refuses rather than deleting the wrong row. No
-- ownership/game-rule validation here, same split as append_event: the
-- client decides what's legal to undo, this just performs the storage op.
alter table game_events replica identity full;

create or replace function retract_last_event(
  p_game_id text,
  p_expected_seq int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_seq int;
begin
  select max(seq) into v_max_seq from game_events where game_id = p_game_id;

  if v_max_seq is null or v_max_seq <> p_expected_seq then
    return false;
  end if;

  delete from game_events where game_id = p_game_id and seq = v_max_seq;
  return true;
end;
$$;

grant execute on function retract_last_event(text, int) to anon, authenticated;
