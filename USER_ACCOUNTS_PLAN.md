# User Accounts & Data Plan

**Status: Phases 1-3 built** (2026-09-22) — Supabase Auth, RLS scoping, and personal game history
& trends are all live in `fleet-chrono.html`. Phases 4-5 (remove-from-history UI, admin analytics)
remain as documented below.

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
- **Custom domain** — settled as of 2026-09-22: `fleetchrono.app` is live (GitHub Pages, HTTPS
  enforced). The Google/Discord OAuth redirect URIs and Supabase's Auth Site URL get configured
  against it directly in Phase 1, with no need to revisit them for a domain change later.

## Identity model

- Supabase Auth, since the app is already on Supabase. Magic link + Google OAuth + Discord OAuth —
  passwordless, per Randy's preference.
- **Login stays optional.** Anonymous single- and multi-device play keeps working exactly as it
  does today; signing in is purely additive for anyone who wants history.
- **Sign-in lives on the landing screen only, never mid-game** (per Randy, 2026-09-22) — a small
  "Sign In" pill in the corner of the landing screen, before any mode is picked. Once a game has
  started there's no sign-in affordance; identity is settled before the event log for that game
  ever starts.
- `game_players` gets a nullable `user_id` (references `auth.users`). Set only when that seat's
  player is signed in.
- **Device-claiming**: on sign-in, link this device's existing `game_players` rows (matched by the
  existing `device_id`) to the new `user_id`, retroactively. This is also how "anonymous vs.
  signed-in" gets answered later — it's just whether `user_id` is null.

### Display name

Google and Discord both return a real name (and an avatar) as part of their OAuth response, so
Supabase Auth has it automatically — no extra step. Magic-link email sign-in has no name to default
from at all — asking is the only option, not deriving one from the address.

- One `display_name`, independent of sign-in method, so identity reads consistently regardless of
  *how* someone signed in:
  - Google/Discord: default it from the provider's name automatically, no prompt.
  - Email: prompt for it once, right after the magic link resolves, pre-filled with a
    best-effort guess from the address (e.g. `randy.nasson@…` → "Randy Nasson") that's just as easy
    to accept as to change.
  - Editable anytime after, from the same account menu used for sign-out ("Edit Name") — reuses the
    exact same set-name step, just pre-filled with the current name and framed as editing.
- **No provider avatar photos** (per Randy, 2026-09-22) — deliberately kept to a colored
  initial-letter badge in the app's own geometric icon style, derived from `display_name`, the same
  treatment regardless of sign-in method. Nothing else in the app uses photography, and a Google/
  Discord photo next to an otherwise monochrome-violet UI would clash rather than help.
- Interactive mockup of the whole flow (corner pill → method picker → email/OAuth paths → set/edit
  display name → signed-in state):
  **https://claude.ai/artifact/7GqgnuLy3FUjojabzd7qzk**

## Schema additions (all additive — nothing here removes or renames anything existing)

- `profiles` — `user_id` (PK, references `auth.users`), `display_name`, `created_at`. A small
  dedicated table rather than relying on Supabase's built-in `auth.users` metadata: `auth.users`
  lives in a protected schema that's awkward to query or join against later (a leaderboard, an
  admin view showing names), while a plain `profiles` table is the conventional, RLS-friendly way
  to make a name referenceable without exposing the rest of the auth record.
- `game_players.user_id uuid null references auth.users(id)`, set via `claim_device()`.
- **Single-device games now get real `games`/`game_players`/`game_events` rows too, when signed
  in** — the gap noted below under "single-device attribution" is closed by
  `record_single_device_game()` (migration `0009_game_summaries.sql`), not by scoping history to
  multi-device only as first proposed. `games.mode` (`'multi_device' | 'single_device'`)
  distinguishes the two. Anonymous single-device play is completely unaffected — nothing is written
  unless the device holder is signed in, and only for the game just finished.
