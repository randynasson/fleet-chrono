-- User accounts (Phase 1+2 of USER_ACCOUNTS_PLAN.md) -- Supabase Auth, a
-- small profiles table for display names, and linking a device's existing
-- anonymous game_players rows to a signed-in user.
--
-- Security note (see USER_ACCOUNTS_PLAN.md "Security", and the 2026-09-22
-- discussion it links back to): game_players stays publicly readable,
-- unchanged from migration 0001. Both devices in a game still need to check
-- slot occupancy without a Supabase Auth session at all -- they authenticate
-- via device_id, not real auth -- so the new user_id column ends up visible
-- the same way device_id already is. That's a known, already-tracked gap
-- (see DEFERRED.md's "publicly listable" item), not something this
-- migration attempts to close; doing so would mean routing game_players
-- reads through a scoped lookup instead of direct table access, a bigger
-- change than this phase takes on. What this migration DOES lock down is
-- the write side: only an authenticated user can claim their own device's
-- rows, via claim_device() below -- never a raw UPDATE against the table.

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Self-only in every direction: a user can see, create, and change their
-- own display name, and nobody else's -- profiles carries a real name, so
-- unlike game_players there's no existing open-access behavior to preserve.
drop policy if exists "profiles are self-readable" on profiles;
create policy "profiles are self-readable" on profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles are self-insertable" on profiles;
create policy "profiles are self-insertable" on profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles are self-updatable" on profiles;
create policy "profiles are self-updatable" on profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nullable: set only once a seat's player signs in. game_players' existing
-- "publicly readable" policy (migration 0001) is left exactly as it is --
-- see the note at the top of this file for why.
alter table game_players add column if not exists user_id uuid references auth.users(id);

-- claim_device: links this device's existing game_players rows (across
-- however many games it's a participant in) to the calling user's account.
-- Only ever claims rows that are (a) actually this device's and (b) not
-- already claimed by someone else -- never overwrites an existing user_id,
-- so one device can't steal another account's history by replaying an old
-- device_id.
create or replace function claim_device(p_device_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'claim_device requires an authenticated session';
  end if;

  update game_players
    set user_id = auth.uid()
    where device_id = p_device_id and user_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function claim_device(uuid) to authenticated;
