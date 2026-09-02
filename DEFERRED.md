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
- Reconnect handling for multi-device games: once game state lives server-side, a device
  refreshing, losing connection, or being closed mid-game shouldn't destroy the game for the
  other player. Related to (but distinct from) the local-storage resume feature added for
  single-device — that's client-only; this is "can I rejoin a server-tracked game I was already
  part of."