- `game_summaries` — one row per **participant** per finished game (not one row per game), written
  at game end by `writeGameSummary()`:
  - `game_id` (real FK to `games(id)`, now always satisfiable — see above), `source`
    (`'single_device' | 'multi_device'`), `slot`, `user_id`, `device_id`
  - `round_limit`, `target_duration_sec`, `rounds_played`, `total_game_duration_sec`
  - `my_total_activation_sec`, `my_activation_count` — "done" activations only, mirrors
    `renderStats()`'s `totals`/`counts`
  - `my_time_by_round jsonb` — array, one entry per round, sums every activation (done *and* pass,
    since a pass still spends turn time) — mirrors `renderStats()`'s `roundPlayerTotals`
  - `my_activation_by_phase jsonb` — `{"ship":{"count","totalSec"},"squadron":{...}}`, kept as two
    independent sub-objects (ship and squadron averages never merge) — mirrors `renderStats()`'s
    `byType`
  - `created_at`, `deleted_at` (soft "remove from history," per participant — not built yet, see
    Phase 4)
  - `unique(game_id, slot)` — makes the write idempotent (`upsert`), safe to retry from
    `resumeSavedGame()`'s reload-into-already-ended-game path without double-writing.
- Every new table references `games(id) on delete cascade`, so a single `delete from games where
  id = ...` cleanly removes a game everywhere — this is what makes the hard-delete RPC below cheap.

## Single-device attribution

Single-device mode originally had zero Supabase interaction at all, which made "whose stats are
these" ambiguous for a signed-in device holder. Resolved 2026-09-22 (per Randy): reuse the existing
multi-device "You Are" slot-picker UI in single-device setup too (shown only when signed in — an
anonymous device sees no extra step). `startGame()` sets `myPlayerSlot` from that selection instead
of always nulling it; every other read of `myPlayerSlot` elsewhere in the app is already
`isMultiDevice &&`-guarded, so this doesn't touch any existing single-device gameplay behavior.

## Personal history & trends

- Built as the "My Games & Trends" screen (account menu → `openHistory()`): list of the signed-in
  user's own `game_summaries` rows (`deleted_at is null`), newest-first by default with a toggle to
  reverse, plus an all-time averages block (games tracked, avg time on clock, avg ship activation,
  avg squadron activation — computed client-side over the fetched rows).
- Tapping a list entry (`viewHistoricalGame()`) fetches that game's full `game_events` row set and
  feeds it into the *existing* `renderStats()`/`screen-activity` views — the exact same detail
  screen a live game ends on, both players, phase breakdown, activity log — rather than a
  summary-only view. This is what full single-device parity (see above) actually buys: without it,
  a single-device game would only ever be able to show the signed-in player's own aggregates, not
  the true dual-player breakdown. The screen's "New" button doubles as "Back" while browsing history
  (`viewingHistoricalGame` flag), and reverts on every real game-end path
  (`resetStatsHeaderButton()`) so a stale "Back to history" state can never leak into a genuine
  finished game.
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
- A user can read and update only their own `profiles` row (`auth.uid() = user_id`) — nobody else's
  display name is writable, and only what's needed (the name) is exposed, not the rest of the auth
  record.
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

1. ~~Supabase Auth (magic link + Google + Discord) + `game_players.user_id` +
   `profiles.display_name` (default from provider, or the set-name step for email) +
   device-claiming flow~~ — done (`0008_user_accounts.sql`).
2. ~~RLS scoping, tested against the live app's existing anonymous flows~~ — done, see Security
   above.
3. ~~`game_summaries` table + summary-writing at game end + a personal history/trends screen~~ —
   done (`0009_game_summaries.sql`), including single-device parity via
   `record_single_device_game()`.
4. "Remove from my history" (`game_summaries.deleted_at` already exists; no UI affordance yet)
5. Admin analytics (SQL only, no UI) — including `admin_delete_game` if a real need has come up by
   then

## Open questions, explicitly left for later

- Exact filtering UI for trends (by opponent, date range, round/duration config) — the data model
  already supports it, it's just not built.
- Whether "my history" needs pagination/sorting once game counts grow.
- Whether the eventual admin screen is fully separate from the main app or a gated section of it.
- ~~Whether the custom domain lands before or after Google OAuth setup~~ — moot now: the custom
  domain (`fleetchrono.app`) is already live as of 2026-09-22, so the Google/Discord OAuth redirect
  URIs and Supabase's Auth Site URL just get set to it directly during Phase 1, no ordering decision
  left to make.
