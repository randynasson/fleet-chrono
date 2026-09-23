-- Personal game history & trends (Phase 3 of USER_ACCOUNTS_PLAN.md).
--
-- Single-device games historically had zero Supabase interaction -- the
-- event log only ever lived in that device's localStorage. To give a
-- signed-in user's single-device games full parity with multi-device ones
-- (same detail view: both sides, phase breakdown, activity log), a signed-in
-- device now records its finished single-device games into the *same*
-- games/game_players/game_events tables multi-device already uses, via
-- record_single_device_game() below. Anonymous single-device play is
-- completely unaffected -- this path is never invoked unless the device
-- holder is signed in, and it's opt-in per game (see the "You Are" picker
-- added to single-device setup alongside this migration).
--
-- games/game_players/game_events stay publicly readable (migration 0001) --
-- a single-device recording's game_id is a full random uuid rather than a
-- 6-char join code, so it's materially less guessable than multi-device
-- codes already are, and this doesn't change the existing accepted
-- tradeoff (see 0008's note, DEFERRED.md's "publicly listable" item).
alter table games add column if not exists mode text not null default 'multi_device'
  check (mode in ('multi_device', 'single_device'));

-- record_single_device_game: the one-time write for a finished, signed-in
-- single-device game. Creates the games row, both game_players rows (both
-- slots share this device's device_id -- it really was one device for both
-- players), and replays the full local event log into game_events in order.
create or replace function record_single_device_game(
  p_device_id uuid,
  p_round_limit int,
  p_target_duration_sec int,
  p_my_slot smallint,
  p_events jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id text := gen_random_uuid()::text;
  v_uid uuid := auth.uid();
  v_evt jsonb;
  v_seq int := 0;
begin
  if v_uid is null then
    raise exception 'record_single_device_game requires an authenticated session';
  end if;
  if p_my_slot not in (0, 1) then
    raise exception 'invalid slot: %', p_my_slot;
  end if;

  insert into games (id, mode) values (v_game_id, 'single_device');

  insert into game_players (game_id, slot, device_id, user_id) values
    (v_game_id, p_my_slot, p_device_id, v_uid),
    (v_game_id, 1 - p_my_slot, p_device_id, null);

  for v_evt in select * from jsonb_array_elements(p_events)
  loop
    insert into game_events (game_id, seq, event) values (v_game_id, v_seq, v_evt);
    v_seq := v_seq + 1;
  end loop;

  return v_game_id;
end;
$$;

grant execute on function record_single_device_game(uuid, int, int, smallint, jsonb) to authenticated;

-- game_summaries: one row per signed-in participant per finished game (not
-- one row per game) -- this is what makes "remove from history" a
-- per-participant action and keeps RLS a plain self-only check, same
-- pattern as profiles. game_id can now genuinely FK to games(id): every
-- summary row's game always has a games row, either the pre-existing
-- multi-device one or the one record_single_device_game() just created --
-- anonymous games never reach this table at all.
create table if not exists game_summaries (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id) on delete cascade,
  source text not null check (source in ('single_device', 'multi_device')),
  slot smallint not null check (slot in (0, 1)),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,

  round_limit int not null,
  target_duration_sec int not null,
  rounds_played int not null,
  total_game_duration_sec int not null,

  my_total_activation_sec int not null,
  my_activation_count int not null,
  my_time_by_round jsonb not null default '[]',
  my_activation_by_phase jsonb not null default '{}',

  created_at timestamptz not null default now(),
  deleted_at timestamptz,

  unique (game_id, slot)
);

alter table game_summaries enable row level security;

drop policy if exists "game_summaries are self-readable" on game_summaries;
create policy "game_summaries are self-readable" on game_summaries for select
  using (auth.uid() = user_id);

drop policy if exists "game_summaries are self-insertable" on game_summaries;
create policy "game_summaries are self-insertable" on game_summaries for insert
  with check (auth.uid() = user_id);

-- Update, not delete: "remove from history" sets deleted_at rather than
-- removing the row, per the plan's soft-delete design (admin analytics and
-- a future hard-delete path both still need the row to exist).
drop policy if exists "game_summaries are self-updatable" on game_summaries;
create policy "game_summaries are self-updatable" on game_summaries for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists game_summaries_user_id_created_at_idx
  on game_summaries (user_id, created_at desc);
