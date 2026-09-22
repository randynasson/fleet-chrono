# Fleet Chrono

A tournament game timer for **Star Wars: Armada** — tracks the round clock, phase sequence, and each player's activation time, live at the table.

**Live app:** https://fleetchrono.app

## What it does

Standard tournament rounds run 2h15m. Fleet Chrono replaces the usual "phone timer that just stops at zero" with something that actually shows where the time went:

- A single game clock counting down from the round target — at zero it flips into a clearly-marked overtime state and keeps counting up, rather than stopping.
- The phase sequence per round (Place Obstacles → Deploy Fleets once, then Command → Ship → Squadron → Status each round), across a configurable round limit.
- Per-player activation time within Ship and Squadron phases — a stopwatch, not a chess clock; there's no time pressure, it's pure telemetry.
- A stats screen at game end: total time on the clock per player, average per activation, a phase-by-phase breakdown, and a pace analysis explaining *why* a game ran long.

Works in two modes:
- **Single device** — one phone shared on the table between both players.
- **Multi-device** — each player on their own phone, kept in sync in real time (Supabase Realtime backend), including undo and reconnect handling if a device refreshes or drops connection mid-game.

## Try it

Open the **[live app](https://fleetchrono.app)** — no install, no account. Pick "Just me, on this device" for single-device, or "Tandem, on two devices" / "I'm joining a game" to sync across two phones.

## How it's built

A single self-contained HTML file (`armada-clock.html`) — no build step, no framework. All game state is derived from a flat, append-only event log rather than stored as mutable state:

- **Undo** = delete the last event(s) and re-derive state from what's left.
- **Multi-device sync** = both devices append to and read the same log via Supabase Postgres + Realtime; nothing is merged, since the log is append-only.
- **Timer accuracy** survives a backgrounded tab, since every displayed time is computed as `now - eventTimestamp` on each render, not accumulated by a ticking counter.

See [`SPEC.md`](SPEC.md) for the full design rationale and architecture notes.

## Repo layout

| Path | What it is |
|---|---|
| `armada-clock.html` | The app. Single file — open it directly, or serve it statically. |
| `supabase/migrations/` | The Postgres schema and RPC functions behind multi-device sync. |
| `archive/armada-clock-utilitarian.html` | The original plain/utilitarian design, kept for reference. |
| `archive/armada-clock-holo-tactical-violet.html` | The prior live design, kept for reference — same visual system as today's app, but with the denser dual-panel live-game screens before the information-density simplification. |
| `design_handoff_fleet_chrono_holo_tactical/` | The design handoff for the "Holo Tactical Violet" visual style the app still uses. |
| `SPEC.md` | Product concept, decisions made, and architecture notes. |
| `DEFERRED.md` | Ideas and known gaps intentionally not built yet. |
| `USER_ACCOUNTS_PLAN.md` | Planned schema/auth/security design for user accounts and personal game history — not yet built. |

## Status

Functional for real single- and multi-device tournament use — see [`DEFERRED.md`](DEFERRED.md) for what's deliberately not built yet.
