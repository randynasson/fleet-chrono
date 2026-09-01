import {
  GameEndEvent,
  GameEvent,
  GameSetup,
  GameStartEvent,
  PHASE_SEQUENCE,
  PLAYER_TIMED_PHASES,
  Phase,
  PhaseStartEvent,
  PlayerIdx,
  TurnStartEvent,
} from "./types";

/** Everything here is a pure function over the event log — see SPEC.md
 * "Architecture: event log as source of truth". No mutation, no stored
 * aggregates: derived state and the next log are always recomputed. */

export function startGame(setup: GameSetup, ts: number): GameEvent[] {
  const gameStart: GameStartEvent = { type: "game_start", ts, ...setup };
  const firstPhase: PhaseStartEvent = {
    type: "phase_start",
    phase: "command",
    round: 1,
    ts,
  };
  return [gameStart, firstPhase];
}

export function getGameStart(events: GameEvent[]): GameStartEvent {
  const e = events[0];
  if (e.type !== "game_start") throw new Error("log does not start with game_start");
  return e;
}

export function currentPhaseEvent(events: GameEvent[]): PhaseStartEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "phase_start") return e;
  }
  return null;
}

export function activeTurn(events: GameEvent[]): TurnStartEvent | null {
  const ps = currentPhaseEvent(events);
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e === ps) break;
    if (e.type === "turn_end") return null;
    if (e.type === "turn_start") return e;
  }
  return null;
}

export function isGameEnded(events: GameEvent[]): boolean {
  return events.some((e) => e.type === "game_end");
}

export function tapMyTurn(
  events: GameEvent[],
  playerIdx: PlayerIdx,
  ts: number,
): GameEvent[] {
  if (isGameEnded(events)) return events;
  const at = activeTurn(events);
  const ps = currentPhaseEvent(events);
  if (!ps) return events;
  const next = [...events];
  if (at) {
    next.push({ type: "turn_end", player: at.player, phase: ps.phase, round: ps.round, ts });
  }
  // Tapping your own already-active turn again just closes it (mis-tap / "I'm done").
  // Flagged as not fully settled — see DEFERRED.md.
  if (at && at.player === playerIdx) return next;
  next.push({ type: "turn_start", player: playerIdx, phase: ps.phase, round: ps.round, ts });
  return next;
}

export function tapPass(
  events: GameEvent[],
  playerIdx: PlayerIdx,
  ts: number,
): GameEvent[] {
  if (isGameEnded(events)) return events;
  const at = activeTurn(events);
  const ps = currentPhaseEvent(events);
  if (!ps) return events;
  const next = [...events];
  if (at && at.player === playerIdx) {
    next.push({ type: "turn_end", player: at.player, phase: ps.phase, round: ps.round, ts });
  }
  next.push({ type: "pass", player: playerIdx, phase: ps.phase, round: ps.round, ts });
  return next;
}

export function undo(events: GameEvent[]): GameEvent[] {
  // Never undo past the initial game_start + first phase_start.
  if (events.length <= 2) return events;
  const next = events.slice(0, -1);
  if (next[next.length - 1].type === "game_start") {
    const gs = next[0] as GameStartEvent;
    next.push({ type: "phase_start", phase: "command", round: 1, ts: gs.ts });
  }
  return next;
}

export function advancePhase(
  events: GameEvent[],
  roundLimit: number,
  ts: number,
): { events: GameEvent[]; ended: boolean } {
  const ps = currentPhaseEvent(events);
  if (!ps) return { events, ended: false };
  const at = activeTurn(events);
  const next = [...events];
  if (at) {
    next.push({ type: "turn_end", player: at.player, phase: ps.phase, round: ps.round, ts });
  }
  next.push({ type: "phase_end", phase: ps.phase, round: ps.round, ts });

  const idx = PHASE_SEQUENCE.indexOf(ps.phase);
  if (idx < PHASE_SEQUENCE.length - 1) {
    const nextPhase = PHASE_SEQUENCE[idx + 1];
    next.push({ type: "phase_start", phase: nextPhase, round: ps.round, ts });
    return { events: next, ended: false };
  }

  next.push({ type: "round_end", round: ps.round, ts });
  if (ps.round < roundLimit) {
    next.push({ type: "phase_start", phase: "command", round: ps.round + 1, ts });
    return { events: next, ended: false };
  }
  const gameEnd: GameEndEvent = { type: "game_end", ts };
  next.push(gameEnd);
  return { events: next, ended: true };
}

/* ---------------- stats derivation ---------------- */

export interface GameStats {
  totalElapsedSec: number;
  totals: [number, number];
  averages: [number, number];
  activationCounts: [number, number];
  phaseTotals: Record<Phase, number>;
  roundPlayerTotals: Record<number, [number, number]>;
}

export function computeStats(events: GameEvent[]): GameStats {
  const gameStart = getGameStart(events);
  const totalElapsedSec = (events[events.length - 1].ts - gameStart.ts) / 1000;

  const durations: [number[], number[]] = [[], []];
  const phaseTotals: Record<Phase, number> = { command: 0, ship: 0, squadron: 0, status: 0 };
  const roundPlayerTotals: Record<number, [number, number]> = {};

  let openTurn: TurnStartEvent | null = null;
  for (const e of events) {
    if (e.type === "turn_start") {
      openTurn = e;
    } else if (e.type === "turn_end" && openTurn) {
      const d = (e.ts - openTurn.ts) / 1000;
      durations[openTurn.player].push(d);
      phaseTotals[openTurn.phase] += d;
      const rpt = roundPlayerTotals[openTurn.round] ?? [0, 0];
      rpt[openTurn.player] += d;
      roundPlayerTotals[openTurn.round] = rpt;
      openTurn = null;
    }
  }

  let openPhase: PhaseStartEvent | null = null;
  for (const e of events) {
    if (e.type === "phase_start" && !PLAYER_TIMED_PHASES.includes(e.phase)) {
      openPhase = e;
    } else if (e.type === "phase_end" && openPhase) {
      phaseTotals[openPhase.phase] += (e.ts - openPhase.ts) / 1000;
      openPhase = null;
    }
  }

  const totals: [number, number] = [
    durations[0].reduce((a, b) => a + b, 0),
    durations[1].reduce((a, b) => a + b, 0),
  ];
  const activationCounts: [number, number] = [durations[0].length, durations[1].length];
  const averages: [number, number] = [
    activationCounts[0] ? totals[0] / activationCounts[0] : 0,
    activationCounts[1] ? totals[1] / activationCounts[1] : 0,
  ];

  return { totalElapsedSec, totals, averages, activationCounts, phaseTotals, roundPlayerTotals };
}
