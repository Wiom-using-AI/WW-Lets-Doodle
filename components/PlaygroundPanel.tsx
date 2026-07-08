"use client";
import { useState, useEffect } from "react";
import InstructionCards from "./InstructionCards";
import DoodleGame from "./DoodleGame";

type Employee = { id: string; name: string; department: string; email: string };

export default function PlaygroundPanel({ employee }: { employee: Employee }) {
  const [phase, setPhase] = useState<"loading" | "entry" | "instructions" | "game" | "done">("loading");

  // On load, resume where the employee left off (survives refresh, tab close, incognito re-login).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/game/session"); // GET — does not create
        const data = await res.json();
        if (data.status === "completed" || data.stage === "done") setPhase("done");
        else if (data.exists) setPhase("game"); // mid-game → drop straight back in
        else setPhase("entry"); // first time
      } catch {
        setPhase("entry");
      }
    })();
  }, []);

  if (phase === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-spin">🎨</div>
          <p className="text-ink/60 font-body">Loading your playground...</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="text-7xl wobble-l">🎉</div>
        <h2 className="text-4xl font-hand font-bold text-crayon-green">Doodle Submitted!</h2>
        <div className="card p-5 max-w-xs space-y-2">
          <p className="text-ink/80 font-body">Your doodle is now live in the gallery! Tap the <span className="font-bold text-crayon-pink">Submission Gallery</span> tab above to vote for your favourites.</p>
        </div>
        <p className="text-ink/50 text-sm font-body">Results will be announced soon after submissions close.</p>
      </div>
    );
  }

  if (phase === "instructions") {
    return <InstructionCards onComplete={() => setPhase("game")} />;
  }

  if (phase === "game") {
    return <DoodleGame employee={employee} onComplete={() => setPhase("done")} />;
  }

  const stats: [string, string, string][] = [
    ["3", "Surprise Prompts", "text-crayon-purple"],
    ["7 min", "Per Doodle", "text-crayon-blue"],
    ["1", "Submission", "text-crayon-pink"],
  ];
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="space-y-2">
        <div className="text-7xl animate-bounce">🖌️</div>
        <h2 className="text-4xl sm:text-5xl font-hand font-bold text-crayon-purple">Enter the Playground!</h2>
        <p className="text-ink/80 font-body font-semibold text-lg max-w-sm">
          You&apos;ll get 3 surprise prompts. Draw each one in 7 minutes. Pick your best to submit!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {stats.map(([val, label, color], i) => (
          <div key={label} className="card p-5 space-y-1 animate-sway" style={{ animationDelay: `${i * 0.6}s` }}>
            <div className={`text-4xl sm:text-5xl font-hand font-bold ${color}`}>{val}</div>
            <div className="text-sm leading-tight text-ink/70 font-body font-semibold">{label}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setPhase("instructions")} className="btn-primary text-lg px-8 py-4">
        Enter Playground →
      </button>
    </div>
  );
}
