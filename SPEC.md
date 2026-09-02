# Fleet Chrono — Star Wars: Armada Tournament Timer

Mobile-first web app for tracking tournament game time in Star Wars: Armada. Sits on the table between two players during a match.

## Concept

Standard tournament rounds run 2h15m. Currently players self-police with a phone timer or alarm, which just stops (or is ignored) at expiry — there's no clean way to see how far into overtime a game has run, and no visibility into where time actually went (which player, which phase).

Fleet Chrono:
- Runs a single game clock counting down from the round target. At zero, it doesn't stop — it flips into a clearly-marked overtime state and keeps counting up until players end the game.
- Tracks the fixed phase sequence per round: **command → ship → squadron → status**, across a configurable round limit (default 6).
- Within ship and squadron phases (where players alternate ship/squadron activations), tracks each player's individual turn time, chess-clock style — but as a **stopwatch only, no time bank / no pressure**. This is pure telemetry, not a competitive constraint.
- Command and status phases are **shared/simultaneous** — timed as a single phase duration, not attributed to either player.
- At game end, shows stats: total time on the clock per player, average time per activation, time broken down by phase type, and a per-round split of who used the clock.

## Product decisions already made (don't re-litigate without reason)

- **No time bank / no countdown pressure per player.** Per-player timers are stopwatches purely for stats. This was an explicit choice over a chess-clock-with-bank model.
- **Command and status phases are not attributed to a player.** Only ship and squadron phases split time between players.
- **Turn attribution is manual, not auto-alternating.** Players tap "My Turn" to claim an activation. This is deliberate — Armada has pass tokens and uneven activation counts (one side can have more ships/squadrons than the other), so the app must not assume strict alternation. A **Pass** action exists as a first-class event (zero duration) so passes show up in stats without counting as activation time.
- **Undo is a core feature, not an afterthought.** Mis-taps are expected in a live game. Undo pops the last logged event and re-derives all state from the log — see architecture below for why this is cheap.
- **Sync mode: support both single-device and dual-device.** One phone shared on the table, or each player on their own device kept in sync. Dual-device is the harder mode and should be built after single-device works standalone.
- **Platform: browser-based, not native.** Explicitly chosen over React Native/Flutter. Rationale: the join flow (open a link/QR, no install) *is* the sync UX advantage for a tournament setting — an opponent doesn't need to install anything to sync clocks. Also faster iteration, no app-store friction. PWA (add-to-home-screen, offline cache) is a reasonable later enhancement, not a v1 requirement.
- **Stack direction discussed (not yet committed in code): Next.js + Supabase Realtime** for the dual-device sync layer. Supabase/Firebase both work fine for this; Supabase was favored for a clean JS client.

## Architecture: event log as source of truth

The whole game state is derived by reducing a flat, append-only event log — not stored as a live-mutating state blob. This one decision drives most of the design:

- **Undo = pop the last event and re-derive.** No special-case undo logic needed per action type.
- **Sync = broadcast the event log.** Each client appends events; both clients reduce the same log to the same state. No merge-conflict logic needed since it's append-only.
- **Stats = a reduction over the log.** Nothing needs to be pre-aggregated or stored redundantly.
- **Timer accuracy survives backgrounding.** Because every event carries a timestamp (`Date.now()`), elapsed time is always computed as `now - startedAtTimestamp` on render, never accumulated via a ticking counter. This avoids drift/loss when a mobile browser throttles `setInterval` on a backgrounded or locked tab.

### Event types

```
game_start   { targetDurationSec, ts }
phase_start  { phase: command|ship|squadron|status, round, ts }
phase_end    { phase, round, ts }
turn_start   { player, phase, round, ts }   // ship/squadron only
turn_end     { player, phase, round, ts }   // ship/squadron only
pass         { player, phase, round, ts }   // ship/squadron only, zero duration
round_end    { round, ts }
game_end     { ts }
```
(`undo` is not itself a stored event — it pops the last entry from the log.)

### Derived state (computed from the log on each render, not stored)

- Current round + phase: last `phase_start` not yet matched by a `phase_end`.
- Active turn: within the current open phase, the last `turn_start` not yet matched by a `turn_end`.
- Game clock remaining/overtime: `targetDurationSec - (now - game_start.ts)`; negative = overtime, display flips state.
- Stats: pair up `turn_start`/`turn_end` events per player for total & average activation time; sum shared `phase_start`/`phase_end` durations for command/status; group everything by phase type and by round.

### Known edge cases the model needs to keep handling correctly

- A player tapping "My Turn" while the other player's turn is active should close the other player's turn and open theirs (single active-turn invariant).
- A player tapping "My Turn" again while their *own* turn is active currently closes their turn (treated as "I'm done with this activation") — flagged as worth confirming, not fully settled.
- Ending a phase while a turn is still open must auto-insert a `turn_end` at the phase boundary before the `phase_end`, so activation time is never attributed across a phase boundary.
- Undo must not delete past the initial `game_start`/first `phase_start` — the game always has a valid current phase to render.

## Design language (for continuing UI work)

Chosen deliberately to read as a fleet command console glanced at across a table, not a generic SaaS timer app or Star Wars-branded skin (avoids IP/trademark issues, and fits Armada's actual subject: capital-ship fleet battles).

- **Palette**: void navy `#0D1321` (background), steel panel `#1B2436`, hairline `#3A4A63`, signal amber `#E8A33D` (primary/active/player 1), cool cyan `#5FD4D0` (secondary/player 2), alert red `#E5484D` (overtime state only), off-white `#EDEFF4` (text).
- **Type**: JetBrains Mono (tabular figures) for every running number/clock — prevents digit jitter on tick. Inter for labels, buttons, UI chrome. Two typefaces, two distinct jobs.
- **Layout**: single column, stacked by priority. Small always-visible strip up top (game clock + round/phase). Middle stage dynamically changes shape by phase: centered shared clock for command/status, two-player split panels for ship/squadron. Bottom control bar within thumb reach; undo lives here as a small icon button, not buried in a menu.

## Prototype delivered so far

A working single-file HTML/CSS/JS prototype (`armada-clock.html`) implementing the full model above as a standalone page: setup screen, live game screen with dynamic phase-based layout, real ticking timers computed from timestamps (not intervals), undo, and a computed stats screen. No backend, no sync — this is the single-device mode only, meant as the reference implementation for the interaction model before porting into a real Next.js app and adding Supabase sync for dual-device mode.

## Open questions / not yet decided

- Double-tap semantics on your own active turn panel (close it vs. no-op) — see edge case above.
- Whether to allow skipping phases some groups don't bother timing (e.g. status phase) via a settings toggle.
- Exact Supabase schema/channel design for dual-device sync (not yet started — event log model should port over directly as the synced table/channel payload).
- Whether to pursue PWA install/offline support, and if so, at what point.

## Suggested next steps in Claude Code

1. Scaffold a Next.js app; port the prototype's state/render logic into React components and hooks (the reducer-over-event-log model translates directly to a `useReducer` or a small state store).
2. Keep single-device mode fully working and tested before adding sync.
3. Design the Supabase table/channel for the event log (append-only rows, realtime subscription) and wire up a session-code join flow for dual-device mode.
4. Resolve the open questions above as they come up in real use.
