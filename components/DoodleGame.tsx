"use client";
import { useState, useEffect } from "react";
import DrawingCanvas from "./DrawingCanvas";

type Employee = { id: string; name: string; department: string };
type DoodleAttempt = { tryNumber: number; prompt: string; imageData: string };

export default function DoodleGame({ employee, onComplete }: { employee: Employee; onComplete: () => void }) {
  const [phase, setPhase] = useState<"loading" | "reveal" | "drawing" | "confirm" | "preview" | "submitting">("loading");
  const [session, setSession] = useState<{ id: string; prompts: string[] } | null>(null);
  const [currentTry, setCurrentTry] = useState(1);
  const [attempts, setAttempts] = useState<DoodleAttempt[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    const res = await fetch("/api/game/session", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSession(data);
      setPhase("reveal");
    } else {
      setError(data.error || "Failed to start game.");
    }
  }

  function handleDrawingComplete(imageData: string) {
    setCurrentImage(imageData);
    setPhase("confirm");
  }

  function handleRetry() {
    setCurrentTry((t) => t + 1);
    setCurrentImage(null);
    setPhase("reveal");
  }

  function handleKeep() {
    const attempt: DoodleAttempt = {
      tryNumber: currentTry,
      prompt: session!.prompts[currentTry - 1],
      imageData: currentImage!,
    };
    const newAttempts = [...attempts, attempt];
    setAttempts(newAttempts);

    if (currentTry < 3) {
      setPhase("preview");
    } else {
      setAttempts(newAttempts);
      setPhase("preview");
    }
  }

  async function handleSubmit(selectedTry: number) {
    setPhase("submitting");
    const attempt = attempts.find((a) => a.tryNumber === selectedTry)!;
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session!.id, tryNumber: selectedTry, imageData: attempt.imageData }),
    });
    if (res.ok) {
      onComplete();
    } else {
      setError("Failed to submit. Please try again.");
      setPhase("preview");
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin">🎨</div>
          <p className="text-white/60">Setting up your canvas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <div className="text-4xl">⚠️</div>
          <p className="text-red-400">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary">Reload</button>
        </div>
      </div>
    );
  }

  if (phase === "reveal") {
    const prompt = session!.prompts[currentTry - 1];
    const isLast = currentTry === 3;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
        {isLast && (
          <div className="px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 font-semibold text-sm">
            ⚠️ This is your last chance!
          </div>
        )}
        <div className="space-y-2">
          <p className="text-white/50 text-sm uppercase tracking-widest">Try {currentTry} of 3 — Your prompt is</p>
          <div className="card p-6">
            <h2 className="text-3xl font-black text-white leading-tight">{prompt}</h2>
          </div>
        </div>
        <p className="text-white/50 text-sm">You have 2 minutes to draw this. Ready?</p>
        <button onClick={() => setPhase("drawing")} className="btn-primary text-lg px-10 py-4">
          Start Drawing →
        </button>
      </div>
    );
  }

  if (phase === "drawing") {
    return (
      <DrawingCanvas
        prompt={session!.prompts[currentTry - 1]}
        tryNumber={currentTry}
        onComplete={handleDrawingComplete}
      />
    );
  }

  if (phase === "confirm") {
    const isLast = currentTry === 3;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-5">
        <h2 className="text-xl font-black text-white">How&apos;s your doodle?</h2>
        <div className="card p-3 w-full max-w-xs">
          <img src={currentImage!} alt="Your doodle" className="w-full rounded-xl" />
        </div>
        <p className="text-white/50 text-sm text-center">
          Prompt: <span className="text-white/80 font-semibold">{session!.prompts[currentTry - 1]}</span>
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          {!isLast && (
            <button onClick={handleRetry} className="btn-secondary flex-1">
              🔁 Retry
            </button>
          )}
          <button onClick={handleKeep} className="btn-primary flex-1">
            {isLast ? "Preview All →" : "Keep & Continue →"}
          </button>
        </div>
        {!isLast && (
          <p className="text-white/30 text-xs">{3 - currentTry} retries remaining</p>
        )}
      </div>
    );
  }

  if (phase === "preview") {
    return (
      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white">Pick Your Best</h2>
          <p className="text-white/50 text-sm">Select the doodle you want to submit to the gallery</p>
        </div>
        <div className="space-y-4">
          {attempts.map((a) => (
            <div key={a.tryNumber} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wide">Try {a.tryNumber}</span>
                <span className="text-xs text-white/60 font-medium">{a.prompt}</span>
              </div>
              <img src={a.imageData} alt={`Try ${a.tryNumber}`} className="w-full rounded-xl" />
              <button onClick={() => handleSubmit(a.tryNumber)} className="btn-primary w-full">
                Submit This Doodle 🚀
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🚀</div>
          <p className="text-white/60">Submitting your doodle...</p>
        </div>
      </div>
    );
  }

  return null;
}
