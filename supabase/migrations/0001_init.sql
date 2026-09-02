-- Fleet Chrono multi-device schema (v1)
--
-- Architecture note: the event log is the single source of truth, exactly as
-- in the single-device client. `games` and `game_players` hold only what's
-- needed to route a join code to a slot; everything about the game itself
-- (round limit, target duration, phases, activations...) lives as events in
-- `game_events`, in the same shape the client already uses locally.
--
-- Game-rule validation (is this move legal right now) stays client-side, same
-- as today's single-device app. These functions only handle code generation,
-- slot assignment, and safe sequence-number allocation — not "is this a
-- legal Fleet Chrono action." See DEFERRED.md if that ever needs hardening.

create table if not exists games (
  id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists game_players (
  game_id text not null references games(id) on delete cascade,
  slot smallint not null check (slot in (0, 1)),
  device_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (game_id, slot)
);

create table if not exists game_events (
  id bigint generated always as identity primary key,
  game_id text not null references games(id) on delete cascade,
  seq integer not null,
  event jsonb not null,
  created_at timestamptz not null default now(),
  unique (game_id, seq)
);

create index if not exists game_events_game_id_seq_idx on game_events (game_id, seq);

alter table games enable row level security;
alter table game_players enable row level security;
alter table game_events enable row level security;

-- Public read access: both devices need to look up game/slot state and pull
-- the event log. Writes only happen through the SECURITY DEFINER functions
-- below, never directly against these tables.
drop policy if exists "games are publicly readable" on games;
create policy "games are publicly readable" on games for select using (true);

drop policy if exists "game_players are publicly readable" on game_players;
create policy "game_players are publicly readable" on game_players for select using (true);

drop policy if exists "game_events are publicly readable" on game_events;
create policy "game_events are publicly readable" on game_events for select using (true);

-- create_game: generates a short join code, claims the creator's chosen
-- slot, and seeds the event log with game_start + the first phase_start —
-- mirroring exactly what startGame() does locally today. round_limit and
-- target_duration_sec live in the game_start event payload, not as columns,
-- so the whole game is reconstructable from game_events alone.
create or replace function create_game(
  p_round_limit int,
  p_target_duration_sec int,
  p_creator_slot smallint,
  p_device_id uuid
)
returns table(game_id text, slot smallint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_ts bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if p_creator_slot not in (0, 1) then
    raise exception 'invalid slot: %', p_creator_slot;
  end if;

  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    begin
      insert into games (id) values (v_code);
      exit;
    exception when unique_violation then
      -- code collision, try again
    end;
  end loop;

  insert into game_players (game_id, slot, device_id) values (v_code, p_creator_slot, p_device_id);

  insert into game_events (game_id, seq, event) values
    (v_code, 0, jsonb_build_object(
      'type', 'game_start', 'ts', v_ts, 'round', 0, 'phase', 'obstacles',
      'roundLimit', p_round_limit, 'targetDurationSec', p_target_duration_sec
    )),
    (v_code, 1, jsonb_build_object(
      'type', 'phase_start', 'phase', 'obstacles', 'round', 0, 'ts', v_ts
    ));

  return query select v_code, p_creator_slot;
end;
$$;

-- join_game: claims the open slot for a new device, or recognizes a device
-- that already owns a slot in this game (reconnect) and returns it as-is.
-- Returns status 'joined' | 'reconnected' | 'full' | 'not_found' so the
-- client can show the right message — including the third-join rejection
-- from DEFERRED.md ('full').
create or replace function join_game(
  p_game_id text,
  p_device_id uuid
)
returns table(slot smallint, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot smallint;
begin
  if not exists (select 1 from games g where g.id = p_game_id) then
    return query select null::smallint, 'not_found';
    return;
  end if;

  select gp.slot into v_slot from game_players gp
    where gp.game_id = p_game_id and gp.device_id = p_device_id;
  if found then
    return query select v_slot, 'reconnected';
    return;
  end if;

  select s into v_slot from unnest(array[0, 1]::smallint[]) s
    where not exists (
      select 1 from game_players gp where gp.game_id = p_game_id and gp.slot = s
    )
    limit 1;

  if v_slot is null then
    return query select null::smallint, 'full';
    return;
  end if;

  insert into game_players (game_id, slot, device_id) values (p_game_id, v_slot, p_device_id);
  return query select v_slot, 'joined';
end;
$$;

-- append_event: the single write path for the event log. Safely allocates
-- the next sequence number (avoids two devices racing on seq) and inserts.
-- Does not validate game rules — see the architecture note at the top.
create or replace function append_event(
  p_game_id text,
  p_event jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  if not exists (select 1 from games g where g.id = p_game_id) then
    raise exception 'game not found: %', p_game_id;
  end if;

  select coalesce(max(seq), -1) + 1 into v_seq from game_events where game_id = p_game_id;
  insert into game_events (game_id, seq, event) values (p_game_id, v_seq, p_event);
  return v_seq;
end;
$$;

grant execute on function create_game(int, int, smallint, uuid) to anon, authenticated;
grant execute on function join_game(text, uuid) to anon, authenticated;
grant execute on function append_event(text, jsonb) to anon, authenticated;

-- Required for Supabase Realtime (Postgres Changes) so both devices get
-- pushed new events as they're appended.
alter publication supabase_realtime add table game_events;
