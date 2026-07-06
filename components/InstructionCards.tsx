"use client";
import { useState } from "react";

const CARDS = [
  { emoji: "🎯", title: "Your Mission", body: "You will receive 3 surprise prompts — one at a time. Each prompt is a phrase you need to draw." },
  { emoji: "⏱️", title: "The Clock", body: "You have exactly 5 minutes per doodle. The canvas locks when time is up. Draw fast, draw fun!" },
  { emoji: "🔁", title: "3 Tries", body: "After each doodle, you can retry and get a new surprise prompt — up to 3 times total. The 3rd is your last chance!" },
  { emoji: "🏆", title: "Pick Your Best", body: "After all 3 tries, preview all your doodles and pick the one you want to submit to the gallery." },
  { emoji: "🗳️", title: "Vote!", body: "Once submitted, vote for other doodles in the gallery. Rank your top 3 — 🥇 #1, 🥈 #2, 🥉 #3 — on different doodles. You cannot vote for your own." },
  { emoji: "🎁", title: "Win Goodies", body: "Top 3 most-voted doodles win surprise goodies! Vote counts stay hidden until then — results will be announced soon after submissions close. Good luck!" },
];

export default function InstructionCards({ onComplete }: { onComplete: () => void }) {
  const [current, setCurrent] = useState(0);
  const card = CARDS[current];
  const isLast = current === CARDS.length - 1;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {CARDS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full border-2 border-ink transition-all ${i === current ? "w-8 bg-crayon-purple" : i < current ? "w-4 bg-crayon-green" : "w-4 bg-white"}`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="card p-8 max-w-sm w-full text-center space-y-4 animate-fade-in wobble-l">
        <div className="text-7xl">{card.emoji}</div>
        <h2 className="text-3xl font-hand font-bold text-crayon-purple">{card.title}</h2>
        <p className="text-ink/80 font-body leading-relaxed">{card.body}</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 mt-8">
        {current > 0 && (
          <button onClick={() => setCurrent(current - 1)} className="btn-secondary">
            ← Back
          </button>
        )}
        <button onClick={() => isLast ? onComplete() : setCurrent(current + 1)} className="btn-primary text-lg">
          {isLast ? "Let's Doodle! 🎨" : "Next →"}
        </button>
      </div>

      <p className="text-ink/40 text-xs mt-4 font-body">{current + 1} of {CARDS.length}</p>
    </div>
  );
}
