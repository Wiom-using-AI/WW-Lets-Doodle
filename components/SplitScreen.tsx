"use client";
import { useRef, useState } from "react";
import PlaygroundPanel from "./PlaygroundPanel";
import GalleryPanel from "./GalleryPanel";

type Employee = { id: string; name: string; department: string; email: string };

export default function SplitScreen({ employee }: { employee: Employee }) {
  // Mobile shows one panel at a time (tabs + swipe); desktop shows both side-by-side.
  const [view, setView] = useState<"play" | "gallery">("play");

  // Horizontal swipe to slide between Playground and Gallery (mobile only).
  const touch = useRef<{ x: number; y: number; onCanvas: boolean } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    // Ignore swipes that start on the drawing canvas so they don't fight drawing.
    const onCanvas = !!(e.target as HTMLElement)?.closest?.("canvas");
    touch.current = { x: t.clientX, y: t.clientY, onCanvas };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || start.onCanvas) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return; // must be a clear horizontal swipe
    if (dx < 0) setView("gallery"); // swipe left → reveal gallery
    else setView("play"); // swipe right → back to playground
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar — Wiom logo left, title centred, user right */}
      <header className="relative flex items-center justify-between px-4 sm:px-6 py-3 border-b-[3px] border-ink bg-white">
        <div className="flex items-center shrink-0 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wiom-logo.png" alt="Wiom" className="h-6 sm:h-8 w-auto" />
        </div>

        <div className="absolute inset-x-0 flex justify-center pointer-events-none px-2">
          <span className="font-hand font-bold text-3xl sm:text-4xl text-crayon-purple leading-none whitespace-nowrap">
            Let&apos;s Doodle <span className="text-crayon-pink">It!</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <div className="text-right hidden md:block leading-tight">
            <div className="text-sm font-bold text-ink">{employee.name}</div>
            <div className="text-xs text-ink/50">{employee.department}</div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-crayon-yellow border-[3px] border-ink flex items-center justify-center font-hand font-bold text-base sm:text-lg text-ink shrink-0">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <a href="/api/auth/logout" title="Log out" className="text-ink/40 hover:text-crayon-red text-xs font-body underline shrink-0 hidden sm:inline">Log out</a>
        </div>
      </header>

      {/* Tab switcher (all sizes) — Playground and Gallery are separate full-screen views */}
      <div className="flex border-b-[3px] border-ink bg-white">
        <button
          onClick={() => setView("play")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${view !== "gallery" ? "text-crayon-purple border-b-4 border-crayon-purple" : "text-ink/40"}`}
        >
          🖌 Playground
        </button>
        <button
          onClick={() => setView("gallery")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${view === "gallery" ? "text-crayon-pink border-b-4 border-crayon-pink" : "text-ink/40"}`}
        >
          🖼 Gallery
        </button>
      </div>

      {/* Sliding track — one full-screen view at a time (swipe or tabs), same on all sizes */}
      <div className="flex-1 overflow-hidden">
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={`flex h-full w-[200%] transition-transform duration-300 ease-out ${view === "gallery" ? "-translate-x-1/2" : "translate-x-0"}`}
        >
          <div className="w-1/2 flex flex-col min-h-0">
            <PlaygroundPanel employee={employee} />
          </div>
          <div className="w-1/2 flex flex-col min-h-0">
            <GalleryPanel employeeId={employee.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
