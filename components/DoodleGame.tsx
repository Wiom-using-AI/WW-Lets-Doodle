"use client";
import { useState, useEffect, useRef } from "react";
import DrawingCanvas from "./DrawingCanvas";

type Employee = { id: string; name: string; department: string };
type DoodleRow = { tryNumber: number; imageData: string; finalized: boolean; isSubmitted: boolean };
type SessionState = {
  id: string;
  prompts: string[];
  currentTry: number;
  stage: string;
  status: string;
  tryStartedAt: string | null;
  tryDurationMs: number;
  serverNow: string;
  doodles: DoodleRow[];
};
type Phase = "loading" | "reveal" | "drawing" | "confirm" | "preview" | "submitting" | "error";

// 1x1 transparent PNG — fallback when a try expires with nothing drawn.
const BLANK_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export default function DoodleGame({ onComplete }: { employee: Employee; onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState("");
  const clockOffset = useRef(0); // serverNow - clientNow, in ms
  const finalizingExpired = useRef(false);

  useEffect(() => { init(); }, []);

  // If the player reopens AFTER their timer already ran out while away, lock in the last
  // autosaved drawing immediately instead of mounting a live (and already-expired) canvas.
  useEffect(() => {
    if (phase === "drawing" && state?.tryStartedAt && !finalizingExpired.current) {
      if (deadlineMs() <= Date.now()) {
        finalizingExpired.current = true;
        handleDrawingComplete(currentImage() ?? BLANK_PNG);
      }
    }
    if (phase !== "drawing") finalizingExpired.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state]);

  function syncClock(serverNow: string) { clockOffset.current = Date.parse(serverNow) - Date.now(); }

  function applyState(s: SessionState, forcedPhase?: Phase) {
    setState(s);
    syncClock(s.serverNow);
    if (s.status === "completed" || s.stage === "done") { onComplete(); return; }
    setPhase(forcedPhase ?? (s.stage as Phase));
  }

  async function init() {
    const res = await fetch("/api/game/session", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to start game."); setPhase("error"); return; }
    applyState(data);
  }

  async function patch(action: string, imageData?: string) {
    const res = await fetch("/api/game/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, imageData }),
    });
    return res.ok ? res.json() : null;
  }

  const currentTry = state?.currentTry ?? 1;
  const prompt = state ? state.prompts[currentTry - 1] : "";
  const isLast = currentTry === 3;

  function deadlineMs(): number {
    if (!state?.tryStartedAt) return Date.now() + (state?.tryDurationMs ?? 120_000);
    return Date.parse(state.tryStartedAt) + state.tryDurationMs - clockOffset.current;
  }

  function currentImage(): string | null {
    return state?.doodles.find((d) => d.tryNumber === currentTry)?.imageData ?? null;
  }

  async function startDrawing() {
    const r = await patch("start");
    if (!r) return;
    syncClock(r.serverNow);
    setState((s) => (s ? { ...s, tryStartedAt: r.tryStartedAt, stage: "drawing", serverNow: r.serverNow } : s));
    setPhase("drawing");
  }

  function autosave(img: string) { patch("autosave", img); } // fire-and-forget

  async function handleDrawingComplete(img: string) {
    const s = await patch("finalize", img);
    if (s) applyState(s, "confirm");
  }

  async function handleRetry() {
    const s = await patch("retry");
    if (s) applyState(s, "reveal");
  }

  async function handleKeep() {
    const s = await patch("preview");
    if (s) applyState(s, "preview");
  }

  async function handleSubmit(tryNumber: number) {
    if (!state) return;
    setPhase("submitting");
    const attempt = state.doodles.find((d) => d.tryNumber === tryNumber);
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.id, tryNumber, imageData: attempt?.imageData }),
    });
    if (res.ok) onComplete();
    else { setError("Failed to submit. Please try again."); setPhase("preview"); }
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

  if (phase === "error") {
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
        <p className="text-white/50 text-sm">You have 2 minutes. The timer keeps running even if you leave — so start when ready!</p>
        <button onClick={startDrawing} className="btn-primary text-lg px-10 py-4">Start Drawing →</button>
      </div>
    );
  }

  if (phase === "drawing") {
    return (
      <DrawingCanvas
        key={currentTry}
        prompt={prompt}
        tryNumber={currentTry}
        deadlineMs={deadlineMs()}
        initialImage={currentImage()}
        onComplete={handleDrawingComplete}
        onAutosave={autosave}
      />
    );
  }

  if (phase === "confirm") {
    const img = currentImage();
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-5">
        <h2 className="text-xl font-black text-white">How&apos;s your doodle?</h2>
        {img && (
          <div className="card p-3 w-full max-w-xs">
            <img src={img} alt="Your doodle" className="w-full rounded-xl" />
          </div>
        )}
        <p className="text-white/50 text-sm text-center">
          Prompt: <span className="text-white/80 font-semibold">{prompt}</span>
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          {!isLast && <button onClick={handleRetry} className="btn-secondary flex-1">🔁 Try another</button>}
          <button onClick={handleKeep} className="btn-primary flex-1">{isLast ? "Preview All →" : "Keep & Pick →"}</button>
        </div>
        {!isLast && <p className="text-white/30 text-xs">{3 - currentTry} more prompt{3 - currentTry !== 1 ? "s" : ""} available</p>}
      </div>
    );
  }

  if (phase === "preview") {
    const attempts = (state?.doodles ?? []).filter((d) => d.finalized).sort((a, b) => a.tryNumber - b.tryNumber);
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
                <span className="text-xs text-white/60 font-medium">{state?.prompts[a.tryNumber - 1]}</span>
              </div>
              <img src={a.imageData} alt={`Try ${a.tryNumber}`} className="w-full rounded-xl" />
              <button onClick={() => handleSubmit(a.tryNumber)} className="btn-primary w-full">Submit This Doodle 🚀</button>
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
