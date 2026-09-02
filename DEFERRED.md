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
- Undo in multi-device games: not built in the initial gameplay-sync pass (2026-09-02) — the Undo
  button is hidden entirely for multi-device games. Single-device undo just splices the local
  `events` array, which has no server-side equivalent yet; supporting it would need a
  `retract_last_event`-style DELETE RPC plus a realtime DELETE handler on the client (with
  `REPLICA IDENTITY FULL` on `game_events` so the delete payload carries the row being removed) —
  judged to be its own sub-feature, not a drop-in addition to the sync work.
