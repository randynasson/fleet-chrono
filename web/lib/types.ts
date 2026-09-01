export type Phase = "command" | "ship" | "squadron" | "status";
export type PlayerIdx = 0 | 1;

export interface GameStartEvent {
  type: "game_start";
  ts: number;
  players: [string, string];
  roundLimit: number;
  targetDurationSec: number;
}
export interface PhaseStartEvent {
  type: "phase_start";
  ts: number;
  phase: Phase;
  round: number;
}
export interface PhaseEndEvent {
  type: "phase_end";
  ts: number;
  phase: Phase;
  round: number;
}
export interface TurnStartEvent {
  type: "turn_start";
  ts: number;
  player: PlayerIdx;
  phase: Phase;
  round: number;
}
export interface TurnEndEvent {
  type: "turn_end";
  ts: number;
  player: PlayerIdx;
  phase: Phase;
  round: number;
}
export interface PassEvent {
  type: "pass";
  ts: number;
  player: PlayerIdx;
  phase: Phase;
  round: number;
}
export interface RoundEndEvent {
  type: "round_end";
  ts: number;
  round: number;
}
export interface GameEndEvent {
  type: "game_end";
  ts: number;
}

export type GameEvent =
  | GameStartEvent
  | PhaseStartEvent
  | PhaseEndEvent
  | TurnStartEvent
  | TurnEndEvent
  | PassEvent
  | RoundEndEvent
  | GameEndEvent;

export const PHASE_SEQUENCE: Phase[] = ["command", "ship", "squadron", "status"];
export const PHASE_LABELS: Record<Phase, string> = {
  command: "Command Phase",
  ship: "Ship Phase",
  squadron: "Squadron Phase",
  status: "Status Phase",
};
export const PLAYER_TIMED_PHASES: Phase[] = ["ship", "squadron"];

export interface GameSetup {
  players: [string, string];
  roundLimit: number;
  targetDurationSec: number;
}
