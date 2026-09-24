-- Abuse ceilings on the game-creating and event-writing RPCs. Not meant to
-- stop a determined attacker outright -- to put a hard cap on how much
-- junk one caller can create. See DEFERRED.md "Scaling & security".
--
-- Two independent limits on game creation:
--   * per device_id (20/hour): catches bugs and accidental loops. A bot can
--     rotate a client-supplied device_id for free, so this alone isn't a
--     bot defense.
--   * per IP (300/hour): the bot-oriented ceiling. Deliberately much higher
--     than the per-device number so one venue's shared wifi (a game store
--     full of players behind one IP) doesn't trip it. Best-effort: shared
--     or rotating IPs mean it's a ceiling, not a guarantee.
--
-- IPs are stored only as a hash, in a private table with no API access,
-- never on the publicly-readable games table.

create table if not exists game_creations (
  id bigint generated always as identity primary key,
  device_id uuid not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists game_creations_device_idx on game_creations (device_id, created_at);
create index if not exists game_creations_ip_idx on game_creations (ip_hash, created_at);

-- RLS on with no policies and no grants for anon/authenticated: only
-- SECURITY DEFINER functions (running as the owner) can touch it.
alter table game_creations enable row level security;
grant select, insert, update, delete on game_creations to service_role;

-- Shared by create_game and record_single_device_game. Internal only.
create or replace function check_game_creation_limit(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text := nullif(trim(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), '');
  v_ip_hash text := case when v_ip is null then null else md5(v_ip) end;
begin
  -- Keep the table small: nothing older than a day is ever consulted.
  delete from game_creations where created_at < now() - interval '1 day';

  if (select count(*) from game_creations
        where device_id = p_device_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited: too many games created from this device, try again later';
  end if;

  if v_ip_hash is not null and (select count(*) from game_creations
        where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'rate_limited: too many games created from this network, try again later';
  end if;

  insert into game_creations (device_id, ip_hash) values (p_device_id, v_ip_hash);
end;
$$;

revoke all on function check_game_creation_limit(uuid) from public, anon, authenticated;

-- create_game: identical to 0001 plus the limit check up front.
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

  perform check_game_creation_limit(p_device_id);

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

-- append_event: identical to 0001 plus a per-game event cap. A real game is
-- a few hundred events; 2000 leaves generous headroom for undo churn.
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
  if v_seq >= 2000 then
    raise exception 'rate_limited: game event limit reached';
  end if;

  insert into game_events (game_id, seq, event) values (p_game_id, v_seq, p_event);
  return v_seq;
end;
$$;

-- record_single_device_game: identical to 0009 plus an event-array size cap
-- and the same per-device/per-IP creation limit as create_game.
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
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 2000 then
    raise exception 'rate_limited: event log too large';
  end if;

  perform check_game_creation_limit(p_device_id);

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
