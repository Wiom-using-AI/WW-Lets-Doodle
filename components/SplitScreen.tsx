"use client";
import { useState } from "react";
import PlaygroundPanel from "./PlaygroundPanel";
import GalleryPanel from "./GalleryPanel";

type Employee = { id: string; name: string; department: string; email: string };

export default function SplitScreen({ employee }: { employee: Employee }) {
  // Default to the playground on mobile (one panel at a time via the tab switcher);
  // on desktop both panels always show side-by-side via md:flex.
  const [view, setView] = useState<"split" | "play" | "gallery">("play");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b-[3px] border-ink bg-white">
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl wobble-l">🎨</span>
          <span className="font-hand font-bold text-2xl sm:text-3xl text-crayon-purple leading-none">
            Let&apos;s Doodle <span className="text-crayon-pink">It!</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block leading-tight">
            <div className="text-sm font-bold text-ink">{employee.name}</div>
            <div className="text-xs text-ink/50">{employee.department}</div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-crayon-yellow border-[3px] border-ink flex items-center justify-center font-hand font-bold text-base sm:text-lg text-ink shrink-0">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <a href="/api/auth/logout" title="Log out" className="text-ink/40 hover:text-crayon-red text-xs font-body underline shrink-0">Log out</a>
        </div>
      </header>

      {/* Mobile tab switcher */}
      <div className="flex md:hidden border-b-[3px] border-ink bg-white">
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

      {/* Split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Playground */}
        <div className={`${view === "gallery" ? "hidden" : "flex"} md:flex flex-col md:w-1/2 w-full md:border-r-[3px] border-ink`}>
          <PlaygroundPanel employee={employee} />
        </div>
        {/* Gallery */}
        <div className={`${view !== "gallery" && view !== "split" ? "hidden" : "flex"} md:flex flex-col md:w-1/2 w-full bg-white/40`}>
          <GalleryPanel employeeId={employee.id} />
        </div>
      </div>
    </div>
  );
}
