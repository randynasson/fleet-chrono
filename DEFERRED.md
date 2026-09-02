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
- Reconnect handling for multi-device games, bundled with third-join rejection (build together,
  not separately — they're the same underlying mechanism telling apart "a returning player" from
  "a new one," just triggering opposite outcomes): once game state lives server-side, a device
  refreshing, losing connection, or being closed mid-game shouldn't destroy the game for the other
  player, and should let the *same* player back into their own slot. A game has exactly two player
  slots; once both are filled, a third join attempt against that code should be rejected with a
  clear message ("This game already has two players"), not silently dropped into an undefined
  state. No live-game spectator mode — considered and ruled out; if third-party access is ever
  needed later, it'd be to summaries/logs after the fact, not a live game view. Related to (but
  distinct from) the local-storage resume feature added for single-device — that's client-only;
  this is "can I rejoin a server-tracked game I was already part of."
- Undo in multi-device games: not built in the initial gameplay-sync pass (2026-09-02) — the Undo
  button is hidden entirely for multi-device games. Single-device undo just splices the local
  `events` array, which has no server-side equivalent yet; supporting it would need a
  `retract_last_event`-style DELETE RPC plus a realtime DELETE handler on the client (with
  `REPLICA IDENTITY FULL` on `game_events` so the delete payload carries the row being removed) —
  judged to be its own sub-feature, not a drop-in addition to the sync work.
