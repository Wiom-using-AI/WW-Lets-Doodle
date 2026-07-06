"use client";
import { useRef, useEffect, useState } from "react";

const COLORS = ["#2b2b3a", "#ff5d5d", "#ff9f43", "#ffd23f", "#3ec96b", "#4d9de0", "#9b5de5", "#ff70a6", "#ffffff"];
const BRUSH_SIZES = [3, 6, 12, 20];
const PAPER = "#ffffff";

export default function DrawingCanvas({
  prompt, tryNumber, deadlineMs, initialImage, onComplete, onAutosave,
}: {
  prompt: string;
  tryNumber: number;
  deadlineMs: number;          // absolute deadline in CLIENT clock ms (derived from server start time)
  initialImage: string | null; // previously autosaved drawing for this try, if any
  onComplete: (imageData: string) => void;
  onAutosave: (imageData: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const completedRef = useRef(false);

  const [color, setColor] = useState("#2b2b3a");
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
  const [locked, setLocked] = useState(false);

  // Keep latest callbacks in refs to avoid stale closures inside intervals/listeners.
  const onCompleteRef = useRef(onComplete);
  const onAutosaveRef = useRef(onAutosave);
  useEffect(() => { onCompleteRef.current = onComplete; onAutosaveRef.current = onAutosave; });

  function snapshot() { return canvasRef.current?.toDataURL("image/png") ?? ""; }

  function finish() {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current(snapshot());
  }

  // Server-anchored countdown — deadline is fixed by the server, so closing/reopening
  // the tab (or switching device) never resets or extends the time.
  useEffect(() => {
    function tick() {
      const rem = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) { setLocked(true); finish(); }
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  // One-time canvas setup + restore any previously saved strokes for this try.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const ctx = canvas.getContext("2d")!;

    function fit(preserve: boolean) {
      const prev = preserve && canvas.width ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (prev) ctx.putImageData(prev, 0, 0);
    }
    fit(false);

    if (initialImage) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initialImage;
    }

    const onResize = () => fit(true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: periodically and whenever the tab is hidden / page is being closed.
  useEffect(() => {
    const id = setInterval(() => { if (!completedRef.current) onAutosaveRef.current(snapshot()); }, 8000);
    const onHide = () => { if (!completedRef.current && canvasRef.current) onAutosaveRef.current(snapshot()); };
    const onVis = () => { if (document.visibilityState === "hidden") onHide(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPos(e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  }

  function startDraw(x: number, y: number) {
    if (locked) return;
    isDrawing.current = true;
    lastPos.current = { x, y };
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(x, y, (isEraser ? 20 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? PAPER : color;
    ctx.fill();
  }

  function draw(x: number, y: number) {
    if (!isDrawing.current || locked || !lastPos.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = isEraser ? PAPER : color;
    ctx.lineWidth = isEraser ? 20 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = { x, y };
  }

  function stopDraw() { isDrawing.current = false; lastPos.current = null; }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const onMouseDown = (e: MouseEvent) => { e.preventDefault(); const p = getPos(e, canvas); startDraw(p.x, p.y); };
    const onMouseMove = (e: MouseEvent) => { e.preventDefault(); const p = getPos(e, canvas); draw(p.x, p.y); };
    const onMouseUp = () => stopDraw();
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); const p = getPos(e.touches[0], canvas); startDraw(p.x, p.y); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); const p = getPos(e.touches[0], canvas); draw(p.x, p.y); };
    const onTouchEnd = () => stopDraw();

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [color, brushSize, isEraser, locked]);

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function handleDone() { finish(); }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerColor = timeLeft <= 30 ? "text-crayon-red" : timeLeft <= 60 ? "text-crayon-orange" : "text-crayon-green";

  return (
    <div className="flex-1 flex flex-col h-full bg-paper">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b-[3px] border-ink">
        <div className="text-sm text-ink/60 font-body">
          Try {tryNumber} — <span className="text-ink font-bold">{prompt}</span>
        </div>
        <div className={`font-hand font-bold text-2xl ${timerColor}`}>
          ⏱ {mins}:{secs.toString().padStart(2, "0")}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white cursor-crosshair">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: "none" }} />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
            <div className="card px-6 py-4 text-center space-y-1 wobble-l">
              <div className="text-5xl">⏰</div>
              <p className="text-ink font-hand font-bold text-2xl">Time&apos;s up!</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t-[3px] border-ink px-3 py-2.5 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setIsEraser(false); }}
              className={`w-7 h-7 rounded-full border-[3px] border-ink transition-all ${!isEraser && color === c ? "scale-125 shadow-doodle-sm" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`px-3 py-1 rounded-xl text-sm font-body font-semibold border-2 border-ink transition-all ml-1 ${isEraser ? "bg-crayon-yellow text-ink shadow-doodle-sm" : "bg-white text-ink/70"}`}
          >
            Eraser
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {BRUSH_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setBrushSize(s)}
                className={`rounded-full bg-ink border-2 border-ink transition-all ${brushSize === s && !isEraser ? "opacity-100 scale-110" : "opacity-30"}`}
                style={{ width: s + 6, height: s + 6 }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={clearCanvas} className="btn-secondary text-sm px-3 py-1.5">Clear</button>
            <button onClick={handleDone} disabled={locked} className="btn-primary text-sm px-4 py-1.5">Done ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}
