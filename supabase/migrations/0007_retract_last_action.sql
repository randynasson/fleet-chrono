-- Some actions push more than one event (advancePhase can push an
-- auto-closed activation, a phase_end, and a phase_start in one go) — a
-- single-row retract would leave the other rows behind as orphaned debris
-- instead of a clean revert. p_count lets the client retract a whole
-- trailing group at once (it derives the right count itself by scanning
-- for consecutive events sharing the same actionId — see the client's
-- currentActionEventCount()). Still race-guarded the same way: only
-- deletes if p_expected_seq still matches the true last row.
drop function if exists retract_last_event(text, int);

create or replace function retract_last_event(
  p_game_id text,
  p_expected_seq int,
  p_count int
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

  if v_max_seq is null or v_max_seq <> p_expected_seq or p_count < 1 then
    return false;
  end if;

  delete from game_events
    where game_id = p_game_id and seq > (v_max_seq - p_count) and seq <= v_max_seq;
  return true;
end;
$$;

grant execute on function retract_last_event(text, int, int) to anon, authenticated;
