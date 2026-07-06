"use client";
import { useRef, useEffect, useState } from "react";

const PAPER = "#ffffff";

// Main colors, each with light→dark shades (expand palette shows all).
const PALETTE: { name: string; shades: string[] }[] = [
  { name: "ink", shades: ["#ffffff", "#d1d5db", "#9ca3af", "#6b7280", "#2b2b3a", "#000000"] },
  { name: "red", shades: ["#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#991b1b"] },
  { name: "orange", shades: ["#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#9a3412"] },
  { name: "yellow", shades: ["#fef9c3", "#fef08a", "#fde047", "#facc15", "#eab308", "#a16207"] },
  { name: "green", shades: ["#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d"] },
  { name: "blue", shades: ["#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1e40af"] },
  { name: "purple", shades: ["#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#9333ea", "#6b21a8"] },
  { name: "pink", shades: ["#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899", "#db2777", "#9d174e"] },
];
// Quick colors always shown in the toolbar (one strong shade per hue).
const QUICK = ["#2b2b3a", "#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
const BRUSH_SIZES = [3, 6, 12, 22];
const ERASER_SIZE = 26;

const ERASER_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Ccircle cx='15' cy='15' r='12' fill='rgba(255,255,255,0.55)' stroke='%232b2b3a' stroke-width='2'/%3E%3C/svg%3E\") 15 15, auto";

export default function DrawingCanvas({
  prompt, tryNumber, deadlineMs, initialImage, onComplete, onAutosave,
}: {
  prompt: string;
  tryNumber: number;
  deadlineMs: number;
  initialImage: string | null;
  onComplete: (imageData: string) => void;
  onAutosave: (imageData: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const completedRef = useRef(false);

  // undo/redo history of dataURL snapshots
  const history = useRef<string[]>([]);
  const ptr = useRef(-1);

  const [color, setColor] = useState("#2b2b3a");
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
  const [locked, setLocked] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const onCompleteRef = useRef(onComplete);
  const onAutosaveRef = useRef(onAutosave);
  useEffect(() => { onCompleteRef.current = onComplete; onAutosaveRef.current = onAutosave; });

  function snapshot() { return canvasRef.current?.toDataURL("image/png") ?? ""; }
  function syncButtons() { setCanUndo(ptr.current > 0); setCanRedo(ptr.current < history.current.length - 1); }

  function pushHistory() {
    const snap = snapshot();
    history.current = history.current.slice(0, ptr.current + 1);
    history.current.push(snap);
    if (history.current.length > 40) history.current.shift();
    ptr.current = history.current.length - 1;
    syncButtons();
    onAutosaveRef.current(snap);
  }

  function restore(dataURL: string) {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!dataURL) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = dataURL;
  }

  function undo() {
    if (ptr.current <= 0) return;
    ptr.current--;
    restore(history.current[ptr.current]);
    syncButtons();
    onAutosaveRef.current(history.current[ptr.current]);
  }
  function redo() {
    if (ptr.current >= history.current.length - 1) return;
    ptr.current++;
    restore(history.current[ptr.current]);
    syncButtons();
    onAutosaveRef.current(history.current[ptr.current]);
  }

  function finish() {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current(snapshot());
  }

  // server-anchored timer
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

  // one-time setup + restore prior drawing + seed history
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
    const seed = () => { history.current = [snapshot()]; ptr.current = 0; syncButtons(); };
    if (initialImage) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); seed(); };
      img.onerror = seed;
      img.src = initialImage;
    } else {
      seed();
    }
    const onResize = () => fit(true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autosave on tab hide / close
  useEffect(() => {
    const onHide = () => { if (!completedRef.current && canvasRef.current) onAutosaveRef.current(snapshot()); };
    const onVis = () => { if (document.visibilityState === "hidden") onHide(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", onHide); };
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
    ctx.arc(x, y, (isEraser ? ERASER_SIZE : brushSize) / 2, 0, Math.PI * 2);
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
    ctx.lineWidth = isEraser ? ERASER_SIZE : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = { x, y };
  }
  function stopDraw() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    pushHistory();
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const onMouseDown = (e: MouseEvent) => { e.preventDefault(); const p = getPos(e, canvas); startDraw(p.x, p.y); };
    const onMouseMove = (e: MouseEvent) => { e.preventDefault(); const p = getPos(e, canvas); draw(p.x, p.y); };
    const onUp = () => stopDraw();
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); const p = getPos(e.touches[0], canvas); startDraw(p.x, p.y); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); const p = getPos(e.touches[0], canvas); draw(p.x, p.y); };
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onUp);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, [color, brushSize, isEraser, locked]);

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pushHistory();
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerColor = timeLeft <= 30 ? "text-crayon-red" : timeLeft <= 60 ? "text-crayon-orange" : "text-crayon-green";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e9e7df]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b-[3px] border-ink gap-2">
        <div className="min-w-0">
          <div className="font-hand font-bold text-xl text-crayon-purple leading-none">Let&apos;s Doodle It! ✏️</div>
          <div className="text-xs text-ink/60 font-body truncate">Try {tryNumber} — <span className="text-ink font-semibold">{prompt}</span></div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`font-hand font-bold text-2xl ${timerColor}`}>⏱ {mins}:{secs.toString().padStart(2, "0")}</div>
          <button onClick={finish} disabled={locked} className="btn-primary text-sm px-4 py-1.5">Done ✓</button>
        </div>
      </div>

      {/* Body: whiteboard sheet + side toolbar */}
      <div className="flex-1 flex min-h-0">
        {/* Sheet */}
        <div className="flex-1 p-3 min-w-0">
          <div
            ref={containerRef}
            className="relative w-full h-full bg-white rounded-2xl border-[3px] border-ink shadow-doodle overflow-hidden"
            style={{ cursor: isEraser ? ERASER_CURSOR : "crosshair" }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: "none" }} />
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                <div className="card px-6 py-4 text-center space-y-1 wobble-l">
                  <div className="text-5xl">⏰</div>
                  <p className="text-ink font-hand font-bold text-2xl">Time&apos;s up!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side toolbar */}
        <div className="w-16 shrink-0 bg-white border-l-[3px] border-ink flex flex-col items-center gap-2 py-3 relative">
          <ToolBtn active={!isEraser} onClick={() => { setIsEraser(false); }} title="Pen">✏️</ToolBtn>
          <ToolBtn active={isEraser} onClick={() => { setIsEraser(true); setShowPalette(false); }} title="Eraser">🧽</ToolBtn>

          <div className="w-8 border-t-2 border-ink/10 my-0.5" />

          <ToolBtn onClick={undo} disabled={!canUndo} title="Undo">↩</ToolBtn>
          <ToolBtn onClick={redo} disabled={!canRedo} title="Redo">↪</ToolBtn>
          <ToolBtn onClick={clearCanvas} title="Clear all">🗑️</ToolBtn>

          <div className="w-8 border-t-2 border-ink/10 my-0.5" />

          {/* Brush size */}
          <button onClick={() => { setShowSizes((s) => !s); setShowPalette(false); }} title="Brush size"
            className="w-11 h-11 rounded-xl border-[3px] border-ink bg-white flex items-center justify-center shadow-doodle-sm hover:-translate-y-0.5 transition-transform">
            <span className="rounded-full bg-ink block" style={{ width: Math.min(brushSize, 18), height: Math.min(brushSize, 18) }} />
          </button>
          {showSizes && (
            <div className="absolute right-16 top-1/2 -translate-y-1/2 mr-1 card p-2 flex flex-col gap-1 z-30">
              {BRUSH_SIZES.map((s) => (
                <button key={s} onClick={() => { setBrushSize(s); setIsEraser(false); setShowSizes(false); }}
                  className={`w-11 h-9 rounded-lg flex items-center justify-center border-2 border-ink ${brushSize === s && !isEraser ? "bg-crayon-yellow" : "bg-white"}`}>
                  <span className="rounded-full bg-ink block" style={{ width: s, height: s }} />
                </button>
              ))}
            </div>
          )}

          {/* Current color + expand */}
          <button onClick={() => { setShowPalette((s) => !s); setShowSizes(false); }} title="Colours"
            className="w-11 h-11 rounded-xl border-[3px] border-ink flex items-center justify-center shadow-doodle-sm hover:-translate-y-0.5 transition-transform relative"
            style={{ backgroundColor: color }}>
            <span className="absolute -bottom-1 -right-1 text-[10px] bg-white border border-ink rounded-full w-4 h-4 flex items-center justify-center">＋</span>
          </button>

          {/* Quick colors */}
          <div className="grid grid-cols-2 gap-1 mt-1">
            {QUICK.map((c) => (
              <button key={c} onClick={() => { setColor(c); setIsEraser(false); }}
                className={`w-5 h-5 rounded-full border-2 border-ink ${!isEraser && color === c ? "ring-2 ring-crayon-purple ring-offset-1" : ""}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>

          {/* Expanded palette with shades */}
          {showPalette && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowPalette(false)} />
              <div className="absolute right-16 top-2 mr-1 card p-3 z-30 w-[232px]">
                <p className="font-hand font-bold text-ink text-lg mb-2">Pick a colour</p>
                <div className="space-y-1.5">
                  {PALETTE.map((row) => (
                    <div key={row.name} className="flex gap-1.5">
                      {row.shades.map((c) => (
                        <button key={c} onClick={() => { setColor(c); setIsEraser(false); setShowPalette(false); }}
                          className={`w-7 h-7 rounded-lg border-2 border-ink transition-transform hover:scale-110 ${color === c ? "ring-2 ring-crayon-purple ring-offset-1" : ""}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, active, disabled, title }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean; title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-11 h-11 rounded-xl border-[3px] border-ink flex items-center justify-center text-xl shadow-doodle-sm transition-all
        hover:-translate-y-0.5 disabled:opacity-30 disabled:translate-y-0
        ${active ? "bg-crayon-yellow" : "bg-white"}`}
    >
      {children}
    </button>
  );
}
