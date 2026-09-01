"use client";

import {
  GameEvent,
  PHASE_LABELS,
  PHASE_SEQUENCE,
  PLAYER_TIMED_PHASES,
  PlayerIdx,
} from "@/lib/types";
import { activeTurn, currentPhaseEvent, getGameStart } from "@/lib/engine";
import { fmt } from "@/lib/format";

export default function LiveScreen({
  events,
  now,
  onTapMyTurn,
  onTapPass,
  onUndo,
  onAdvance,
}: {
  events: GameEvent[];
  now: number;
  onTapMyTurn: (player: PlayerIdx) => void;
  onTapPass: (player: PlayerIdx) => void;
  onUndo: () => void;
  onAdvance: () => void;
}) {
  const gameStart = getGameStart(events);
  const ps = currentPhaseEvent(events);
  if (!ps) return null;

  const elapsed = (now - gameStart.ts) / 1000;
  const remaining = gameStart.targetDurationSec - elapsed;
  const overtime = remaining <= 0;

  const shared = !PLAYER_TIMED_PHASES.includes(ps.phase);
  const at = activeTurn(events);

  const idx = PHASE_SEQUENCE.indexOf(ps.phase);
  const isLast = idx === PHASE_SEQUENCE.length - 1 && ps.round === gameStart.roundLimit;

  return (
    <div className="flex h-full flex-col">
      {overtime && (
        <div className="bg-red-dim py-1.5 text-center text-xs font-semibold tracking-wide text-red">
          GAME CLOCK EXPIRED — IN OVERTIME
        </div>
      )}

      <div className="flex items-baseline justify-between border-b border-hairline px-5 py-4 pb-4">
        <div className={`font-mono text-[28px] font-bold ${overtime ? "text-red" : ""}`}>
          {overtime ? `+${fmt(-remaining, true)}` : fmt(remaining, true)}
        </div>
        <div className="text-right">
          <div className="text-[13px] text-text-dim">
            Round {ps.round} of {gameStart.roundLimit}
          </div>
          <div className="mt-0.5 text-[15px] font-semibold">{PHASE_LABELS[ps.phase]}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 px-5">
        {shared ? (
          <SharedPhaseView phase={ps.phase} phaseStartTs={ps.ts} now={now} />
        ) : (
          <SplitView
            players={gameStart.players}
            activeTurnPlayer={at?.player ?? null}
            activeTurnStartTs={at?.ts ?? null}
            now={now}
            events={events}
            round={ps.round}
            phase={ps.phase}
            onTapMyTurn={onTapMyTurn}
            onTapPass={onTapPass}
          />
        )}
      </div>

      <div className="flex gap-2.5 border-t border-hairline px-5 pb-[22px] pt-4">
        <button
          className="flex w-[52px] flex-none items-center justify-center rounded-xl border border-hairline text-text-dim"
          onClick={onUndo}
          title="Undo last action"
        >
          ↶
        </button>
        <button
          className="flex-1 rounded-xl bg-amber p-4 text-base font-semibold text-[#241804]"
          onClick={onAdvance}
        >
          {isLast ? "End Game" : `End ${PHASE_LABELS[ps.phase]}`}
        </button>
      </div>
    </div>
  );
}

function SharedPhaseView({
  phase,
  phaseStartTs,
  now,
}: {
  phase: keyof typeof PHASE_LABELS;
  phaseStartTs: number;
  now: number;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-3.5 text-base text-text-dim">{PHASE_LABELS[phase]}</div>
      <div className="mb-2 font-mono text-[56px] font-bold">
        {fmt((now - phaseStartTs) / 1000)}
      </div>
      <div className="max-w-[260px] text-[13px] leading-relaxed text-text-dim">
        Simultaneous phase — not attributed to a single commander.
      </div>
    </div>
  );
}

function SplitView({
  players,
  activeTurnPlayer,
  activeTurnStartTs,
  now,
  events,
  round,
  phase,
  onTapMyTurn,
  onTapPass,
}: {
  players: [string, string];
  activeTurnPlayer: PlayerIdx | null;
  activeTurnStartTs: number | null;
  now: number;
  events: GameEvent[];
  round: number;
  phase: string;
  onTapMyTurn: (player: PlayerIdx) => void;
  onTapPass: (player: PlayerIdx) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3.5">
      {([0, 1] as PlayerIdx[]).map((pi) => {
        const isActive = activeTurnPlayer === pi;
        const passed = events.some(
          (e) => e.type === "pass" && e.player === pi && e.round === round && e.phase === phase,
        );
        const accent = pi === 0 ? "amber" : "cyan";
        return (
          <div
            key={pi}
            className={`flex flex-1 flex-col justify-between rounded-2xl border p-5 transition-colors ${
              isActive
                ? accent === "amber"
                  ? "border-amber bg-amber-dim"
                  : "border-cyan bg-cyan-dim"
                : "border-hairline bg-panel-raised"
            }`}
          >
            <div>
              <div className="text-[15px] font-semibold">{players[pi]}</div>
              <div className="mt-0.5 text-xs text-text-dim">
                {isActive ? "Active — activation in progress" : passed ? "Passed" : "Idle"}
              </div>
            </div>
            <div className="my-3.5 font-mono text-[40px] font-bold">
              {isActive && activeTurnStartTs ? fmt((now - activeTurnStartTs) / 1000) : "00:00"}
            </div>
            <div className="flex gap-2">
              <button
                className={`flex-1 rounded-xl p-3 text-sm font-semibold ${
                  accent === "amber" ? "bg-amber text-[#241804]" : "bg-cyan text-[#062626]"
                }`}
                onClick={() => onTapMyTurn(pi)}
              >
                My Turn
              </button>
              <button
                className="flex-1 rounded-xl border border-hairline p-3 text-sm text-text-dim"
                onClick={() => onTapPass(pi)}
              >
                Pass
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
