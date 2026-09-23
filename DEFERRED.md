# Deferred

Ideas, needs, and open questions we've noted but decided not to pursue immediately. Move an item out of this file (into SPEC.md or an issue) when it's actually picked up.

## From SPEC.md open questions
- Double-tap semantics on your own active turn panel (close it vs. no-op)
- Setting to skip timing certain phases some groups don't bother with (e.g. status)
- PWA install/offline support — timing not yet decided

## From multi-device state-ownership discussion (2026-09-02)
- Possible future integration with star-forge.tools and t5.tools (fleet-building / tournament
  organizing tools widely used in the Armada community) — e.g. scan a QR code to associate a
  game's round-by-round data with an ongoing tournament. Forward-looking, not essential yet.
  Note: Fleet Chrono deliberately does *not* govern the tournament itself — e.g. ending a game
  early only stops this app's own timing/analysis collection, it doesn't end the actual match, so
  it can stay a unilateral action today. If a real tournament-platform integration ever makes that
  state consequential (e.g. it needs to report results back), actions like this may need to become
  a negotiated/confirmed state between both players' devices instead of unilateral.
- ~~User accounts~~ — **planned in detail 2026-09-21, not yet built.** See
  [`USER_ACCOUNTS_PLAN.md`](USER_ACCOUNTS_PLAN.md) for the full schema/auth/security plan
  (Supabase Auth, personal history/trends, per-user soft-hide, admin analytics, hard delete).
- ~~Reconnect handling for multi-device games, bundled with third-join rejection~~ — **built
  2026-09-02.** Third-join rejection was already in place (`join_game` returns `'full'`, shown as
  "This game already has two players"). Reconnect handling added: `{gameCode, isCreator}` persists
  to localStorage (`fleetChronoMultiSession`, separate from the single-device save) the moment a
  device enters a lobby or join-confirm screen; the landing screen offers a "Resume Game" prompt
  when that's present, which reuses `join_game`'s existing `'reconnected'` status (it already
  returns a recognized device's own slot) and drops the player back into whichever screen fits —
  live game, lobby, or join-confirm — with a couple of one-time "did I miss something while I was
  away" checks (an already-joined second player, an already-started game) since realtime only
  pushes *new* changes, not ones that happened during the gap. Realtime channels also resync
  automatically after a transient drop (wifi blip, phone sleep) — `makeReconnectHandler()` detects
  a reconnect (not the initial connect) and re-pulls whatever that channel is responsible for.
  Deliberately not built: a live "your opponent disconnected" indicator — recovery is silent on
  both ends for now. No live-game spectator mode — considered and ruled out; if third-party access
  is ever needed later, it'd be to summaries/logs after the fact, not a live game view.
- ~~Undo in multi-device games~~ — **built 2026-09-02.** `retract_last_event(game_id,
  expected_seq, count)` deletes the trailing `count` rows only if `expected_seq` still matches the
  true last row (a cheap race guard against the log moving on between the client's check and the
  call). `count` matters because some actions push more than one event at once (`advancePhase` can
  push an auto-closed activation, a phase_end, and a phase_start together) — a single-row retract
  would've left the rest behind as orphaned debris instead of a clean revert, so every pushed event
  now carries an `actionId` (shared by every event one action call pushes), and `count` is derived
  by scanning the log itself for how many trailing events share the current last one's actionId —
  not from local bookkeeping, so any device gets the same answer even right after a resume with no
  memory of what was just pushed. Neither device mutates `events` on undo — same pattern as pushes,
  a realtime notification is what actually reflects it, so the two logs can't diverge. One platform
  wrinkle found while building this: Supabase Realtime's DELETE payload only ever forwards the
  primary key, never the rest of the row, even with `REPLICA IDENTITY FULL` set at the Postgres
  level (confirmed directly — `relreplident` was genuinely `'f'`, the column just isn't forwarded).
  So a DELETE notification can't say which row went away, only that something did; the client
  treats any DELETE as "resync the whole log" instead, reusing the same full-reconciliation fetch
  reconnect-handling already needed. The single-step lock (only the *most recent* action is
  undoable, never chain further back) doesn't need any shared/server flag either: every session —
  fresh entry or a resume-from-reload — starts locked, same conservative default single-device
  resume already used, and unlocks only when that session observes a fresh push arrive live;
  observing a delete re-locks it. Since both devices see the identical realtime stream this stays
  consistent between them without syncing anything extra. Covers both of the app's existing undo
  controls: the per-player Done→Undo toggle (gated to the owning device, both by hiding the
  control on the other device and by an explicit check in `handleDoneOrUndo`) and the standalone
  header icon for undoing a shared action like a phase advance or a pause tap — which only shows
  itself when the last event *isn't* someone's activation, so it can never reach across and undo
  the other player's move. (Building this surfaced a real dormant bug from the original sync pass:
  `renderSplitView`'s "just acted" control visibility wasn't gated by device ownership at all — it
  just happened to never matter before, since undo was always unavailable in multi-device. Fixed
  alongside this.)

## Scaling & security, for wider release (raised 2026-09-03)

Prompted by "what would I need to do to open this up to dozens/hundreds of players." None of this
blocks a beta with people you know; it matters once the audience is wide enough to include
strangers or scripted traffic.

- **Supabase plan/tier.** Currently on whatever tier the project started on. "Hundreds of people
  trying it over time" is fine; "hundreds of concurrent multi-device games" (each device holds a
  couple of open Realtime channels) could approach free-tier connection/DB-size limits. Check the
  usage dashboard once real beta traffic shows up and upgrade if needed — a config change, not a
  code change.
