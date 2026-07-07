"use client";
import { useRef, useEffect, useState } from "react";

// Colours: 8 hues × 6 shades — shown in an expandable palette (no clutter).
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
const BRUSH_SIZES = [2, 4, 8, 16, 28]; // CSS px — includes a fine tip for intricate detail
const ERASER_SIZE = 24;
const MIN_ZOOM = 1, MAX_ZOOM = 4;
const SS = 2; // supersample factor — canvas backing store is SSx resolution so zoom stays sharp

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
  const zoomWrapRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const completedRef = useRef(false);

  const history = useRef<string[]>([]);
  const ptr = useRef(-1);

  const zoom = useRef(1);
  const pan = useRef({ x: 0, y: 0 });
  const pinch = useRef<{ active: boolean; initDist: number; lx: number; ly: number; initZoom: number }>({ active: false, initDist: 0, lx: 0, ly: 0, initZoom: 1 });
  const panDrag = useRef<{ active: boolean; sx: number; sy: number; px: number; py: number }>({ active: false, sx: 0, sy: 0, px: 0, py: 0 });

  const [color, setColor] = useState("#2b2b3a");
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isPan, setIsPan] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
  const [locked, setLocked] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);

  const onCompleteRef = useRef(onComplete);
  const onAutosaveRef = useRef(onAutosave);
  useEffect(() => { onCompleteRef.current = onComplete; onAutosaveRef.current = onAutosave; });

  function snapshot() { return canvasRef.current?.toDataURL("image/png") ?? ""; }
  function syncButtons() { setCanUndo(ptr.current > 0); setCanRedo(ptr.current < history.current.length - 1); }

  function pushHistory() {
    const snap = snapshot();
    history.current = history.current.slice(0, ptr.current + 1);
    history.current.push(snap);
    if (history.current.length > 25) history.current.shift();
    ptr.current = history.current.length - 1;
    syncButtons();
    onAutosaveRef.current(snap);
  }
  function restore(dataURL: string) {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!dataURL) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = dataURL;
  }
  function undo() { if (ptr.current <= 0) return; ptr.current--; restore(history.current[ptr.current]); syncButtons(); onAutosaveRef.current(history.current[ptr.current]); }
  function redo() { if (ptr.current >= history.current.length - 1) return; ptr.current++; restore(history.current[ptr.current]); syncButtons(); onAutosaveRef.current(history.current[ptr.current]); }

  function finish() {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current(snapshot());
  }

  // ---- zoom / pan ----
  function applyTransform() {
    const w = zoomWrapRef.current; if (!w) return;
    w.style.transformOrigin = "0 0";
    w.style.transform = `translate(${pan.current.x}px, ${pan.current.y}px) scale(${zoom.current})`;
    setZoomPct(Math.round(zoom.current * 100));
  }
  function clampPan() {
    const el = containerRef.current; if (!el) return;
    const z = zoom.current;
    pan.current.x = Math.min(0, Math.max(el.clientWidth * (1 - z), pan.current.x));
    pan.current.y = Math.min(0, Math.max(el.clientHeight * (1 - z), pan.current.y));
  }
  function zoomAt(newZ: number, cx: number, cy: number) {
    const z = zoom.current;
    newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZ));
    if (newZ === 1) { pan.current = { x: 0, y: 0 }; }
    else { pan.current.x = cx - (cx - pan.current.x) * (newZ / z); pan.current.y = cy - (cy - pan.current.y) * (newZ / z); }
    zoom.current = newZ;
    clampPan();
    applyTransform();
  }
  function zoomBy(f: number) { const el = containerRef.current; if (!el) return; zoomAt(zoom.current * f, el.clientWidth / 2, el.clientHeight / 2); }
  function resetZoom() { zoom.current = 1; pan.current = { x: 0, y: 0 }; applyTransform(); }

  // timer
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

  // setup + restore + seed history (transparent canvas — dot grid shows through from behind)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const ctx = canvas.getContext("2d")!;
    function fit(preserve: boolean) {
      const prev = preserve && canvas.width ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
      canvas.width = Math.round(container.clientWidth * SS);
      canvas.height = Math.round(container.clientHeight * SS);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (prev) ctx.putImageData(prev, 0, 0);
    }
    fit(false);
    applyTransform();
    const seed = () => { history.current = [snapshot()]; ptr.current = 0; syncButtons(); };
    if (initialImage) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); seed(); };
      img.onerror = seed;
      img.src = initialImage;
    } else { seed(); }
    const onResize = () => { fit(true); clampPan(); applyTransform(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  function applyStroke(ctx: CanvasRenderingContext2D) {
    if (isEraser) { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "#000"; ctx.fillStyle = "#000"; }
    else { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = color; ctx.fillStyle = color; }
  }
  function startDraw(x: number, y: number, dot: boolean) {
    if (locked) return;
    isDrawing.current = true;
    lastPos.current = { x, y };
    if (dot) {
      const ctx = canvasRef.current!.getContext("2d")!;
      applyStroke(ctx);
      ctx.beginPath();
      ctx.arc(x, y, ((isEraser ? ERASER_SIZE : brushSize) * SS) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function draw(x: number, y: number) {
    if (!isDrawing.current || locked || !lastPos.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    applyStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.lineWidth = (isEraser ? ERASER_SIZE : brushSize) * SS;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
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
    const container = containerRef.current!;
    const crect = () => container.getBoundingClientRect();

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      if (isPan) { const p = pan.current; panDrag.current = { active: true, sx: e.clientX, sy: e.clientY, px: p.x, py: p.y }; }
      else { const p = getPos(e, canvas); startDraw(p.x, p.y, true); }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (panDrag.current.active) { pan.current.x = panDrag.current.px + (e.clientX - panDrag.current.sx); pan.current.y = panDrag.current.py + (e.clientY - panDrag.current.sy); clampPan(); applyTransform(); return; }
      const p = getPos(e, canvas); draw(p.x, p.y);
    };
    const onMouseUp = () => { if (panDrag.current.active) panDrag.current.active = false; else stopDraw(); };

    const onWheel = (e: WheelEvent) => { e.preventDefault(); const r = crect(); zoomAt(zoom.current * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX - r.left, e.clientY - r.top); };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length >= 2) {
        // Entering pinch — wipe any stray dot/stroke the first finger started so it doesn't stick.
        if (isDrawing.current) { isDrawing.current = false; lastPos.current = null; restore(history.current[ptr.current] ?? ""); }
        const r = crect();
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2 - r.left, midY = (t1.clientY + t2.clientY) / 2 - r.top;
        const z = zoom.current;
        pinch.current = { active: true, initDist: dist, lx: (midX - pan.current.x) / z, ly: (midY - pan.current.y) / z, initZoom: z };
      } else if (isPan) {
        const t = e.touches[0]; const p = pan.current;
        panDrag.current = { active: true, sx: t.clientX, sy: t.clientY, px: p.x, py: p.y };
      } else {
        const p = getPos(e.touches[0], canvas); startDraw(p.x, p.y, false); // no initial dot on touch (avoids pinch dots)
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (pinch.current.active && e.touches.length >= 2) {
        const r = crect();
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2 - r.left, midY = (t1.clientY + t2.clientY) / 2 - r.top;
        const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.current.initZoom * (dist / pinch.current.initDist)));
        zoom.current = newZ;
        if (newZ === 1) pan.current = { x: 0, y: 0 };
        else { pan.current.x = midX - pinch.current.lx * newZ; pan.current.y = midY - pinch.current.ly * newZ; }
        clampPan(); applyTransform();
      } else if (panDrag.current.active) {
        const t = e.touches[0];
        pan.current.x = panDrag.current.px + (t.clientX - panDrag.current.sx); pan.current.y = panDrag.current.py + (t.clientY - panDrag.current.sy);
        clampPan(); applyTransform();
      } else if (isDrawing.current) {
        const p = getPos(e.touches[0], canvas); draw(p.x, p.y);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current.active = false;
      if (panDrag.current.active && e.touches.length === 0) panDrag.current.active = false;
      if (isDrawing.current && e.touches.length === 0) stopDraw();
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [color, brushSize, isEraser, locked, isPan]);

  function clearCanvas() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    pushHistory();
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerColor = timeLeft <= 30 ? "text-crayon-red" : timeLeft <= 60 ? "text-crayon-orange" : "text-crayon-green";
  const canvasCursor = isPan ? (panDrag.current.active ? "grabbing" : "grab") : isEraser ? ERASER_CURSOR : "crosshair";
  const dotGrid = { backgroundColor: "#ffffff", backgroundImage: "radial-gradient(#2b2b3a26 1px, transparent 1px)", backgroundSize: "20px 20px" } as const;

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

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 p-3 min-w-0">
          <div ref={containerRef} className="relative w-full h-full rounded-2xl border-[3px] border-ink shadow-doodle overflow-hidden" style={{ cursor: canvasCursor, backgroundColor: "#fff" }}>
            {/* zoom/pan wrapper — grid + ink both transform together so the guide stays aligned */}
            <div ref={zoomWrapRef} className="absolute inset-0">
              <div className="absolute inset-0" style={dotGrid} />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: "none" }} />
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-0.5 bg-white border-[3px] border-ink rounded-xl shadow-doodle-sm px-1 py-0.5 z-10">
              <button onClick={() => zoomBy(0.83)} className="w-7 h-7 rounded-lg hover:bg-black/5 font-bold text-lg leading-none">−</button>
              <button onClick={resetZoom} title="Reset zoom" className="text-xs font-body font-bold w-11 text-center">{zoomPct}%</button>
              <button onClick={() => zoomBy(1.2)} className="w-7 h-7 rounded-lg hover:bg-black/5 font-bold text-lg leading-none">＋</button>
            </div>

            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-sm z-20">
                <div className="card px-6 py-4 text-center space-y-1 wobble-l">
                  <div className="text-5xl">⏰</div>
                  <p className="text-ink font-hand font-bold text-2xl">Time&apos;s up!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side toolbar */}
        <div className="w-16 shrink-0 bg-white border-l-[3px] border-ink flex flex-col items-center gap-2 py-3 overflow-y-auto relative">
          <ToolBtn active={!isEraser && !isPan} onClick={() => { setIsEraser(false); setIsPan(false); }} title="Pen">✏️</ToolBtn>
          <ToolBtn active={isEraser} onClick={() => { setIsEraser(true); setIsPan(false); setShowPalette(false); }} title="Eraser">🧽</ToolBtn>
          <ToolBtn active={isPan} onClick={() => { setIsPan((v) => !v); setShowPalette(false); }} title="Move / pan">✋</ToolBtn>

          <div className="w-8 border-t-2 border-ink/10 my-0.5" />

          <ToolBtn onClick={undo} disabled={!canUndo} title="Undo">↩</ToolBtn>
          <ToolBtn onClick={redo} disabled={!canRedo} title="Redo">↪</ToolBtn>
          <ToolBtn onClick={clearCanvas} title="Clear all">🗑️</ToolBtn>

          <div className="w-8 border-t-2 border-ink/10 my-0.5" />

          {/* Brush size */}
          <button onClick={() => { setShowSizes((s) => !s); setShowPalette(false); }} title="Brush size"
            className="w-11 h-11 rounded-xl border-[3px] border-ink bg-white flex items-center justify-center shadow-doodle-sm hover:-translate-y-0.5 transition-transform">
            <span className="rounded-full bg-ink block" style={{ width: Math.min(brushSize + 2, 18), height: Math.min(brushSize + 2, 18) }} />
          </button>
          {showSizes && (
            <div className="absolute right-16 top-1/2 -translate-y-1/2 mr-1 card p-2 flex flex-col gap-1 z-30">
              {BRUSH_SIZES.map((s) => (
                <button key={s} onClick={() => { setBrushSize(s); setIsEraser(false); setIsPan(false); setShowSizes(false); }}
                  className={`w-12 h-9 rounded-lg flex items-center justify-center border-2 border-ink ${brushSize === s && !isEraser ? "bg-crayon-yellow" : "bg-white"}`}>
                  <span className="rounded-full bg-ink block" style={{ width: s + 2, height: s + 2 }} />
                </button>
              ))}
            </div>
          )}

          {/* Colour palette (single button → shades, no clutter) */}
          <button onClick={() => { setShowPalette((s) => !s); setShowSizes(false); setIsEraser(false); setIsPan(false); }} title="Colours"
            className="w-11 h-11 rounded-xl border-[3px] border-ink flex items-center justify-center shadow-doodle-sm hover:-translate-y-0.5 transition-transform relative"
            style={{ backgroundColor: color }}>
            <span className="absolute -bottom-1 -right-1 text-[10px] bg-white border border-ink rounded-full w-4 h-4 flex items-center justify-center">🎨</span>
          </button>

          {showPalette && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowPalette(false)} />
              <div className="absolute right-16 top-2 mr-1 card p-3 z-30 w-[232px]">
                <p className="font-hand font-bold text-ink text-lg mb-2">Pick a colour</p>
                <div className="space-y-1.5">
                  {PALETTE.map((row) => (
                    <div key={row.name} className="flex gap-1.5">
                      {row.shades.map((c) => (
                        <button key={c} onClick={() => { setColor(c); setIsEraser(false); setIsPan(false); setShowPalette(false); }}
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
    <button onClick={onClick} disabled={disabled} title={title}
      className={`w-11 h-11 rounded-xl border-[3px] border-ink flex items-center justify-center text-xl shadow-doodle-sm transition-all
        hover:-translate-y-0.5 disabled:opacity-30 disabled:translate-y-0 ${active ? "bg-crayon-yellow" : "bg-white"}`}>
      {children}
    </button>
  );
}
