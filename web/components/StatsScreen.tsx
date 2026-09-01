"use client";

import { GameEvent, PHASE_LABELS, PHASE_SEQUENCE } from "@/lib/types";
import { computeStats, getGameStart } from "@/lib/engine";
import { fmt } from "@/lib/format";

export default function StatsScreen({
  events,
  onNewGame,
}: {
  events: GameEvent[];
  onNewGame: () => void;
}) {
  const gameStart = getGameStart(events);
  const stats = computeStats(events);
  const rounds = Object.keys(stats.roundPlayerTotals)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="h-full overflow-y-auto p-[22px] px-[22px] pt-7">
      <h2 className="mb-0.5 text-xl font-bold">Game complete</h2>
      <div className="mb-6 text-[13px] text-text-dim">
        Total time: {fmt(stats.totalElapsedSec, true)} · {gameStart.roundLimit} rounds
      </div>

      <StatBlock title="TOTAL TIME ON CLOCK">
        {([0, 1] as const).map((pi) => (
          <PlayerStatRow
            key={pi}
            dot={pi === 0 ? "amber" : "cyan"}
            name={gameStart.players[pi]}
            value={fmt(stats.totals[pi])}
          />
        ))}
      </StatBlock>

      <StatBlock title="AVERAGE PER ACTIVATION">
        {([0, 1] as const).map((pi) => (
          <PlayerStatRow
            key={pi}
            dot={pi === 0 ? "amber" : "cyan"}
            name={`${gameStart.players[pi]} (${stats.activationCounts[pi]} activations)`}
            value={fmt(stats.averages[pi])}
          />
        ))}
      </StatBlock>

      <StatBlock title="TIME BY PHASE">
        <div className="grid grid-cols-2 gap-2.5">
          {PHASE_SEQUENCE.map((p) => (
            <div key={p} className="rounded-[10px] bg-panel-raised p-3">
              <div className="mb-1 text-[11px] text-text-dim">{PHASE_LABELS[p]}</div>
              <div className="font-mono text-base font-bold">{fmt(stats.phaseTotals[p])}</div>
            </div>
          ))}
        </div>
      </StatBlock>

      <StatBlock title="SHARE OF TURN TIME PER ROUND">
        {rounds.length === 0 ? (
          <div className="text-[13px] text-text-dim">No timed activations recorded.</div>
        ) : (
          rounds.map((r) => {
            const rp = stats.roundPlayerTotals[r];
            const total = rp[0] + rp[1] || 1;
            const pct0 = ((rp[0] / total) * 100).toFixed(0);
            const pct1 = ((rp[1] / total) * 100).toFixed(0);
            return (
              <div key={r} className="mb-3">
                <div className="mb-1.5 flex justify-between text-xs text-text-dim">
                  <span>Round {r}</span>
                  <span>{fmt(rp[0] + rp[1])} on clock</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-void">
                  <div className="bg-amber" style={{ width: `${pct0}%` }} />
                  <div className="bg-cyan" style={{ width: `${pct1}%` }} />
                </div>
              </div>
            );
          })
        )}
      </StatBlock>

      <button
        className="w-full rounded-xl border border-hairline bg-transparent p-4 text-base font-semibold text-text active:bg-panel-raised"
        onClick={onNewGame}
      >
        New game
      </button>
    </div>
  );
}

function StatBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-[26px]">
      <h3 className="mb-2.5 text-xs font-semibold text-text-dim">{title}</h3>
      {children}
    </div>
  );
}

function PlayerStatRow({
  dot,
  name,
  value,
}: {
  dot: "amber" | "cyan";
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline py-3 last:border-b-0">
      <span className={`h-2.5 w-2.5 flex-none rounded-full ${dot === "amber" ? "bg-amber" : "bg-cyan"}`} />
      <span className="flex-1 text-sm font-semibold">{name}</span>
      <span className="font-mono text-[15px]">{value}</span>
    </div>
  );
}