- **No rate limiting on the public RPCs.** `create_game`, `join_game`, `append_event`, and
  `retract_last_event` are all callable by anyone with the (intentionally public) anon key, with no
  throttling. Fine for a beta shared directly with real players; before a wide-open audience, add
  rate limiting (Supabase supports this at the project level) so scripted traffic can't spam game
  creation or flood the event log.
- **No cleanup job for old games.** `games`/`game_players`/`game_events` rows are never deleted —
  a finished (or abandoned) game just sits in the database forever. Not urgent at dozens/hundreds
  of games, but worth a periodic job (e.g. delete games older than 30 days) before this has been
  running for months. **Extends to `game_summaries`** (added 2026-09-22) — same "never deleted"
  gap, though a summary row is the one place someone can already act unilaterally (soft-delete via
  `deleted_at`, once that UI exists — see `USER_ACCOUNTS_PLAN.md` Phase 4), so the pressure to
  auto-clean it is lower than the raw game tables.
- **`games`/`game_players`/`game_events` are fully publicly *listable*, not just readable if you
  know the code.** Migration `0001_init.sql`'s RLS policies are `for select using (true)` on all
  three tables — i.e. `select * from games` returns every game ever created, not just the one
  matching a code someone was given. A stranger doesn't need to guess a 6-character code; they can
  just list the table directly. **Raised in severity 2026-09-22**, once user accounts landed:
  `game_players.user_id` (migration 0008) now links rows to real signed-in accounts, so this is no
  longer just "low-stakes gameplay data" — anyone with the anon key can correlate which
  authenticated user played which game, with no login or code needed. Still judged acceptable for
  now (per Randy, 2026-09-22): audience is ~30 people he knows personally, not strangers or
  scripted traffic — matches this section's original framing exactly. Revisit once the audience
  broadens past people individually vouched for (a public share, an open invite, etc.), not at any
  particular headcount among known people.
  - **Why this isn't a quick RLS fix**: the same `using (true)` policy that causes the leak is also
    what lets both devices sync a live multi-device game without ever signing in — Supabase
    Realtime's `postgres_changes` decides whether to push a change to an anon-key client by
    evaluating that same SELECT policy, and there's currently no per-device identity (`device_id` is
    a plain client-supplied value, not something RLS can see) for a narrower policy to check against.
    Two real paths, not a patch:
    - **Anonymous Auth** — every device gets a real `auth.uid()` on load (no email/password), RLS
      scopes to game-membership via that uid, Realtime respects it automatically. Idiomatic fix, but
      touches the client's init flow and all six RPCs that currently trust a bare `device_id`
      parameter (`create_game`, `join_game`, `append_event`, `retract_last_event`, `claim_device`,
      `record_single_device_game`), plus a full multi-device re-test.
    - **RPC-only reads + Realtime Broadcast** instead of table-change subscriptions — narrower
      guarantee (stops full-table enumeration, not "read any game you can guess the id of"), requires
      rewriting all three `subscribeTo*` functions and adding per-game channel tokens.
- **`game_summaries` INSERT has no game-membership check** (raised 2026-09-22, alongside the
  personal-history build) — the RLS policy only checks `auth.uid() = user_id`, not that the caller
  actually played that `game_id`. A signed-in user could insert a fabricated summary row against any
  real, enumerable (per the point above) game they never played. Low impact — pollutes only their
  own stats, no cross-user leakage, since the same self-only check still blocks touching anyone
  else's row — but same class of gap as the point below.
