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
- User accounts: associating a player's games/data with a persistent identity so they can see
  their pace/performance trends over time, across games. Much later problem — no auth, no
  accounts, no cross-game history exist yet.
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
