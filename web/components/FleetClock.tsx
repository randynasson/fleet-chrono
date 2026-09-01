"use client";

import { useEffect, useState } from "react";
import { GameEvent, GameSetup, PlayerIdx } from "@/lib/types";
import * as engine from "@/lib/engine";
import SetupScreen from "./SetupScreen";
import LiveScreen from "./LiveScreen";
import StatsScreen from "./StatsScreen";

type Screen = "setup" | "live" | "stats";

export default function FleetClock() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [screen, setScreen] = useState<Screen>("setup");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (screen !== "live") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [screen]);

  function handleStart(setup: GameSetup) {
    setEvents(engine.startGame(setup, Date.now()));
    setNow(Date.now());
    setScreen("live");
  }

  function handleTapMyTurn(player: PlayerIdx) {
    setEvents(engine.tapMyTurn(events, player, Date.now()));
  }

  function handleTapPass(player: PlayerIdx) {
    setEvents(engine.tapPass(events, player, Date.now()));
  }

  function handleUndo() {
    setEvents(engine.undo(events));
  }

  function handleAdvance() {
    const { events: next, ended } = engine.advancePhase(events, engine.getGameStart(events).roundLimit, Date.now());
    setEvents(next);
    if (ended) setScreen("stats");
  }

  function handleNewGame() {
    setEvents([]);
    setScreen("setup");
  }

  return (
    <div className="flex min-h-[760px] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-hairline bg-panel shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
      {screen === "setup" && <SetupScreen onStart={handleStart} />}
      {screen === "live" && (
        <LiveScreen
          events={events}
          now={now}
          onTapMyTurn={handleTapMyTurn}
          onTapPass={handleTapPass}
          onUndo={handleUndo}
          onAdvance={handleAdvance}
        />
      )}
      {screen === "stats" && <StatsScreen events={events} onNewGame={handleNewGame} />}
    </div>
  );
}