- **`record_single_device_game` has no cap on event-array size** (raised 2026-09-22) — a signed-in
  user calling it directly (not through the UI) could pass a huge `p_events` array to bloat the DB.
  Minor cost/DoS vector; authenticated-only, so lower urgency than the anon-key items above.
- **No game-membership check on the write RPCs.** `append_event` and `retract_last_event` only
  check that the game exists (and, for retract, that the race guard matches) — neither checks that
  the caller's `device_id` actually has a slot in that game via `game_players`. Combined with the
  point above, anyone who can enumerate or guess a game_id can write to or retract from a game
  they're not part of. Low risk today (small trusted beta), but worth closing — check
  `game_players` for a matching `(game_id, device_id)` row — before opening this to strangers.
- **`device_id` still isn't an authentication boundary** (documented as a deliberate tradeoff when
  it was introduced — see `getDeviceId()`'s comment in `fleet-chrono.html`): it's a client-generated
  UUID passed as a plain parameter, so anyone who learns another device's ID can act as that device
  (rejoin their slot, undo their moves, etc.). Fine for two people who agreed to play together in
  the same room; worth revisiting (e.g. a per-game secret token instead of a reusable per-device ID)
  if the audience broadens past "people who trust each other enough to share a game code."

## From beta-test feedback (raised 2026-09-06)

- **Waiting-screen redesign.** While it's the other player's turn in a split (ship/squadron) phase,
  the idle player's screen still shows the full live-game UI, just with their own controls hidden —
  the shared "Begin Squadron Phase" button de-emphasis (built 2026-09-06, see below) helps but the
  screen doesn't clearly read as "not your move." Idea floated: while idle, dim/overlay the screen
  (semi-opaque) with "Waiting for First/Second Player" text, leaving only Pause/Resume and Exit Game
  reachable. Deferred rather than built immediately — more visual/state work than the same-session
  fixes, and worth confirming the smaller fixes (button de-emphasis, debounce, resync) are enough
  before adding a bigger UI mode.
- ~~Wake-from-sleep unresponsive buttons / multi-tap advancing the turn cycle~~ — **built
  2026-09-06.** A single global `actionPending` guard now wraps every true onclick entry point
  (`tapPass`, `handleDoneOrUndo`, `handleUndoIconTap`, `togglePause`, `advancePhase`,
  `beginNextRound`, `endGameNow`) with `if(!beginAction()) return;` / `try{…}finally{endAction();}`,
  so a rapid double-tap after waking a phone can't double-submit before the first tap's round-trip
  (local update or, in multi-device mode, the realtime echo) completes. Internal functions those
  entry points call (`tapDone`, `undo`, `pauseGame`, `resumeGame`) are deliberately left unguarded,
  since they're only ever reached through an already-guarded caller — guarding them too would
  deadlock the legitimate internal call.
- ~~Shared "Begin Squadron Phase" button reads as this device's action even when it isn't~~ —
  **built 2026-09-06.** In multi-device split-view phases, the shared advance button now gets a
  `.secondary-shared` class (ghosted: transparent background, hairline border, no glow) whenever
  the current active player isn't this device's own slot, so the bold/filled look is reserved for
  whichever device the action actually belongs to. Single-device mode and non-split phases are
  unaffected.
- ~~Refresh/reconnect could strand a player out of a live multi-device game~~ — **first pass built
  2026-09-06, not fully verified against real device screen-lock behavior.** Two changes: (1) a
  `visibilitychange` listener triggers a resync (`onVisibleResync`, set per-screen — lobby/join-wait/
  live-game — and cleared on leaving each) the moment a backgrounded tab becomes visible again, since
  a phone's screen lock can freeze a WebSocket without ever firing the close/error event
  `makeReconnectHandler` relies on, silently preventing that handler from ever detecting the drop;
  (2) a small QR-icon button in the live-game header (`showCodeOverlay()`) re-displays the join code,
  QR, and link from inside an already-live game, giving a manual fallback if a player does end up
  disconnected and needs to rejoin. Not yet confirmed against genuine iOS screen-lock/backgrounding —
  couldn't be reproduced in the dev/test environment — so treat as a strong first pass, not a
  guaranteed fix, until it's been through another real beta session.
