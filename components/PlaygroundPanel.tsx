"use client";
import { useState } from "react";
import InstructionCards from "./InstructionCards";
import DoodleGame from "./DoodleGame";

type Employee = { id: string; name: string; department: string; email: string };

export default function PlaygroundPanel({ employee }: { employee: Employee }) {
  const [phase, setPhase] = useState<"entry" | "instructions" | "game" | "done">("entry");

  if (phase === "done") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-black text-white">Doodle Submitted!</h2>
        <p className="text-white/60">Your doodle is now live in the gallery. Check it out on the right and vote for your favourites!</p>
        <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto" />
        <p className="text-white/40 text-sm">Voting is open until 6 PM</p>
      </div>
    );
  }

  if (phase === "instructions") {
    return <InstructionCards onComplete={() => setPhase("game")} />;
  }

  if (phase === "game") {
    return <DoodleGame employee={employee} onComplete={() => setPhase("done")} />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="space-y-2">
        <div className="text-6xl animate-bounce">🖌️</div>
        <h2 className="text-3xl font-black text-white">Playground</h2>
        <p className="text-white/60 max-w-xs">
          You&apos;ll get 3 surprise prompts. Draw each one in 2 minutes. Pick your best to submit!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[["3", "Surprise Prompts"], ["2 min", "Per Doodle"], ["1", "Submission"]].map(([val, label]) => (
          <div key={label} className="card p-3 space-y-1">
            <div className="text-2xl font-black text-purple-400">{val}</div>
            <div className="text-xs text-white/50">{label}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setPhase("instructions")} className="btn-primary text-lg px-8 py-4">
        Enter Playground →
      </button>
    </div>
  );
}
