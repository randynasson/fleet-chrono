# User Accounts & Data Plan

**Status: planned, not started.** Documented 2026-09-21 from a planning conversation; nothing in
this file has been built yet. Update the phase list below as work actually begins.

## Goals

From Randy, 2026-09-21:

- A signed-in user can see the Fleet Chrono data for every game they've played.
- A signed-in user can see averages/trends for **themselves only** (never their opponent): total
  time on clock, average per ship activation, average per squadron activation, share of turn time
  per round.
- A signed-in user can "remove" a played game from their own history/trends. This is a soft,
  per-participant hide, not a delete — the underlying data isn't touched, since the opponent may
  still need it. The purpose is letting someone clean up test/incomplete games from their own view.
- As the app owner, ability to pull global analytics: overall averages, total games recorded,
  anonymous vs. signed-in games, same-device vs. paired-device games, longest/fastest complete
  games, etc.
- (Not urgent, but design for it now) A way to actually delete a game's data outright — for
  cleaning up a bad actor or bot filling the database with junk — without doing it row-by-row in
  the Supabase dashboard.

## Constraints

- **Build against `fleet-chrono.html`.** *(Updated 2026-09-22: the simplified design was promoted
  to canonical — it's no longer a separate fork at `design/armada-clock-alt.html`, that path no
  longer exists. The file itself was also renamed from `armada-clock.html` around the same time.
  This plan now targets the one live file directly.)*
- **Don't break the live app while building.** `fleet-chrono.html` is in active beta use at
  `https://fleetchrono.app` right now, so every migration here must be strictly additive (new
  tables, new *nullable* columns) so existing queries and RPCs keep working throughout, not just at
  the end. The one genuinely risky piece is tightening RLS (see Security below); that gets tested
  against the app's existing anonymous access patterns before it's considered done.
- **Custom domain** has no required ordering relative to this work — it's an independent DNS/Pages
  config change. The only wrinkle: Google OAuth's authorized redirect URLs are tied to whatever
  domain is live when it's configured. Deciding the domain before finishing Google OAuth setup
  avoids a small bit of later rework; deciding after just means updating the redirect URIs in
  Supabase + Google Cloud Console once. Either order is fine.

## Identity model

- Supabase Auth, since the app is already on Supabase. Magic link + Google OAuth — passwordless,
  per Randy's preference.
- **Login stays optional.** Anonymous single- and multi-device play keeps working exactly as it
  does today; signing in is purely additive for anyone who wants history.
- `game_players` gets a nullable `user_id` (references `auth.users`). Set only when that seat's
  player is signed in.
- **Device-claiming**: on sign-in, link this device's existing `game_players` rows (matched by the
  existing `device_id`) to the new `user_id`, retroactively. This is also how "anonymous vs.
  signed-in" gets answered later — it's just whether `user_id` is null.

## Schema additions (all additive — nothing here removes or renames anything existing)

- `game_players.user_id uuid null references auth.users(id)`
- `game_players.hidden_at timestamptz null` — set when a player removes a game from their own
  history. Lives on `game_players` (per participant), not `games`, so hiding your own row never
  affects your opponent's.
- `game_summaries` — one row per `game_players` row (i.e., per participant per game), written once
  at game end:
  - `game_id`, `user_id` (nullable), `device_id`
  - `total_time_sec`, `ship_activation_count`, `ship_avg_sec`, `squadron_activation_count`,
    `squadron_avg_sec`
  - `round_breakdown jsonb` — per round, `{round, my_sec, opponent_sec}`. This is exactly what
    `renderStats()` already computes as `roundPlayerTotals` for the two-color bar on the stats
    screen — the plan is to persist that same derivation instead of only rendering it, so personal
    trends ("my average share of round time") are a query over already-correct data, not a new
    metric to design.
  - `total_duration_sec`, `round_limit`, `is_multi_device`, `created_at`
- Every new table references `games(id) on delete cascade`, so a single `delete from games where
  id = ...` cleanly removes a game everywhere — this is what makes the hard-delete RPC below cheap.

## Personal history & trends

- History list = the signed-in user's own `game_summaries` rows where `hidden_at is null`.
- Trends = aggregates (averages, etc.) over those same rows.
- All-time rollup is enough for v1 (per Randy). Storing one row per game — not a single running
  aggregate — means filtering later (by opponent, date range, round/duration config) is a `WHERE`
  clause away, not a schema change.

## Admin analytics

- No dedicated screen yet — direct SQL against `game_summaries` (unfiltered) via the Supabase
  dashboard is enough for now (per Randy).
- Anonymous vs. signed-in = `user_id` null vs. not. Same-device vs. paired = `is_multi_device`.
  Global averages / longest / fastest = aggregates over `total_time_sec` / `total_duration_sec`.
- A real in-app screen — partly admin-gated, partly public — is explicitly a later phase.

## Hard delete (not urgent, designed in from the start)

- `admin_delete_game(p_game_id)` RPC, `security definer`, checks the caller against an admin
  allowlist, then `delete from games where id = p_game_id` — cascades to `game_players` /
  `game_events` / `game_summaries` via the FKs above.
- Build the RPC itself whenever it's actually needed (a bad actor shows up); the only part that
  has to be right from day one is the cascade-friendly schema, which costs nothing extra now.

## Security (pulls forward part of DEFERRED.md's "Scaling & security" section)

`games` / `game_players` / `game_events` currently use `for select using (true)` — fully public
reads. That's flagged in `DEFERRED.md` as a pre-wide-release concern already; once `game_players`
carries a real `user_id`, the same gap becomes a cross-game identity-correlation leak (anyone can
already list every row; now those rows say which authenticated user played which game). So RLS
scoping happens as part of this work, not deferred further:

- A user can read their own rows (`auth.uid() = user_id`).
- Existing anonymous/device-based access patterns are preserved exactly as they work today —
  verified against the live `fleet-chrono.html` before this is considered shippable.
- Admin access goes through an allowlist check, not just "any authenticated user."

## Phased build order

**Resequenced 2026-09-22** (per Randy): RLS scoping moved up to immediately follow Phase 1, rather
than trailing after every user-facing feature. It can't come strictly *before* Phase 1 — the
policies reference `game_players.user_id`, which doesn't exist until that schema change lands —
but it now completes before Phase 3 starts, so `user_id`-linked data is never left publicly
readable (via the anon key, regardless of whether any UI points at it yet) while the history/hide/
admin features are being built on top of it.

1. Supabase Auth (magic link + Google) + `game_players.user_id` + device-claiming flow
2. RLS scoping, tested against the live app's existing anonymous flows — see Security above
3. `game_summaries` table + summary-writing at game end + a personal history/trends screen
4. "Remove from my history" (`hidden_at`) + the UI affordance for it
5. Admin analytics (SQL only, no UI) — including `admin_delete_game` if a real need has come up by
   then

## Open questions, explicitly left for later

- Exact filtering UI for trends (by opponent, date range, round/duration config) — the data model
  already supports it, it's just not built.
- Whether "my history" needs pagination/sorting once game counts grow.
- Whether the eventual admin screen is fully separate from the main app or a gated section of it.
- Whether the custom domain lands before or after Google OAuth setup (Randy's call, see
  Constraints above).
