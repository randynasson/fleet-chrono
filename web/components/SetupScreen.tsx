"use client";

import { useState } from "react";
import { GameSetup } from "@/lib/types";

export default function SetupScreen({
  onStart,
}: {
  onStart: (setup: GameSetup) => void;
}) {
  const [p1name, setP1name] = useState("Rebel Fleet");
  const [p2name, setP2name] = useState("Imperial Fleet");
  const [roundLimit, setRoundLimit] = useState("6");
  const [durH, setDurH] = useState("2");
  const [durM, setDurM] = useState("15");

  function handleStart() {
    const players: [string, string] = [
      p1name.trim() || "Commander 1",
      p2name.trim() || "Commander 2",
    ];
    const h = parseInt(durH, 10) || 0;
    const m = parseInt(durM, 10) || 0;
    onStart({
      players,
      roundLimit: parseInt(roundLimit, 10) || 6,
      targetDurationSec: h * 3600 + m * 60,
    });
  }

  return (
    <div className="flex h-full flex-col p-10 px-7">
      <h1 className="mb-1 text-[22px] font-bold tracking-tight">Fleet Chrono</h1>
      <p className="mb-9 text-sm leading-relaxed text-text-dim">
        Tournament game timer for Star Wars: Armada. Tracks the round clock,
        phases, and each commander&apos;s turn time.
      </p>

      <Field label="Commander 1">
        <input
          className="input"
          type="text"
          placeholder="e.g. Sato"
          value={p1name}
          onChange={(e) => setP1name(e.target.value)}
        />
      </Field>
      <Field label="Commander 2">
        <input
          className="input"
          type="text"
          placeholder="e.g. Ozzel"
          value={p2name}
          onChange={(e) => setP2name(e.target.value)}
        />
      </Field>
      <Field label="Round limit">
        <input
          className="input"
          type="text"
          inputMode="numeric"
          value={roundLimit}
          onChange={(e) => setRoundLimit(e.target.value)}
        />
      </Field>
      <div className="mb-5">
        <label className="mb-2 block text-[13px] text-text-dim">
          Game clock (target duration)
        </label>
        <div className="flex gap-2.5">
          <input
            className="input flex-1 text-center font-mono"
            type="text"
            inputMode="numeric"
            value={durH}
            onChange={(e) => setDurH(e.target.value)}
          />
          <input
            className="input flex-1 text-center font-mono"
            type="text"
            inputMode="numeric"
            value={durM}
            onChange={(e) => setDurM(e.target.value)}
          />
        </div>
        <div className="mt-[-14px] flex gap-2.5 text-[11px] text-text-dim">
          <div className="flex-1 text-center">hours</div>
          <div className="flex-1 text-center">minutes</div>
        </div>
      </div>

      <div className="flex-1" />
      <button
        className="rounded-xl bg-amber p-4 text-base font-semibold text-[#241804] active:bg-[#d1922f]"
        onClick={handleStart}
      >
        Start game
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-[13px] text-text-dim">{label}</label>
      {children}
    </div>
  );
}
